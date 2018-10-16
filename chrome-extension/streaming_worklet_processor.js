// Copyright 2018 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a the GPL license that can be
// found in the LICENSE file.

/**
 * StreamingWorkletProcessor, the AudioWorkletProcessor for the eSpeak
 * text-to-speech extension.
 *
 * An AudioWorkletProcessor runs in the audio thread, it can only communicate
 * with the rest of the extension via message-passing.
 *
 * The design is very simple: It listens for just two commands from the
 * corresponding AudioWorkletNode's message port: 'addBuffer' gets a single
 * buffer of mono float32 audio samples, in exactly the length expected
 * by AudioWorkletProcessor.process, and adds it to a queue. 'clearBuffers'
 * clears the queue. Then, every time |process| is called, it just shifts
 * the front of the queue and outputs it.
 */
class StreamingWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.port.onmessage = this.onEvent.bind(this);
    this.buffers_ = [];
    this.active_ = false;
    this.first_ = true;
  }

  process(inputs, outputs) {
    if (!this.active_) {
      return true;
    }

    if (this.buffers_.length == 0) {
      this.active_ = false;
      this.port.postMessage({'type': 'empty'});
      return true;
    }

    let buffer = this.buffers_.shift();
    let output = outputs[0];
    if (this.first_) {
      this.first_ = false;
    }
    for (let channel = 0; channel < output.length; ++channel) {
      if (output[channel].length != buffer.length) {
        console.error('Buffer is ' + buffer.length + ' and output channel is =' + output[channel].lengh);
      }
      output[channel].set(buffer);
    }

    return true;
  }

  onEvent(event) {
    switch (event.data.command) {
      case 'addBuffer':
        this.active_ = true;
        this.buffers_.push(event.data.buffer);
        break;
      case 'clearBuffers':
        this.buffers_.length = 0;
        break;
    }
  }
}

registerProcessor('streaming-worklet-processor', StreamingWorkletProcessor);
