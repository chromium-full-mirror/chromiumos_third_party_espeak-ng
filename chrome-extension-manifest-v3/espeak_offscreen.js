// Copyright 2025 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a the GPL license that can be
// found in the LICENSE file.

// Store the WASM worker as a global variable in this service worker. This will
// be used to communicate with the C++ side to synthesize speech.
let tts_ = null;

/**
 * Performs an RPC in espeak_tts_engine.js which dispatches a request to update
 * the voices available in the chrome.ttsEngine API.
 */
function updateVoicesInEngine() {
  // This will call this.finishInitialization_() when done, which will
  // initialize the audio worklet.
  chrome.runtime.sendMessage({type: 'wasm-worker-initialized'});
}

/**
 * Creates the eSpeakTTS WASM Worker.
 *
 * @return {boolean} Returns a boolean based on whether the WASM Worker was
 *     created successfully.
 */
function createWasmWorker() {
  try {
    tts_ = new eSpeakNG('js/espeakng_worker.js', updateVoicesInEngine);
    return true;
  } catch (e) {
    console.error('create-wasm-worker-failure: ', e);
    return false;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request == null || request.type == null) {
    console.error('Malformed request: ', request, 'from: ', sender);
    return;
  }

  // If the request is a creation request, honor that first.
  if (request.type === 'create-wasm-worker') {
    sendResponse({
      type: `create-wasm-worker-${createWasmWorker() ? 'success' : 'failure'}`
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
    case 'list_voices':
      (async () => {
        const langInfoArray = await new Promise(resolve =>
          tts_.list_voices(resolve)
        );
        sendResponse(langInfoArray);
      })();

      // Return to indicate that the response is being sent asynchronously.
      return true;
    case 'set_voice':
      (async () => {
        await tts_.set_voice(request.voiceName);
      })();
      return;
    case 'set_system_sample_rate':
      (async () => {
        await tts_.set_systemSampleRate(request.sampleRate);
      })();
      return;
    case 'set_rate':
      (async () => {
        await tts_.set_rate(request.rate);
      })();
      return;
    case 'set_pitch':
      (async () => {
        await tts_.set_pitch(request.pitch);
      })();
      return;
    default:
      console.error(`Unknown type: ${request.type}`);
      break;
  }
});
