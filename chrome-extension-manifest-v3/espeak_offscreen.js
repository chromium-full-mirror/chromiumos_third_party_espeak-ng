// Copyright 2025 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a the GPL license that can be
// found in the LICENSE file.

// Store the WASM worker as a global variable in this service worker. This will
// be used to communicate with the C++ side to synthesize speech.
let tts_ = null;

/**
 * Callback used to pass the generated audio buffer to the EspeakTTSEngine
 * instance in espeak_tts_engine.js.
 *
 * @param {number} utteranceId The id of the utterance that the audio buffer is
 *     for.
 * @param {ArrayBuffer?} samples The raw audio data in the form of a
 *     Float32Array.
 * @param {Array?} events Determines whether the associated samples are a
 *     sentence, a word, or the end of the utterance. Passed to EspeakTTSEngine.
 */
async function handleEvents(utteranceId, samples, events) {
  // `samples` is an ArrayBuffer, and `sendMessage` requires the message to be
  // JSON serializable. Therefore, samples needs to be wrapped in the view that
  // the receiver expects it to be in (a.k.a `Float32Array`).
  //
  // Pass the sample and events back to the espeak_tts_engine.js to play the
  // audio via the chrome.ttsEngine.* API.
  const jsonSamples = Array.apply(null, new Float32Array(samples));
  await chrome.runtime.sendMessage({
    type: HANDLE_EVENTS_MSG,
    utteranceId,
    samples: jsonSamples,
    events: structuredClone(events)
  });
}

/**
 * Performs an RPC in espeak_tts_engine.js which dispatches a request to update
 * the voices available in the chrome.ttsEngine API.
 */
function updateVoicesInEngine() {
  // This will call this.finishInitialization_() when done, which will
  // initialize the audio worklet.
  chrome.runtime.sendMessage({type: UPDATE_VOICES_MSG});
}

/**
 * Creates the eSpeakTTS WASM Worker.
 *
 * @return {boolean} Returns a boolean based on whether the WASM Worker was
 *     created successfully.
 */
function createWasmWorker() {
  try {
    if (tts_) {
      // Update the voices if a wasm worker already exists, and return.
      updateVoicesInEngine();
      return true;
    }

    tts_ = new eSpeakNG('js/espeakng_worker.js', updateVoicesInEngine);
    return true;
  } catch (e) {
    console.error(`${CREATE_WASM_WORKER_FAILURE_MSG}: `, e);
    return false;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request == null || request.type == null) {
    console.error('Malformed request: ', request, 'from: ', sender);
    return;
  }

  // If the request is a creation request, honor that first.
  if (request.type === CREATE_WASM_WORKER_MSG) {
    sendResponse({
      type: createWasmWorker() ? CREATE_WASM_WORKER_SUCCESS_MSG :
                                 CREATE_WASM_WORKER_FAILURE_MSG,
    });
    return;
  }

  // The rest of the requests are for the WASM worker, so a valid one should be
  // present before trying to call them.
  if (tts_ == null) {
    console.error(
        'No WASM worker initialized, so the request cannot be completed.');
    return;
  }

  switch (request.type) {
    case LIST_VOICES_MSG:
      (async () => {
        const langInfoArray = await new Promise(resolve =>
          tts_.list_voices(resolve)
        );
        sendResponse(langInfoArray);
      })();

      // Return to indicate that the response is being sent asynchronously.
      return true;
    case SET_VOICE_MSG:
      (async () => {
        await tts_.set_voice(request.voiceName);
      })();
      return;
    case SET_SYSTEM_SAMPLE_RATE_MSG:
      (async () => {
        await tts_.set_systemSampleRate(request.sampleRate);
      })();
      return;
    case SET_RATE_MSG:
      (async () => {
        await tts_.set_rate(request.rate);
      })();
      return;
    case SET_PITCH_MSG:
      (async () => {
        await tts_.set_pitch(request.pitch);
      })();
      return;
    case SYNTHESIZE_MSG:
      (async () => {
        await tts_.synthesize(request.utterance, async (samples, events) => {
          await handleEvents(request.utteranceId, samples, events);
        });
      })();
      return;
    default:
      break;
  }
});
