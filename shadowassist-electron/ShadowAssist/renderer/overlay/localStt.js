// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Local STT using Moonshine (Useful Sensors / Moonshine AI).
//
// Why Moonshine instead of Whisper-ONNX:
//   • Built-in VAD — only runs inference when it detects real speech.
//     Whisper always produces something, even on silence → hallucinations.
//   • 27 MB model (tiny), ~10x smaller than whisper-base.
//   • Accepts a live MediaStream directly — no chunking, no blob POST, no API key.
//   • English-only (the model doesn't support Hindi, but it also never invents text).
//
// Architecture:
//   startLocalStt(micStream, sysStream, callbacks)
//     → creates two Moonshine.Transcriber instances (one per stream)
//     → attachStream() must be called BEFORE start() — start() takes no stream arg
//     → each fires onTranscriptionCommitted(text) when speech is done
//
// No Web Worker needed — Moonshine runs its ONNX runtime internally.

import { Transcriber } from '@moonshine-ai/moonshine-js'

/** Moonshine tiny — 27 MB, English, very low hallucination rate. */
const MODEL = 'model/tiny'

let _micT = null
let _sysT = null

/**
 * Start on-device transcription for mic and/or system loopback streams.
 *
 * IMPORTANT: Moonshine's Transcriber.start() takes NO arguments.
 * The stream must be attached first via attachStream(), then start() is called.
 *
 * @param {MediaStream|null} micStream
 * @param {MediaStream|null} sysStream
 * @param {{ onMicText: (t:string)=>void, onSysText: (t:string)=>void }} callbacks
 */
export function startLocalStt(micStream, sysStream, { onMicText, onSysText } = {}) {
  stopLocalStt()

  if (micStream?.active && onMicText) {
    try {
      _micT = new Transcriber(MODEL, {
        onTranscriptionCommitted(text) {
          const t = String(text || '').trim()
          if (t) onMicText(t)
        },
        onError(err) {
          console.error('[localStt] mic transcriber error', err)
        },
      })
      // attachStream saves the stream so load() can wire it to the VAD node
      _micT.attachStream(micStream)
      _micT.start().catch((e) => console.error('[localStt] mic start error', e))
    } catch (e) {
      console.error('[localStt] mic transcriber init error', e)
      _micT = null
    }
  }

  if (sysStream?.active && onSysText) {
    try {
      _sysT = new Transcriber(MODEL, {
        onTranscriptionCommitted(text) {
          const t = String(text || '').trim()
          if (t) onSysText(t)
        },
        onError(err) {
          console.error('[localStt] sys transcriber error', err)
        },
      })
      _sysT.attachStream(sysStream)
      _sysT.start().catch((e) => console.error('[localStt] sys start error', e))
    } catch (e) {
      console.error('[localStt] sys transcriber init error', e)
      _sysT = null
    }
  }
}

/** Stop both transcribers and release resources. */
export function stopLocalStt() {
  try { _micT?.stop() } catch {}
  try { _sysT?.stop() } catch {}
  _micT = null
  _sysT = null
}

/** True if at least one transcriber is currently active. */
export function isLocalSttRunning() {
  return _micT != null || _sysT != null
}
