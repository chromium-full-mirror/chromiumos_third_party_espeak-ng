/*
 * Copyright (C) 2014-2017 Eitan Isaacson
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, see: <http://www.gnu.org/licenses/>.
 */

#include <stdio.h>
#include <stdlib.h>
#include <emscripten.h>
#include "speak_lib.h"
#include "libresample.h"

typedef int (JavaScriptCallbackType)(
    float* wav, int inSampleCount, espeak_EVENT *events);

static double gEspeakSampleRate = 0;
static double gSystemSampleRate = 0;
static double gFactor = 0;
static JavaScriptCallbackType* gJavaScriptCallback = 0;
static void* gResampleHandle = 0;

// From espeak-ng.h
extern "C"
{
extern int espeak_ng_GetSampleRate(void);
}

static int resampleCallback(short* wav,
                            int inSampleCount,
                            espeak_EVENT *events) {
  const int bufferSize = 32768;
  static float inBuffer[bufferSize];
  static float outBuffer[bufferSize];

  if (inSampleCount > bufferSize) {
    fprintf(stderr, "Error: got more samples than buffer size\n");
    return 0;
  }

  for (int i = 0; i < inSampleCount; i++) {
    inBuffer[i] = wav[i] / 32768.0;
  }

  int lastFlag = 0;

  espeak_EVENT* event = events;
  while (event->type != espeakEVENT_LIST_TERMINATED) {
    if (event->type == espeakEVENT_END)
      lastFlag = 1;
    event++;
  }

  int inBufferUsed = 0;
  int outSampleCount = resample_process(gResampleHandle,
                                        gFactor,
                                        inBuffer,
                                        inSampleCount,
                                        lastFlag,
                                        &inBufferUsed,
                                        outBuffer,
                                        bufferSize);

  gJavaScriptCallback(outBuffer, outSampleCount, events);
  return 0;
}

class eSpeakNGWorker {
public:
  eSpeakNGWorker() : rate(espeakRATE_NORMAL), pitch(50), current_voice(NULL) {
    if (!gEspeakSampleRate) {
      gEspeakSampleRate = espeak_Initialize(
          AUDIO_OUTPUT_SYNCHRONOUS, 100, NULL, espeakINITIALIZE_DONT_EXIT);
    }
    samplerate = gEspeakSampleRate;
    voices = espeak_ListVoices(NULL);
  }

  void synth_(const char* aText, void* aCallback) {
    if (gEspeakSampleRate < 8000 || gEspeakSampleRate > 96000) {
      fprintf(stderr, "Bad espeak sample rate: %.1f\n", gEspeakSampleRate);
      exit(0);
    }
    if (gSystemSampleRate < 8000 || gSystemSampleRate > 96000) {
      fprintf(stderr, "Bad system sample rate: %.1f\n", gSystemSampleRate);
      exit(0);
    }

    gFactor = gSystemSampleRate / gEspeakSampleRate;

    gJavaScriptCallback = reinterpret_cast<JavaScriptCallbackType*>(aCallback);
    gResampleHandle = resample_open(/* highQuality = */ 1,
                                    gFactor,
                                    gFactor);
    espeak_SetSynthCallback(
        reinterpret_cast<t_espeak_callback*>(resampleCallback));
    espeak_SetParameter(espeakPITCH, pitch, 0);
    espeak_SetParameter(espeakRATE, rate, 0);

    if (current_voice)
      espeak_SetVoiceByProperties(current_voice);
    else
      espeak_SetVoiceByName("default");

    espeak_Synth(aText, 0, 0, POS_CHARACTER, 0, 0, NULL, NULL);

    // Reset callback so other instances will work too.
    espeak_SetSynthCallback(NULL);

    resample_close(gResampleHandle);
  }

  int synth_ipa_(const char* aText, const char* virtualFileName) {

  /* phoneme_mode
    bit 1:   0=eSpeak's ascii phoneme names, 1= International Phonetic Alphabet (as UTF-8 characters).
    bit 7:   use (bits 8-23) as a tie within multi-letter phonemes names
    bits 8-23:  separator character, between phoneme names
  */

    espeak_SetSynthCallback(NULL);

    int phoneme_options               = (1 << 1); // Use IPA
    int use_custom_phoneme_separator  = (0 << 7);
    int phonemes_separator            = ' '; // Use a default value

    int phoneme_conf                  = phoneme_options | (phonemes_separator << 8);

    FILE* f_phonemes_out = fopen(virtualFileName,"wb");
    if(!f_phonemes_out)
      return -1;

    //espeak_ng_InitializeOutput(ENOUTPUT_MODE_SYNCHRONOUS, 0, NULL);
    espeak_SetPhonemeTrace(phoneme_conf, f_phonemes_out);
    espeak_Synth(aText, 0, 0, POS_CHARACTER, 0, 0, NULL, NULL);
    espeak_SetPhonemeTrace(0, NULL);
    fclose(f_phonemes_out);

    return 0;
  }

  long set_systemSampleRate(int rate) {
    gSystemSampleRate = rate;
    return 0;
  }

  long set_voice(
      const char* aName,
      const char* aLang=NULL,
      unsigned char aGender=0,
      unsigned char aAge=0,
      unsigned char aVariant = 0) {
    long result = 0;
    if (aLang || aGender || aAge || aVariant) {
      espeak_VOICE props = { 0 };
      props.name = aName;
      props.languages = aLang;
      props.gender = aGender;
      props.age = aAge;
      props.variant = aVariant;
      result = espeak_SetVoiceByProperties(&props);
    } else {
      result = espeak_SetVoiceByName(aName);
    }

    // This way we don't need to allocate the name/lang strings to the heap.
    // Instead, we store the actual global voice.
    current_voice = espeak_GetCurrentVoice();

    return result;
  }

  int getSizeOfEventStruct_() {
    return sizeof(espeak_EVENT);
  }

  const espeak_VOICE** voices;
  int samplerate;
  int rate;
  int pitch;

private:
  espeak_VOICE* current_voice;
};

#include <glue.cpp>
