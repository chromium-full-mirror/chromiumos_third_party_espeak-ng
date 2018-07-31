// Copyright 2018 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a the GPL license that can be
// found in the LICENSE file.

/**
 * @fileoverview eSpeak text-to-speech extension.
 */

'use strict';

/**
 * @constructor
 */
var EspeakTtsEngine = function() {
    this.callback_ = null;
    this.utterance_ = null;
    this.tts_ = null;
    this.bufferLen_ = 256;
    this.buffers_ = [];
    this.currentBuffer_ = null;
    this.currentBufferIndex_ = 0;
    this.context_ = new AudioContext();
    this.scriptNode_ = this.context_.createScriptProcessor(
        this.bufferLen_, 1, 1);
    this.gainNode_ = this.context_.createGain();
    this.scriptNode_.onaudioprocess = this.onAudioProcess.bind(this);
    this.gainNode_.connect(this.context_.destination);
    this.playing_ = false;
    this.ttsEngineApiVoices_ = [];
    this.internalVoiceInfos_ = [];
    this.defaultEspeakVoiceName_ = null;
    this.volume_ = 1.0;
    this.startTime_ = null;
    this.eventQueue_ = [];
    this.timeoutIds_ = [];
};

/**
 *
 */
EspeakTtsEngine.prototype.getLangInfoArray = function() {
    return this.langInfoArray_;
};

/**
 * Function called on startup.
 */
EspeakTtsEngine.prototype.init = function() {
    this.tts_ = new eSpeakNG('js/espeakng.worker.js', (function() {
        this.updateVoices();
    }).bind(this));

    chrome.ttsEngine.onSpeak.addListener(this.onSpeak.bind(this));
    chrome.ttsEngine.onStop.addListener(this.onStop.bind(this));
};

/**
 * Function called when the set of enabled voices has changed.
 */
EspeakTtsEngine.prototype.updateVoices = function() {
    console.log('updateVoices');
    this.tts_.list_voices((function (langInfoArray) {
        this.langInfoArray_ = langInfoArray;
        this.ttsEngineApiVoices_ = [];
        this.internalVoiceInfos_ = [];
        this.langsRemaining_ = this.langInfoArray_.length;
        this.langInfoArray_.forEach((function(langInfo) {
            isEspeakLanguageEnabled(langInfo, (function(enabled) {
                if (enabled) {
                    var voiceName = 'eSpeak ' + langInfo.name;
                    var ttsEngineApiVoice = {
                        voiceName: voiceName,
                        lang: langInfo.languages[0].name,
                        remote: false,
                        eventTypes: [
                            'start', 'end', 'word', 'sentence', 'error'
                        ]};
                    this.ttsEngineApiVoices_.push(ttsEngineApiVoice);

                    var internalVoiceInfo = {
                        voiceName: voiceName,
                        espeakVoiceName: langInfo.name,
                        languages: langInfo.languages
                    };
                    this.internalVoiceInfos_.push(internalVoiceInfo);
                }

                this.langsRemaining_--;
                if (this.langsRemaining_ == 0) {
                    this.finishUpdatingVoices_();
                }
            }).bind(this));
        }).bind(this));
    }).bind(this));
};

/**
 *
 */
EspeakTtsEngine.prototype.finishUpdatingVoices_ = function() {
    console.log('finishUpdatingVoices_');
    chrome.ttsEngine.updateVoices(this.ttsEngineApiVoices_);
    console.log('Loaded ' + this.ttsEngineApiVoices_.length +
                ' voices');

    this.defaultEspeakVoiceName_ = null;var defaultValue = isEspeakLanguageEnabledByDefault(langInfo);

    var key = langInfo.identifier;
    chrome.storage.local.get(key, (function(result) {
        var value = (result[key] !== undefined ? result[key] :
                     defaultValue);
        console.log(key, value);
        $(key).checked = value;
    }).bind(this));
    this.defaultEspeakVoiceName_ = this.getBestEspeakVoice(
        '', navigator.language);
    console.log('Default voice: ' + this.defaultEspeakVoiceName_);
};

/**
 * Called by the client to stop speech.
 */
EspeakTtsEngine.prototype.onStop = function() {
    this.playing_ = false;
    this.scriptNode_.disconnect();
    this.callback_ = null;
    this.eventQueue_ = [];
    this.timeoutIds_.forEach(function(timeoutId) {
        window.clearTimeout(timeoutId);
    });
};

/**
 * Called by the client to start speech synthesis.
 *
 * @param {string} utterance The utterance to say.
 * @param {object} options The options affecting the speech, like language,
 *     pitch, rate, etc.
 * @param {function(object)} callback The function to receive messages from the
 * engine.
 */
EspeakTtsEngine.prototype.onSpeak = function(utterance, options, callback) {
  console.log('Will speak: "' + utterance + '" lang="' + options.lang + '"');

  this.onStop();

  this.callback_ = callback;
    this.buffers_.length = 0;
    this.utterance_ = utterance;

    var espeakVoiceName = this.getBestEspeakVoice(
        options.voiceName, options.lang);
    this.tts_.set_voice(espeakVoiceName);

    // Chrome TTS rates range from 0.1 to 10.0, with 1.0 as the default.
    // eSpeak rates range from 80 to 450, with 175 as the default.
    var rate = Math.min(Math.max(Math.floor(options.rate * 175), 80), 450);
    this.tts_.set_rate(rate);

    // Chrome TTS pitches range from 0.0 to 2.0, with 1.0 as the default.
    // eSpeak pitches range from 0 to 99, with 50 as the default.
    var pitch = Math.min(Math.max(Math.floor(options.pitch * 50), 0), 99);
    this.tts_.set_pitch(pitch);

    var volume = Math.min(Math.max(options.volume, 0.0), 1.0);
    this.gainNode_.gain.value = volume;

  this.tts_.synthesize(
      utterance,
      (function(samples, events) {
          var isEnd = false;
          if (events) {
              events.forEach((function(event) {
                  switch (event.type) {
                  case 'samplerate':
                      // Incomplete?
                      break;
                  case 'sentence':
                  case 'word':
                      this.scheduleTimepointEvent(
                          event.audio_position,
                          event.text_position,
                          event.type);
                      break;
                  case 'end':
                      isEnd = true;
                      break;
                  }
                  // event.text_position;
                  // event.word_length;
                  // event.audio_position;
              }).bind(this));
          }
          var sampleArray = new Float32Array(samples);
          this.processSamples(sampleArray, isEnd);
      }).bind(this));
};

EspeakTtsEngine.prototype.getBestEspeakVoice = function(
        desiredVoiceName, desiredLang) {
    var exactMatchEspeakVoiceName = null;
    var langMatchEspeakVoiceName = null;
    var langMatch = '';
    this.internalVoiceInfos_.forEach((function(voice) {
        if (desiredVoiceName == voice.voiceName)
            exactMatchEspeakVoiceName = voice.espeakVoiceName;
        voice.languages.forEach((function(lang) {
            if (desiredLang.toLowerCase() == lang.name.toLowerCase() &&
                lang.name.length > langMatch.length) {
                langMatch = lang.name;
                langMatchEspeakVoiceName = voice.voiceName;
            }
        }).bind(this));
    }).bind(this));

    if (exactMatchEspeakVoiceName)
        return exactMatchEspeakVoiceName;

    if (langMatchEspeakVoiceName)
        return langMatchEspeakVoiceName;

    return this.defaultEspeakVoiceName_;
};

EspeakTtsEngine.prototype.processSamples = function(samples, isEnd) {
    if (!this.callback_) {
        console.error('Ignoring call to processSamples with no callback');
        return;
    }

    var i = 0;
    var len = samples.length;
    while (i < len) {
        var chunkLen = Math.min(this.bufferLen_ - this.currentBufferIndex_,
                                 len - i);
        if (!this.currentBuffer_)
            this.currentBuffer_ = new Float32Array(this.bufferLen_);
        this.currentBuffer_.set(samples.subarray(i, i + chunkLen));
        i += chunkLen;
        this.currentBufferIndex_ += chunkLen;
        if (this.currentBufferIndex_ == this.bufferLen_) {
            this.buffers_.push(this.currentBuffer_);
            this.currentBufferIndex_ = 0;
            this.currentBuffer_ = null;
        }
    }

    // Push final buffer, not complete.
    if (isEnd && this.currentBufferIndex_ > 0) {
        this.buffers_.push(this.currentBuffer_);
        this.currentBufferIndex_ = 0;
        this.currentBuffer_ = null;
    }

    if (this.buffers_.length && !this.playing_) {
        this.scriptNode_.connect(this.gainNode_);
        this.playing_ = true;
        this.callback_({
            'type': 'start',
            'charIndex': 0
        });
        this.startTime_ = new Date();
        this.scheduleQueuedTimepointEvents();
    }
};

EspeakTtsEngine.prototype.onAudioProcess = function(audioProcessingEvent) {
    if (!this.buffers_.length) {
        this.callback_({
            'type': 'end',
            'charIndex': this.utterance_.length
        });
        this.onStop();
        return;
    }

    var outputBuffer = audioProcessingEvent.outputBuffer;
    var outputData = outputBuffer.getChannelData(0);
    var buffer = this.buffers_.shift();
    outputData.set(buffer);
};

EspeakTtsEngine.prototype.scheduleTimepointEvent = function(
    audioPositionMillis,
    textPosition,
    eventType) {
    if (!this.playing_) {
        this.eventQueue_.push({'audioPositionMillis': audioPositionMillis,
                               'textPosition': textPosition,
                               'eventType': eventType});
        return;
    }

    var currentTimeMillis = (new Date()) - this.startTime_;
    var deltaTimeMillis = audioPositionMillis - currentTimeMillis;
    if (deltaTimeMillis < -100) {
        console.log('Skipping event ' + eventType + ' in the past');
        // Skip it if it's too much in the past.
        return;
    } else if (deltaTimeMillis < 2) {
        // It's basically now, fire it.
        this.callback_({
            'type': eventType,
            'charIndex': textPosition
        });
        return;
    }

    var timeoutId = window.setTimeout((function() {
        this.callback_({
            'type': eventType,
            'charIndex': textPosition
        });
    }).bind(this), deltaTimeMillis);
    this.timeoutIds_.push(timeoutId);
}

EspeakTtsEngine.prototype.scheduleQueuedTimepointEvents = function() {
    console.assert(this.playing_);
    var events = this.eventQueue_;
    this.eventQueue_ = [];
    events.forEach((function(event) {
        this.scheduleTimepointEvent(
            event.audioPositionMillis,
            event.textPosition,
            event.eventType);
    }).bind(this));
}


window.engine = new EspeakTtsEngine();
engine.init();
