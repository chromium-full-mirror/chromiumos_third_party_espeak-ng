const OFFSCREEN_DOCUMENT_PATH = 'espeak_offscreen.html';

// A list of valid messages to send and receive across process boundries.
const UPDATE_VOICES_MSG = 'update-voices';
const GET_LANG_INFO_ARRAY_MSG = 'get-lang-info-array';
const HANDLE_EVENTS_MSG = 'handle-events';
const CREATE_WASM_WORKER_MSG = 'create-wasm-worker';
const CREATE_WASM_WORKER_SUCCESS_MSG = 'create-wasm-worker-success';
const CREATE_WASM_WORKER_FAILURE_MSG = 'create-wasm-worker-failure';
const LIST_VOICES_MSG = 'list_voices';
const SET_VOICE_MSG = 'set_voice';
const SET_SYSTEM_SAMPLE_RATE_MSG = 'set_system_sample_rate';
const SET_RATE_MSG = 'set_rate';
const SET_PITCH_MSG = 'set_pitch';
const SYNTHESIZE_MSG = 'synthesize';
