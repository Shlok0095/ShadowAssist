// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Local STT using Moonshine (Useful Sensors / Moonshine AI).
//
// Why Moonshine instead of Whisper-ONNX:
//   • Built-in VAD — only runs inference when it detects real speech.
//     Whisper always produces something, even on silence → hallucinations.
//   • 68 MB model (base), better accent robustness than tiny.
//     model/base handles Indian English, retroflex consonants, different
//     prosody significantly better than tiny (LibriSpeech-only training).
//   • Accepts a live MediaStream directly — no chunking, no blob POST, no API key.
//   • English-only (no hallucinations, VAD only fires on real speech).
//
// Architecture (persistent + pre-warmed):
//
//   preloadLocalStt({ onReady, onProgress })
//     Call once at app startup — downloads model/base + Silero VAD WASM
//     in the background. By the time the user clicks "Start Listening" the
//     model is cached and the session starts instantly with zero dropped words.
//
//   startLocalStt(micStream, sysStream, { onMicText, onSysText })
//     Attaches streams to the already-loaded transcribers and resumes VAD.
//     The Transcriber.start() API takes NO stream argument:
//     attachStream(stream) must be called BEFORE start().
//
//   stopLocalStt()
//     Pauses VAD (keeps model weights in memory). Next startLocalStt is
//     near-instant — no re-download, no re-init.
//
//   isLocalSttRunning() → boolean
//
// Cross-Origin Isolation (packaged .exe):
//   ONNX Runtime WASM needs SharedArrayBuffer for multi-threaded inference.
//   The main process injects COOP + COEP headers (main/index.js) so
//   SharedArrayBuffer is available in all BrowserWindows, including
//   the packaged app loaded from file://.

import { Transcriber } from '@moonshine-ai/moonshine-js'

// model/base — 68 MB. Better accent coverage than tiny (27 MB) because the
// encoder has 3× more capacity to model diverse phoneme patterns.
const MODEL = 'model/base'

// ── Module-level singletons ────────────────────────────────────────────────
// Transcribers are NEVER destroyed once created. stopLocalStt() only pauses
// the VAD; the ONNX session and model weights stay in memory.
let _micT = null
let _sysT = null
let _preloadStarted = false

// Current session callbacks — reassigned on each startLocalStt() call.
// onTranscriptionCommitted reads these via closure: no transcriber rebuild needed.
let _onMicText = null
let _onSysText = null

// ── Factory helpers ────────────────────────────────────────────────────────

function makeMicTranscriber(onReady) {
  return new Transcriber(MODEL, {
    onModelLoadStarted() { console.info('[localStt] mic: downloading model/base…') },
    onModelLoaded()      { console.info('[localStt] mic: ready ✓'); onReady?.() },
    onTranscribeStarted()  { console.info('[localStt] mic: active') },
    onTranscribeStopped()  { console.info('[localStt] mic: paused') },
    onTranscriptionCommitted(text) {
      const t = String(text || '').trim()
      if (t) _onMicText?.(t)
    },
    onError(err) { console.error('[localStt] mic error:', err) },
  })
}

function makeSysTranscriber(onReady) {
  return new Transcriber(MODEL, {
    onModelLoadStarted() { console.info('[localStt] sys: downloading model/base…') },
    onModelLoaded()      { console.info('[localStt] sys: ready ✓'); onReady?.() },
    onTranscribeStarted()  { console.info('[localStt] sys: active') },
    onTranscribeStopped()  { console.info('[localStt] sys: paused') },
    onTranscriptionCommitted(text) {
      const t = String(text || '').trim()
      if (t) _onSysText?.(t)
    },
    onError(err) { console.error('[localStt] sys error:', err) },
  })
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Pre-warm Moonshine model + Silero VAD in the background at app startup.
 *
 * Call ONCE when the renderer mounts (e.g. in a useEffect with [] deps).
 * By the time the user clicks Start Listening, the ~68 MB model is already
 * downloaded and cached → transcription begins instantly with no dropped words.
 *
 * Both transcribers share the same static model weight cache inside Moonshine
 * (via Transcriber.models Map), so the download only happens once.
 *
 * @param {{ onReady?: ()=>void }} opts
 *   onReady — called once when BOTH mic and sys transcribers are loaded.
 */
export function preloadLocalStt({ onReady } = {}) {
  if (_preloadStarted) return
  _preloadStarted = true

  let readyCount = 0
  const onPathReady = () => {
    readyCount++
    if (readyCount >= 2) {
      console.info('[localStt] both transcribers ready — listening will start instantly')
      onReady?.()
    }
  }

  if (!_micT) {
    _micT = makeMicTranscriber(onPathReady)
    // start() with no stream: loads model weights + inits VAD, then auto-pauses.
    // attachStream() will be called with the real mic stream in startLocalStt().
    _micT.start().catch((e) => console.error('[localStt] mic preload error', e))
  }

  if (!_sysT) {
    // Shares static model weights with _micT — only ONE network download occurs.
    _sysT = makeSysTranscriber(onPathReady)
    _sysT.start().catch((e) => console.error('[localStt] sys preload error', e))
  }
}

/**
 * Start on-device transcription for mic and/or system loopback streams.
 *
 * If preloadLocalStt() was called at startup, this is near-instant (< 50 ms).
 * If NOT pre-warmed, first call may block for ~20–30 s while downloading.
 *
 * @param {MediaStream|null} micStream
 * @param {MediaStream|null} sysStream
 * @param {{ onMicText: (t:string)=>void, onSysText: (t:string)=>void }} callbacks
 */
export function startLocalStt(micStream, sysStream, { onMicText, onSysText } = {}) {
  // Update session callbacks (read dynamically by onTranscriptionCommitted).
  _onMicText = onMicText || null
  _onSysText = onSysText || null

  // ── Mic ───────────────────────────────────────────────────────────────────
  if (micStream?.active && onMicText) {
    if (!_micT) {
      // Not pre-warmed (cold path) — create on demand.
      _micT = makeMicTranscriber(() => console.info('[localStt] mic ready (cold)'))
    }
    // attachStream() wires the stream to the VAD audio graph.
    // Must be called before every start() with the current session stream.
    _micT.attachStream(micStream)
    // If already active (pre-warmed and not stopped), start() is a no-op.
    _micT.start().catch((e) => console.error('[localStt] mic start error', e))
  }

  // ── Sys (loopback) ────────────────────────────────────────────────────────
  if (sysStream?.active && onSysText) {
    if (!_sysT) {
      _sysT = makeSysTranscriber(() => console.info('[localStt] sys ready (cold)'))
    }
    _sysT.attachStream(sysStream)
    _sysT.start().catch((e) => console.error('[localStt] sys start error', e))
  }
}

/**
 * Pause both transcribers (VAD paused, model stays in memory).
 * Next startLocalStt() will resume in milliseconds.
 */
export function stopLocalStt() {
  _onMicText = null
  _onSysText = null
  // stop() only pauses VAD — does NOT unload model weights.
  try { if (_micT?.isActive) _micT.stop() } catch {}
  try { if (_sysT?.isActive) _sysT.stop() } catch {}
  // Do NOT null _micT / _sysT — keeping singletons alive avoids re-download.
}

/** True if at least one transcriber is currently active (VAD running). */
export function isLocalSttRunning() {
  return (_micT?.isActive === true) || (_sysT?.isActive === true)
}
