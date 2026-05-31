// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { flushSync } from 'react-dom'
import StatusBar from './components/StatusBar'
import ResponsePanel from './components/ResponsePanel'
import InputBar from './components/InputBar'
import { applyUiAccentTheme, normalizeUiAccentId } from '../shared/uiAccentThemes'
import { createIpcShim } from '../shared/ipcShim'
import {
  AGGREGATE_DROP_HARD_MIN,
  filterWhisperVerboseJson,
} from '../shared/whisperTranscriptGate'
import { captureScreenTextLocal, terminateLocalOcr, warmupLocalOcr } from './localOcr'
import { startLocalStt, stopLocalStt, preloadLocalStt } from './localStt'

const ipc = createIpcShim()
const COLLAPSED_H = 38
const MIN_ASK_GAP_MS = 2000
/** Longer chunks give Whisper more phonetic context (fewer mid-phrase cuts); ~4–5s helps quiet BT / loopback. */
const AUDIO_CHUNK_MS = 4600
/** Ms of silence after last STT chunk before speech Assist may fire. */
const SPEECH_STABILITY_MS = 1800
/** Clear rolling speech buffer after this long without a new chunk. */
const MAX_SPEECH_WINDOW_MS = 20000
/** Minimum buffered speech length before speech Assist may fire. */
const MIN_SPEECH_LENGTH = 20
/** Failsafe Assist poll interval when buffer stays large. */
const SPEECH_FAILSAFE_MS = 4000
/** Max rolling transcript chars sent to the LLM (tail window). */
const MAX_BUFFER_CHARS = 1200
/** Min ms between speech auto-triggers (dedupe). */
const SPEECH_TRIGGER_COOLDOWN_MS = 2500
/** Failsafe only if this long since last any speech/failsafe trigger. */
const FAILSAFE_MIN_GAP_AFTER_TRIGGER_MS = 3000
/** Chunks this close together stay on the same speaker. */
const CHUNK_SAME_SPEAKER_MAX_GAP_MS = 800
/** Silence beyond this → soft turn change (switch speaker). */
const CHUNK_TURN_SWITCH_SILENCE_MS = 2000
/** Defer speech trigger slightly so last STT chunk can land. */
const SPEECH_TRIGGER_LEAD_IN_MS = 150
/** Minimum OCR text length before a screen-driven Assist trigger is considered. */
const MIN_OCR_TRIGGER_CHARS = 40
/** Minimum ms between screen-based Assist triggers (spam cap). */
const SCREEN_ASSIST_COOLDOWN_MS = 4000
/** Minimum ms between any auto Assist trigger (speech or screen). */
const GLOBAL_TRIGGER_COOLDOWN_MS = 2000
/** Cap OCR bytes in structured prompt (full OCR still in ref; not content filtering). */
const MAX_SCREEN_CONTEXT_CHARS = 1000
/** Screen-read can reuse very fresh OCR to avoid extra wait. */
const FRESH_OCR_MAX_AGE_MS = 1200

const MAX_LIVE_SEGMENTS = 30

function trimBufferSmart(buffer) {
  const b = String(buffer || '')
  if (b.length <= MAX_BUFFER_CHARS) return b
  const cutIndex = b.indexOf('.', b.length - 1000)
  if (cutIndex !== -1) return b.slice(cutIndex + 1).replace(/^\s+/, '')
  return b.slice(-MAX_BUFFER_CHARS)
}

/** Stable speaker: question → participant; rapid chunks → same; long gap → turn switch; else unchanged. */
function assignChunkSpeaker(trimmedChunk, silenceBeforeMs, lastSpeakerRef) {
  if (/\?/.test(String(trimmedChunk || ''))) {
    lastSpeakerRef.current = 'other'
    return 'other'
  }
  const last = lastSpeakerRef.current
  if (silenceBeforeMs <= CHUNK_SAME_SPEAKER_MAX_GAP_MS) {
    return last
  }
  if (silenceBeforeMs > CHUNK_TURN_SWITCH_SILENCE_MS) {
    const switched = last === 'me' ? 'other' : 'me'
    lastSpeakerRef.current = switched
    return switched
  }
  return last
}

function isDirectAnswerQuery(text) {
  return /\bnumber\b|\blist\b|only answer|just answer/i.test(String(text || ''))
}

/**
 * Build the LLM user-turn prompt.
 * mode='audio'  → transcribing mode (speech trigger): full transcript, screen is supporting.
 * mode='screen' → non-transcribing mode (Ctrl+Enter / screen trigger): screen only, NO stale audio.
 * mode='typed'  → user typed a question: typed question + both contexts as support.
 */
function buildStructuredUserPrompt({ rawSpeech, micFallback, screenText, typedQuestion, mode = 'audio' }) {
  const audioCtx = String(rawSpeech || '').trim() || String(micFallback || '').trim() || ''
  const screenCtx = String(screenText || '').trim() || ''
  const typedQ = typedQuestion ? String(typedQuestion).trim() : ''

  const hasScreen = !!screenCtx
  const hasTyped = !!typedQ

  if (mode === 'screen') {
    // Non-transcribing mode: screen is everything — do NOT inject stale audio as "question"
    if (!hasScreen && !hasTyped) {
      return 'The screen could not be read clearly. Please describe what you need help with.'
    }
    return [
      hasScreen ? `## SCREEN\n${screenCtx}` : null,
      hasTyped ? `## QUESTION\n${typedQ}` : null,
    ]
      .filter(Boolean)
      .join('\n\n')
  }

  if (mode === 'typed') {
    // User explicitly typed a question — typed text is primary
    return [
      hasTyped ? `## QUESTION\n${typedQ}` : null,
      audioCtx ? `## TRANSCRIPT (background context)\n${audioCtx}` : null,
      hasScreen ? `## SCREEN (supporting context)\n${screenCtx}` : null,
    ]
      .filter(Boolean)
      .join('\n\n')
  }

  // Audio / transcribing mode — respond to last question in transcript
  const hasAudio = !!audioCtx
  if (!hasAudio && !hasScreen && !hasTyped) {
    return 'No context available.'
  }
  return [
    hasAudio ? `## TRANSCRIPT (respond to last question only)\n${audioCtx}` : null,
    hasScreen ? `## SCREEN (use only if relevant to last question)\n${screenCtx}` : null,
    hasTyped ? `## QUESTION\n${typedQ}` : null,
  ]
    .filter(Boolean)
    .join('\n\n')
}

/** OCR dedupe only: same snapshot / near-duplicate → skip trigger (not content “usefulness”). */
function normalizeOcrDedupe(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
}

/**
 * Returns true only if the OCR text looks like real readable content.
 * Three-stage filter:
 *  1. Reject Windows terminal encoding artifacts (ΓÇö ┬⌐ ┬╗ etc.) — these appear when
 *     the OCR captures a developer terminal running the app itself.
 *  2. Require ≥25% purely-alphabetic words (≥3 chars) — filters symbol/code noise.
 *  3. Require at least one common English word — confirms it's natural language, not
 *     garbled OCR tokens like "shicemusis" or "hedewszzin".
 */
const COMMON_EN_WORDS = new Set([
  'the','and','to','is','it','in','of','for','a','an','you','i','we','are','have',
  'that','this','with','from','was','be','he','she','they','can','or','but','on',
  'at','by','do','so','what','how','your','my','our','its','not','if','has','as',
  'which','will','all','been','when','there','up','about','out','one','his','her',
  'him','them','who','their','no','yes','into','would','could','should','may','just',
  'more','also','other','some','any','here','there','then','than','very','well',
  'like','want','need','get','got','see','know','think','say','said','make','made',
])
function isOcrQualityGood(text) {
  if (!text || text.trim().length < 25) return false
  // Stage 1: Windows terminal encoding artifacts are a hard disqualifier
  if (/\u0393\u00c7\u00f6|\u252c\u2310|\u252c\u00bb|\u0393\u00c7\u00f4|\u0393\u00c7\u00a3/.test(text)) return false
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length < 5) return false
  // Stage 2: at least 25% purely alphabetic words (≥3 chars)
  const alphaWords = words.filter((w) => /^[a-zA-Z]{3,}$/.test(w))
  if (alphaWords.length / words.length < 0.25) return false
  // Stage 3: at least one recognisable common English word
  const lower = alphaWords.map((w) => w.toLowerCase())
  return lower.some((w) => COMMON_EN_WORDS.has(w))
}

function isSemanticallySameScreen(a, b) {
  if (!a || !b) return false
  const na = normalizeOcrDedupe(a)
  const nb = normalizeOcrDedupe(b)
  if (!na || !nb) return false
  if (na === nb) return true
  const wa = new Set(na.split(/\s+/).filter(Boolean))
  const wb = new Set(nb.split(/\s+/).filter(Boolean))
  if (wa.size < 2 || wb.size < 2) return false
  let overlap = 0
  wa.forEach((w) => {
    if (wb.has(w)) overlap++
  })
  return overlap / Math.max(wa.size, wb.size) > 0.88
}

function ResizeHandle({ edge, onResizeEnd }) {
  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.screenX
    const startY = e.screenY
    ipc?.invoke('get-window-bounds').then((bounds) => {
      if (!bounds) return
      const right = bounds.x + bounds.width
      const onMove = (mv) => {
        const dx = mv.screenX - startX
        const dy = mv.screenY - startY
        let w = bounds.width
        let h = bounds.height
        let x = null

        if (edge === 'right') {
          w = Math.max(280, Math.min(860, bounds.width + dx))
        } else if (edge === 'left') {
          w = Math.max(280, Math.min(860, bounds.width - dx))
          x = right - w
        } else if (edge === 'bottom') {
          h = Math.max(200, Math.min(940, bounds.height + dy))
        } else if (edge === 'se') {
          w = Math.max(280, Math.min(860, bounds.width + dx))
          h = Math.max(200, Math.min(940, bounds.height + dy))
        } else if (edge === 'sw') {
          w = Math.max(280, Math.min(860, bounds.width - dx))
          h = Math.max(200, Math.min(940, bounds.height + dy))
          x = right - w
        }

        if (x != null) ipc?.invoke('resize-window', Math.round(w), Math.round(h), Math.round(x))
        else ipc?.invoke('resize-window', Math.round(w), Math.round(h))
      }
      const onUp = () => {
        ipc?.send('overlay-resize-end')
        ipc?.invoke('get-window-bounds').then((b) => b && b.height > COLLAPSED_H && onResizeEnd?.(b))
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    })
  }, [edge, onResizeEnd])

  const style =
    edge === 'right'
      ? { right: 0, top: 0, width: 8, height: '100%', cursor: 'ew-resize' }
      : edge === 'left'
        ? { left: 0, top: 0, width: 8, height: '100%', cursor: 'ew-resize' }
        : edge === 'bottom'
          ? { bottom: 0, left: 0, width: '100%', height: 6, cursor: 'ns-resize' }
          : edge === 'se'
            ? { bottom: 0, right: 0, width: 14, height: 14, cursor: 'se-resize' }
            : { bottom: 0, left: 0, width: 14, height: 14, cursor: 'nesw-resize' }

  return (
    <div
      className="absolute z-50 opacity-0 hover:opacity-100 transition-opacity rounded"
      style={{ ...style, background: 'rgb(var(--accent-rgb) / 0.2)' }}
      onMouseDown={handleMouseDown}
    />
  )
}

/** Outline eye — “visible in capture” */
function EyeVisibleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

/** Fedora + glasses — stealth / incognito */
function IncognitoGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 10.5c2.8-.9 5.6-1.35 8-1.35s5.2.45 8 1.35" />
      <path d="M7.5 10.2c.9-3.6 2.6-5.7 4.5-5.7s3.6 2.1 4.5 5.7" />
      <ellipse cx="9.25" cy="16" rx="3.25" ry="2.4" />
      <ellipse cx="14.75" cy="16" rx="3.25" ry="2.4" />
      <path d="M12.5 16h-1" />
    </svg>
  )
}

function getMimeType() {
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported(m)) || ''
}

/** Decode MediaRecorder blob → 16 kHz mono LINEAR_PCM for NVIDIA Riva (WAV/OGG/OPUS only on NVCF). */
async function blobToLinear16Mono(blob, targetRate = 16000) {
  const ab = await blob.arrayBuffer()
  const ctx = new AudioContext()
  try {
    const decoded = await ctx.decodeAudioData(ab.slice(0))
    const length = Math.max(1, Math.ceil(decoded.duration * targetRate))
    const offline = new OfflineAudioContext(1, length, targetRate)
    const src = offline.createBufferSource()
    src.buffer = decoded
    src.connect(offline.destination)
    src.start(0)
    const rendered = await offline.startRendering()
    const floats = rendered.getChannelData(0)
    const pcm = new Int16Array(floats.length)
    for (let i = 0; i < floats.length; i++) {
      const s = Math.max(-1, Math.min(1, floats[i]))
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return pcm.buffer
  } finally {
    try {
      await ctx.close()
    } catch {
      /* ignore */
    }
  }
}
function emit(event, detail) {
  window.dispatchEvent(new CustomEvent(event, { detail }))
}

const HALLUCINATIONS = [
  /^thank(s| you)[\s\W]*$/i, /^thanks for (watching|listening)[\s\W]*$/i,
  /^(bye|goodbye|gracias|merci|ありがとう|谢谢)[\s\W]*$/i,
  /^(you|i|the|okay|ok|yeah|hmm+|uh+|um+)[\s.!?]*$/i,
  /^[\s.…,!?\-_]+$/i, /^\[[\w\s,]+\][\s.]*$/i,
  /^\(?music\)?$/i, /^\(?applause\)?$/i, /^\(?laughter\)?$/i, /\bblank[\s_]*audio\b/i,
  /^(subtitle|subtitles)\b/i, /^\.{2,}$/,
  /\bplease subscribe\b/i, /\blike and subscribe\b/i, /^(silence|inaudible)\b/i,
  /^\(?typing\)?$/i, /^watching in \d+p\b/i,
  // Whisper filler on silence / noise — subtitle vendors & prompt echo (substring OK on whole chunk)
  /\bcastingwords\b/i,
  /\btranscription by\b/i,
  /\btranslation by\b/i,
  /transcribe only words that are spoken/i,
  /Дякую за перегляд/u,
  /\bamara\.org\b/i,
  /\bsubtitles? by\b/i,
]

/** Skip only obviously empty blobs (scales with chunk length + codec overhead). */
const MIN_RECORDING_BYTES = 2800

/** Per-path RMS gate + gain; `micSensitivity` in settings picks standard vs boost. */
const MIC_CAPTURE_PROFILES = {
  standard: {
    gain: 1.78,
    chunkMeanMin: 0.86,
    chunkPeakMin: 2.05,
    speechActivityRms: 0.91,
  },
  boost: {
    gain: 2.72,
    chunkMeanMin: 0.74,
    chunkPeakMin: 1.72,
    speechActivityRms: 0.81,
  },
}

/**
 * Windows desktop loopback (Teams / Meet remote audio) is usually much quieter than the local mic
 * and was getting dropped by the same gates as mic. Separate, more sensitive profile per sensitivity.
 */
const SYS_CAPTURE_PROFILES = {
  standard: {
    gain: 3.58,
    chunkMeanMin: 0.34,
    chunkPeakMin: 1.02,
    speechActivityRms: 0.55,
  },
  boost: {
    gain: 4.38,
    chunkMeanMin: 0.29,
    chunkPeakMin: 0.85,
    speechActivityRms: 0.47,
  },
}

const SPEECH_SILENCE_MS = 600

function resolveMicCaptureProfile(raw) {
  return raw === 'boost' ? MIC_CAPTURE_PROFILES.boost : MIC_CAPTURE_PROFILES.standard
}

function resolveSysCaptureProfile(raw) {
  return raw === 'boost' ? SYS_CAPTURE_PROFILES.boost : SYS_CAPTURE_PROFILES.standard
}

function pathEnergyActive(stats, profile) {
  if (!stats || stats.count < 1 || !profile) return false
  const mean = stats.sum / stats.count
  return mean >= profile.chunkMeanMin && stats.max >= profile.chunkPeakMin
}

/**
 * Path into MediaRecorder: HPF → gain (quiet speech) → compressor (limit peaks) → dest.
 * Analyser taps the same tail as MediaRecorder so energy gating matches what we encode.
 *
 * `pathKind`: mic = gentler dynamics + lower HPF (Bluetooth HFP / thin headsets); sys = stronger limiting for loopback.
 */
function buildVoiceCaptureChain(ctx, mediaStream, dest, profile, pathKind = 'mic') {
  const gainLinear =
    profile && typeof profile.gain === 'number' && profile.gain > 0 ? profile.gain : 1
  const src = ctx.createMediaStreamSource(mediaStream)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = pathKind === 'mic' ? 60 : 80
  hp.Q.value = 0.707
  const gainNode = ctx.createGain()
  gainNode.gain.value = gainLinear
  const comp = ctx.createDynamicsCompressor()
  if (pathKind === 'mic') {
    // Gentle — BT/HFP mics and device DSP already compress; don't squash consonants further.
    comp.threshold.value = -30
    comp.knee.value = 18
    comp.ratio.value = 2.2
    comp.attack.value = 0.005
    comp.release.value = 0.28
  } else {
    // Sys loopback: Opus codec already compresses remote audio; use a very light limiter
    // so consonants (s/t/p/k) that Whisper relies on are preserved.
    comp.threshold.value = -16
    comp.knee.value = 36
    comp.ratio.value = 1.8
    comp.attack.value = 0.006
    comp.release.value = 0.32
  }
  src.connect(hp)
  hp.connect(gainNode)
  gainNode.connect(comp)
  comp.connect(dest)
  return comp
}

/**
 * Windows meeting audio: use `getDisplayMedia` so the main-process handler can supply
 * `audio: 'loopback'` (WASAPI mix). `getUserMedia` + `chromeMediaSource: 'desktop'` does not
 * use that path and often misses remote participants (Teams / browser).
 */
async function acquireSystemAudioStream() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    })
    await new Promise((r) => setTimeout(r, 120))
    let audioTracks = stream.getAudioTracks()
    if (!audioTracks.length) {
      await new Promise((r) => setTimeout(r, 220))
      audioTracks = stream.getAudioTracks()
    }
    if (!audioTracks.length) {
      stream.getTracks().forEach((t) => t.stop())
      return acquireSystemAudioStreamLegacyDesktop()
    }
    const vTracks = stream.getVideoTracks()
    setTimeout(() => {
      vTracks.forEach((t) => {
        try {
          t.stop()
        } catch {}
      })
    }, 280)
    return stream
  } catch {
    return acquireSystemAudioStreamLegacyDesktop()
  }
}

async function acquireSystemAudioStreamLegacyDesktop() {
  try {
    const sid = await ipc?.invoke('get-desktop-source-id')
    if (!sid) return null
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sid } },
      video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sid } },
    })
    stream.getVideoTracks().forEach((t) => t.stop())
    return stream
  } catch {
    return null
  }
}

/**
 * Meeting STT: prefer AGC on, echo cancellation + noise suppression off first.
 * Bluetooth HFP / narrowband mics often sound worse when the browser applies EC+NS on top of device DSP.
 */
async function acquireMicMeetingStream() {
  const meeting = {
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: true,
      channelCount: 1,
      sampleRate: { ideal: 48000 },
    },
  }
  const fallback = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    },
  }
  try {
    return await navigator.mediaDevices.getUserMedia(meeting)
  } catch {
    try {
      return await navigator.mediaDevices.getUserMedia(fallback)
    } catch {
      return null
    }
  }
}

export default function App() {
  const [messages, setMessages] = useState([])
  const [isThinking, setIsThinking] = useState(false)
  const [status, setStatus] = useState('idle')
  const [opacity, setOpacity] = useState(0.92)
  const [fontSize, setFontSize] = useState('medium')
  const [micTranscript, setMicTranscript] = useState('')
  const [liveTranscriptSegments, setLiveTranscriptSegments] = useState([])
  const [sessionOn, setSessionOn] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [hiding, setHiding] = useState(false)
  const [stealthMode, setStealthMode] = useState(false)
  const [showAudioConsent, setShowAudioConsent] = useState(false)
  const [sttMode, setSttMode] = useState('local')
  /**
   * False while Moonshine model/base is downloading on first launch (~68 MB).
   * Becomes true once both mic and sys transcribers report onModelLoaded.
   * Used to show a clear "downloading model…" banner so the user knows to wait.
   */
  const [localSttReady, setLocalSttReady] = useState(false)

  const panelRef = useRef(null)
  const audioSessionAcknowledgedRef = useRef(false)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const isListening = useRef(false)
  const sessionOnRef = useRef(false)
  const handleAskRef = useRef(null)
  const clearRollingSpeechRef = useRef(null)
  const msgId = useRef(0)
  const expandedSize = useRef({ w: 400, h: 540 })
  const audioCtx = useRef(null)
  const energyIntervalRef = useRef(null)
  const energySampleRef = useRef(null)
  const chunkEnergyRef = useRef({ active: false, mic: null, sys: null })
  const micCaptureProfileRef = useRef(MIC_CAPTURE_PROFILES.standard)
  const sysCaptureProfileRef = useRef(SYS_CAPTURE_PROFILES.standard)
  const audioPathsRef = useRef({ hasMic: false, hasSys: false })
  const streamSpecsRef = useRef([])
  /** Last mic transcript activity (for main-process audioRecent). */
  const lastAudioUpdateRef = useRef(0)
  const lastOcrUpdateRef = useRef(0)
  const lastSpeechActivityRef = useRef(0)
  const lastLoudEnergyAtRef = useRef(0)
  const micTranscriptRef = useRef('')
  const latestTranscriptRef = useRef('')
  /** Rolling STT accumulation for the current speech window (same chunks also go to mic transcript). */
  const speechBufferRef = useRef('')
  const lastSpeechTimeRef = useRef(0)
  const lastChunkRef = useRef('')
  const assistAutoTriggerRef = useRef(false)
  const maybeTriggerAIRef = useRef(null)
  const maybeTriggerFromScreenRef = useRef(null)
  /** Side-by-side live captions: mic = me, system = other; capped in ref for UI + debug. */
  const speechSegmentsRef = useRef([])
  const liveSegmentIdRef = useRef(0)
  const currentSpeakerRef = useRef('me')
  const lastSpeakerRef = useRef('me')
  const lastTriggerTimeRef = useRef(0)
  /** Buffer content at last successful speech trigger — prevents re-triggering same text. */
  const lastSentSpeechRef = useRef('')
  const speechTriggerDelayRef = useRef(null)
  const speechFailsafeIntervalRef = useRef(null)
  const isProcessingAskRef = useRef(false)
  const lastAskTimeRef = useRef(0)
  /** Latest renderer-local OCR text (same downstream integration as previous IPC flow). */
  const latestOcrTextRef = useRef('')
  const localOcrRuntimeRef = useRef({})
  const localOcrTickRef = useRef(null)
  /** Last OCR text that produced a screen Assist trigger (dedupe). */
  const lastOcrTriggerRef = useRef('')
  const lastScreenTriggerTimeRef = useRef(0)
  const lastGlobalTriggerTimeRef = useRef(0)
  /** Session IPC must call latest start/stop — not first-render closures. */
  const startMicRef = useRef(() => {})
  const stopMicRef = useRef(() => {})
  const bypassCaptureOnceRef = useRef(false)
  const isThinkingRef = useRef(false)
  /** True while main `ask-ai-with-transcript` handler is in flight (released when invoke settles). */
  const responseLockRef = useRef(false)
  const lastResponseRef = useRef('')
  const commitLockRef = useRef(false)

  /** Full streamed text for commit to messages (DOM mirror lives in streamTextRef). */
  const streamAccumRef = useRef('')
  const streamTextRef = useRef(null)
  const streamPulseRef = useRef(null)
  const domTokenBufferRef = useRef('')
  const domTokenFlushScheduledRef = useRef(false)
  /** False after commit/error/clear — blocks stale microtasks from mutating the stream DOM. */
  const streamDomAcceptingRef = useRef(false)
  const streamScrollRafRef = useRef(null)
  const perfAskT0Ref = useRef(0)
  const perfFirstTokenLoggedRef = useRef(false)
  /** Matches the in-flight ask so the assistant/error bubble carries the same source label as the strip. */
  const activeTurnMetaRef = useRef(null)
  const [activeAskSource, setActiveAskSource] = useState(null)

  const scrollBottom = useCallback(() => {
    requestAnimationFrame(() =>
      panelRef.current?.scrollTo({ top: panelRef.current.scrollHeight, behavior: 'smooth' }),
    )
  }, [])

  const clearRollingSpeech = useCallback(() => {
    if (speechTriggerDelayRef.current != null) {
      clearTimeout(speechTriggerDelayRef.current)
      speechTriggerDelayRef.current = null
    }
    speechBufferRef.current = ''
    lastSpeechTimeRef.current = 0
    lastChunkRef.current = ''
    lastTriggerTimeRef.current = 0
    lastSentSpeechRef.current = ''
    lastSpeakerRef.current = 'me'
    speechSegmentsRef.current = []
    setLiveTranscriptSegments([])
  }, [])

  const applySpeechSilenceWindow = useCallback(() => {
    const now = Date.now()
    if (lastSpeechTimeRef.current > 0 && now - lastSpeechTimeRef.current > MAX_SPEECH_WINDOW_MS) {
      clearRollingSpeech()
    }
  }, [clearRollingSpeech])

  const appendLiveSegment = useCallback((speaker, textChunk) => {
    const t = String(textChunk || '').trim()
    if (!t) return
    currentSpeakerRef.current = speaker
    const segs = speechSegmentsRef.current
    const last = segs[segs.length - 1]
    let next
    if (last && last.speaker === speaker) {
      next = [...segs.slice(0, -1), { ...last, text: `${last.text} ${t}`.trim() }]
    } else {
      next = [...segs, { id: ++liveSegmentIdRef.current, speaker, text: t }]
    }
    const capped = next.slice(-MAX_LIVE_SEGMENTS)
    speechSegmentsRef.current = capped
    setLiveTranscriptSegments(capped)
  }, [])

  useEffect(() => {
    micTranscriptRef.current = micTranscript
    latestTranscriptRef.current = micTranscript
  }, [micTranscript])

  useEffect(() => {
    isThinkingRef.current = isThinking
  }, [isThinking])

  useEffect(() => {
    if (!ipc) return
    ipc.invoke('get-store', 'assistAutoTrigger').then((v) => {
      assistAutoTriggerRef.current = v === true
    })
    ipc.invoke('get-store', 'sttMode').then((stt) => {
      const mode = stt === 'cloud' ? 'cloud' : 'local'
      setSttMode(mode)
      if (mode !== 'local') {
        setLocalSttReady(true)
        return
      }
      preloadLocalStt({ onReady: () => setLocalSttReady(true) })
    })
  }, [])

  const refreshLocalOcr = useCallback(
    async (opts = {}) => {
      if (!ipc) return { ok: false, reason: 'no_ipc' }
      try {
        const text = await captureScreenTextLocal(ipc, opts, localOcrRuntimeRef.current)
        if (typeof text === 'string') {
          latestOcrTextRef.current = text
          lastOcrUpdateRef.current = Date.now()
          if (opts.allowAutoTrigger === true && text.trim()) {
            maybeTriggerFromScreenRef.current?.()
          }
        }
        return { ok: true, text: String(text || '') }
      } catch (e) {
        return { ok: false, error: e?.message || String(e) }
      }
    },
    [],
  )

  const cancelStreamScroll = useCallback(() => {
    if (streamScrollRafRef.current != null) {
      cancelAnimationFrame(streamScrollRafRef.current)
      streamScrollRafRef.current = null
    }
  }, [])

  const scheduleStreamScroll = useCallback(() => {
    if (streamScrollRafRef.current != null) return
    streamScrollRafRef.current = requestAnimationFrame(() => {
      streamScrollRafRef.current = null
      const el = panelRef.current
      if (el) el.scrollTop = el.scrollHeight
    })
  }, [])

  const clearStreamDom = useCallback(() => {
    domTokenBufferRef.current = ''
    domTokenFlushScheduledRef.current = false
    const textEl = streamTextRef.current
    if (textEl) {
      textEl.replaceChildren()
    }
    if (streamPulseRef.current) streamPulseRef.current.style.display = ''
  }, [])

  /**
   * Single microtask scheduler: at most one queued flush; all sync tokens merge into domTokenBufferRef.
   * DOM: appendChild(createTextNode(chunk)) per flush — avoids O(n) re-copy of the full string each time.
   */
  const appendTokenToStreamDom = useCallback(
    (t) => {
      if (t == null || t === '' || !streamDomAcceptingRef.current) return
      streamAccumRef.current += t
      if (streamPulseRef.current) streamPulseRef.current.style.display = 'none'
      domTokenBufferRef.current += t
      if (domTokenFlushScheduledRef.current) return
      domTokenFlushScheduledRef.current = true
      queueMicrotask(() => {
        domTokenFlushScheduledRef.current = false
        const chunk = domTokenBufferRef.current
        domTokenBufferRef.current = ''
        if (!streamDomAcceptingRef.current) {
          scheduleStreamScroll()
          return
        }
        const textEl = streamTextRef.current
        if (textEl && chunk) {
          textEl.appendChild(document.createTextNode(chunk))
          ipc?.send('shadowassist-stream-flush')
        }
        if (!perfFirstTokenLoggedRef.current) {
          perfFirstTokenLoggedRef.current = true
          if (perfAskT0Ref.current) {
            const dt = Date.now() - perfAskT0Ref.current
            console.log('UI_FIRST_TOKEN_MS', dt)
            console.log('UI_RESPONSE_DELAY', dt)
          }
          try {
            performance.mark('first-token-received')
          } catch (_) {}
          requestAnimationFrame(() => {
            try {
              performance.mark('painted')
              performance.measure('PAINT_DELAY', 'first-token-received', 'painted')
              const e = performance.getEntriesByName('PAINT_DELAY').pop()
              if (e && typeof e.duration === 'number') console.log('PAINT_DELAY', Math.round(e.duration))
              performance.clearMarks('first-token-received')
              performance.clearMarks('painted')
              performance.clearMeasures('PAINT_DELAY')
            } catch (_) {}
          })
        }
        scheduleStreamScroll()
      })
    },
    [scheduleStreamScroll],
  )

  useEffect(() => {
    if (!ipc) return

    const onStart = (_, meta) => {
      cancelStreamScroll()
      streamDomAcceptingRef.current = true
      streamAccumRef.current = ''
      perfFirstTokenLoggedRef.current = false
      domTokenBufferRef.current = ''
      domTokenFlushScheduledRef.current = false
      const askSource =
        meta && typeof meta === 'object' && typeof meta.askSource === 'string' ? meta.askSource : 'screen'
      activeTurnMetaRef.current = { askSource }
      const echoRaw = meta && typeof meta === 'object' ? meta.transcriptEcho : null
      const echo = typeof echoRaw === 'string' && echoRaw.trim() ? echoRaw.trim() : ''
      flushSync(() => {
        setIsThinking(true)
        setExpanded(true)
        setActiveAskSource(askSource)
        if (echo) {
          setMessages((m) => [...m, { role: 'heard', text: echo, id: ++msgId.current }])
        }
      })
      queueMicrotask(() => {
        clearStreamDom()
      })
      if (perfAskT0Ref.current) {
        console.log('UI_AI_START_MS', Date.now() - perfAskT0Ref.current)
      }
      scheduleStreamScroll()
    }
    const onToken = (_, t) => {
      appendTokenToStreamDom(t)
    }
    const commit = () => {
      if (commitLockRef.current) return
      commitLockRef.current = true
      try {
        cancelStreamScroll()
        streamDomAcceptingRef.current = false
        ipc?.send('shadowassist-stream-ended')
        const full = streamAccumRef.current
        streamAccumRef.current = ''
        const turnMeta = activeTurnMetaRef.current
        if (full) {
          if (full === lastResponseRef.current) {
            console.log('SKIP: duplicate response')
            return
          }
          lastResponseRef.current = full
          setMessages((m) => [...m, { role: 'ai', text: full, id: ++msgId.current, askSource: turnMeta?.askSource }])
          requestAnimationFrame(() => {
            const el = panelRef.current
            if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
          })
        }
      } finally {
        activeTurnMetaRef.current = null
        setActiveAskSource(null)
        clearStreamDom()
        commitLockRef.current = false
      }
    }
    const onThinking = (_, v) => {
      setIsThinking(v)
      if (!v) { commit(); ipc.invoke('session-active').then((a) => setStatus(a ? 'active' : 'idle')) }
      else setStatus('thinking')
    }
    const onAborted = () => { setIsThinking(false); commit() }
    const onError = (_, msg) => {
      cancelStreamScroll()
      streamDomAcceptingRef.current = false
      ipc?.send('shadowassist-stream-ended')
      streamAccumRef.current = ''
      clearStreamDom()
      setIsThinking(false)
      const turnMeta = activeTurnMetaRef.current
      activeTurnMetaRef.current = null
      setActiveAskSource(null)
      setMessages((m) => [...m, { role: 'error', text: msg, id: ++msgId.current, askSource: turnMeta?.askSource }])
      scrollBottom()
    }
    const onClear = () => {
      cancelStreamScroll()
      streamDomAcceptingRef.current = false
      ipc?.send('shadowassist-stream-ended')
      streamAccumRef.current = ''
      clearStreamDom()
      activeTurnMetaRef.current = null
      setActiveAskSource(null)
      setMessages([])
      setMicTranscript('')
      micTranscriptRef.current = ''
      latestTranscriptRef.current = ''
      clearRollingSpeech()
      lastAudioUpdateRef.current = 0
      lastOcrUpdateRef.current = 0
      lastSpeechActivityRef.current = 0
      lastLoudEnergyAtRef.current = Date.now()
      latestOcrTextRef.current = ''
      lastOcrTriggerRef.current = ''
      lastScreenTriggerTimeRef.current = 0
      lastGlobalTriggerTimeRef.current = 0
      lastResponseRef.current = ''
      commitLockRef.current = false
      responseLockRef.current = false
      setIsThinking(false)
    }
    const onNoOutput = () => {
      /* Preserve overlay content; thinking state ends via ai-thinking false → commit. */
    }
    const onTrigger = () => {
      setExpanded(true)
      handleAskRef.current?.(null, { bypassCaptureCooldown: true })
    }

    ipc.on('ai-start', onStart)
    ipc.on('ai-token', onToken)
    ipc.on('ai-thinking', onThinking)
    ipc.on('ai-aborted', onAborted)
    ipc.on('ai-no-output', onNoOutput)
    ipc.on('ai-error', onError)
    ipc.on('clear-conversation', onClear)
    ipc.on('trigger-ask-ai', onTrigger)
    ipc.on('scroll', (_, dir) => panelRef.current?.scrollBy(0, dir * 80))

    return () => {
      cancelStreamScroll()
      ;['ai-start', 'ai-token', 'ai-thinking', 'ai-aborted', 'ai-no-output', 'ai-error', 'clear-conversation', 'trigger-ask-ai', 'scroll'].forEach((ch) =>
        ipc.removeAllListeners(ch),
      )
    }
  }, [scrollBottom, cancelStreamScroll, scheduleStreamScroll, clearStreamDom, appendTokenToStreamDom, clearRollingSpeech])

  useEffect(() => {
    if (!ipc) return
    ipc.invoke('get-store', 'uiAccentTheme').then((id) => applyUiAccentTheme(document.documentElement, normalizeUiAccentId(id)))
    ipc.invoke('get-store', 'overlayOpacity').then((o) => o != null && setOpacity(o))
    ipc.invoke('get-store', 'overlayFontSize').then((f) => f && setFontSize(f))
    ipc.invoke('get-window-bounds').then((b) => {
      if (b && b.height > COLLAPSED_H) expandedSize.current = { w: b.width, h: b.height }
    })
    ipc.invoke('resize-window', expandedSize.current.w, COLLAPSED_H)
  }, [])

  useEffect(() => {
    if (!ipc) return
    const onDisplay = (_, p) => {
      if (p?.overlayOpacity != null) setOpacity(p.overlayOpacity)
      if (p?.overlayFontSize) setFontSize(p.overlayFontSize)
      if (p?.width != null && p?.height != null) expandedSize.current = { w: p.width, h: p.height }
      if (p?.assistAutoTrigger != null) assistAutoTriggerRef.current = !!p.assistAutoTrigger
    }
    const onUiAccent = (_, id) => applyUiAccentTheme(document.documentElement, normalizeUiAccentId(id))
    const u1 = ipc.on('overlay-display-update', onDisplay)
    const u3 = ipc.on('ui-accent-update', onUiAccent)
    return () => {
      u1?.()
      u3?.()
    }
  }, [])

  useEffect(() => {
    if (!ipc) return
    if (expanded) ipc.invoke('resize-window', expandedSize.current.w, expandedSize.current.h)
    else setTimeout(() => ipc.invoke('resize-window', expandedSize.current.w, COLLAPSED_H), 200)
  }, [expanded])

  useEffect(() => {
    if (!ipc) return
    const onStatus = (_, active) => {
      sessionOnRef.current = active
      setSessionOn(active)
      setStatus(active ? 'active' : 'idle')
      if (active) startMicRef.current()
      else {
        stopMicRef.current()
        // Session ended: return to initial compact panel state.
        setExpanded(false)
      }
    }
    const unsub = ipc.on('session-status', onStatus)
    ipc.invoke('session-active').then((a) => {
      sessionOnRef.current = a
      setSessionOn(a)
      setStatus(a ? 'active' : 'idle')
    })
    return () => unsub?.()
  }, [])

  useEffect(() => {
    if (!ipc) return
    ipc.invoke('protection:get').then((v) => setStealthMode(!!v))
    const unsub = ipc.on('stealth-mode-update', (_, v) => setStealthMode(!!v))
    return () => unsub?.()
  }, [])

  useEffect(() => {
    if (!ipc) return
    const onPrompt = () => {
      if (audioSessionAcknowledgedRef.current) {
        ipc.invoke('session-start-confirmed')
      } else {
        setShowAudioConsent(true)
      }
    }
    const unsub = ipc.on('prompt-audio-consent', onPrompt)
    return () => unsub?.()
  }, [])

  useEffect(() => {
    if (!ipc) return
    const onPurge = () => {
      cancelStreamScroll()
      streamDomAcceptingRef.current = false
      ipc?.send('shadowassist-stream-ended')
      streamAccumRef.current = ''
      clearStreamDom()
      activeTurnMetaRef.current = null
      setActiveAskSource(null)
      setMessages([])
      setIsThinking(false)
      setMicTranscript('')
      micTranscriptRef.current = ''
      latestTranscriptRef.current = ''
      clearRollingSpeech()
      lastAudioUpdateRef.current = 0
      lastSpeechActivityRef.current = 0
      lastLoudEnergyAtRef.current = Date.now()
      latestOcrTextRef.current = ''
      lastOcrTriggerRef.current = ''
      lastScreenTriggerTimeRef.current = 0
      lastGlobalTriggerTimeRef.current = 0
      lastResponseRef.current = ''
      commitLockRef.current = false
      responseLockRef.current = false
      // Session ended: collapse panel back to default small state.
      setExpanded(false)
    }
    const unsub = ipc.on('session-purge', onPurge)
    return () => unsub?.()
  }, [clearRollingSpeech, cancelStreamScroll, clearStreamDom])

  const setProtectionMode = useCallback(async (wantStealth) => {
    if (!ipc) return
    if (wantStealth === stealthMode) return
    await ipc.invoke('protection:set', wantStealth)
    setStealthMode(wantStealth)
  }, [stealthMode])

  const confirmAudioSession = async () => {
    audioSessionAcknowledgedRef.current = true
    setShowAudioConsent(false)
    await ipc?.invoke('session-start-confirmed')
  }

  function closeMicAudioCtx() {
    if (energyIntervalRef.current != null) {
      clearInterval(energyIntervalRef.current)
      energyIntervalRef.current = null
    }
    energySampleRef.current = null
    chunkEnergyRef.current = { active: false, mic: null, sys: null }
    audioPathsRef.current = { hasMic: false, hasSys: false }
    streamSpecsRef.current = []
    audioCtx.current?.close?.().catch(() => {})
    audioCtx.current = null
  }

  async function startMic() {
    if ((await ipc?.invoke('get-store', 'audioEnabled')) === false || isListening.current) return
    try {
      const currentSttMode = (await ipc?.invoke('get-store', 'sttMode')) === 'cloud' ? 'cloud' : 'local'
      setSttMode(currentSttMode)
      const sensRaw = await ipc?.invoke('get-store', 'micSensitivity')
      const captureProfile = resolveMicCaptureProfile(sensRaw)
      micCaptureProfileRef.current = captureProfile
      const sysProfile = resolveSysCaptureProfile(sensRaw)
      sysCaptureProfileRef.current = sysProfile

      const mic = await acquireMicMeetingStream()
      let sys = null
      try {
        sys = await acquireSystemAudioStream()
      } catch {}
      if (!mic && !sys) { emit('mic-error', { message: 'No audio' }); return }

      // ── LOCAL: Moonshine streaming (built-in VAD, no MediaRecorder) ──────────
      if (currentSttMode === 'local') {
        isListening.current = true
        streamRef._mic = mic
        streamRef._sys = sys
        startLocalStt(mic, sys, {
          onMicText: (text) => {
            if (!isListening.current) return
            if (HALLUCINATIONS.some((r) => r.test(text))) return
            processTranscribedText(text, 'mic')
          },
          onSysText: (text) => {
            if (!isListening.current) return
            if (HALLUCINATIONS.some((r) => r.test(text))) return
            processTranscribedText(text, 'sys')
          },
        })
        emit('mic-status', { active: true })
        if (!localSttReady) {
          emit('notify', {
            message: '⏳ Downloading Moonshine model (~68 MB) — listening begins once ready. One-time download.',
          })
        }
        return
      }

      // ── CLOUD: MediaRecorder chunks → Groq / OpenAI API ──────────────────────
      let ctx
      try {
        ctx = new AudioContext({ sampleRate: 48000 })
      } catch {
        ctx = new AudioContext()
      }
      audioCtx.current = ctx
      void ctx.resume().catch(() => {})
      streamRef._mic = mic
      streamRef._sys = sys
      streamRef.current = null

      const samplePack = { mic: null, sys: null }
      const specs = []

      if (mic) {
        const micDest = ctx.createMediaStreamDestination()
        const tail = buildVoiceCaptureChain(ctx, mic, micDest, captureProfile, 'mic')
        const a = ctx.createAnalyser()
        a.fftSize = 512
        tail.connect(a)
        samplePack.mic = { analyser: a, data: new Uint8Array(a.frequencyBinCount) }
        specs.push({ key: 'mic', stream: micDest.stream })
      }
      if (sys) {
        const sysDest = ctx.createMediaStreamDestination()
        const tail = buildVoiceCaptureChain(ctx, sys, sysDest, sysProfile, 'sys')
        const a = ctx.createAnalyser()
        a.fftSize = 512
        tail.connect(a)
        samplePack.sys = { analyser: a, data: new Uint8Array(a.frequencyBinCount) }
        specs.push({ key: 'sys', stream: sysDest.stream })
      }

      streamSpecsRef.current = specs
      audioPathsRef.current = { hasMic: !!mic, hasSys: !!sys }
      energySampleRef.current = samplePack
      chunkEnergyRef.current = {
        active: false,
        mic: mic ? { sum: 0, count: 0, max: 0 } : null,
        sys: sys ? { sum: 0, count: 0, max: 0 } : null,
      }

      lastLoudEnergyAtRef.current = Date.now()

      if (energyIntervalRef.current != null) clearInterval(energyIntervalRef.current)
      energyIntervalRef.current = setInterval(() => {
        const pack = energySampleRef.current
        const ce = chunkEnergyRef.current
        if (!pack || !isListening.current) return

        const bumpSilence = (rms, profile) => {
          const t = Date.now()
          const act = profile?.speechActivityRms ?? 0.98
          if (rms >= act) lastLoudEnergyAtRef.current = t
          else if (t - lastLoudEnergyAtRef.current > SPEECH_SILENCE_MS) {
            lastSpeechActivityRef.current = t - 1000
          }
        }

        const tick = (branch, key) => {
          if (!branch) return
          const node = pack[key]
          if (!node?.analyser) return
          node.analyser.getByteTimeDomainData(node.data)
          const rms = Math.sqrt(node.data.reduce((s, v) => s + (v - 128) ** 2, 0) / node.data.length)
          const profile = key === 'sys' ? sysCaptureProfileRef.current : micCaptureProfileRef.current
          bumpSilence(rms, profile)
          if (!ce.active) return
          branch.sum += rms
          branch.count += 1
          if (rms > branch.max) branch.max = rms
        }
        tick(ce.mic, 'mic')
        tick(ce.sys, 'sys')
      }, 50)

      isListening.current = true
      emit('mic-status', { active: true })
      startChunk()
    } catch (e) {
      emit('mic-error', { message: e.name === 'NotAllowedError' ? 'Mic denied' : e.message })
    }
  }

  function startChunk() {
    if (!isListening.current) return
    const specs = streamSpecsRef.current || []
    if (!specs.length) return

    const ce = chunkEnergyRef.current
    if (ce.mic) {
      ce.mic.sum = 0
      ce.mic.count = 0
      ce.mic.max = 0
    }
    if (ce.sys) {
      ce.sys.sum = 0
      ce.sys.count = 0
      ce.sys.max = 0
    }
    ce.active = true

    const mime = getMimeType()
    /** Higher Opus bitrate → clearer consonants for Whisper vs browser default (~32–64k). */
    const recOpts = mime
      ? { mimeType: mime, audioBitsPerSecond: 128000 }
      : { audioBitsPerSecond: 128000 }
    const recorders = []
    let pendingStops = 0

    specs.forEach((spec) => {
      if (!spec.stream?.active) return
      pendingStops += 1
      const mr = new MediaRecorder(spec.stream, recOpts)
      const chunks = []
      mr.ondataavailable = (e) => e.data?.size > 0 && chunks.push(e.data)
      mr.onstop = () => {
        pendingStops -= 1
        if (pendingStops <= 0) {
          chunkEnergyRef.current.active = false
          if (isListening.current) startChunk()
        }

        if (chunks.length === 0) return
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' })
        const branch = spec.key === 'mic' ? chunkEnergyRef.current.mic : chunkEnergyRef.current.sys
        const { hasMic, hasSys } = audioPathsRef.current
        const prof =
          spec.key === 'sys' ? sysCaptureProfileRef.current : micCaptureProfileRef.current
        const pathOk =
          spec.key === 'mic'
            ? hasMic && pathEnergyActive(branch, prof)
            /**
             * Teams participant audio can be low/compressed and often fails RMS gates.
             * For system loopback, accept any non-trivial chunk when the stream exists.
             */
            : hasSys
        if (blob.size >= MIN_RECORDING_BYTES && pathOk) void transcribe(blob, mr.mimeType, spec.key)
      }
      try {
        mr.start()
        recorders.push(mr)
      } catch (e) {
        console.error('[MediaRecorder] start failed', spec.key, e?.message || e)
      }
    })

    recorderRef.current = recorders.length === 1 ? recorders[0] : recorders
    if (!recorders.length && isListening.current) {
      setTimeout(() => startChunk(), AUDIO_CHUNK_MS)
    }

    setTimeout(() => {
      recorders.forEach((r) => r.state === 'recording' && r.stop())
    }, AUDIO_CHUNK_MS)
  }

  function stopMic() {
    isListening.current = false
    // Stop Moonshine transcribers (local mode)
    stopLocalStt()
    const r = recorderRef.current
    if (Array.isArray(r)) r.forEach((x) => x.state !== 'inactive' && x.stop())
    else r?.state !== 'inactive' && r?.stop()
    streamRef._mic?.getTracks().forEach((t) => t.stop())
    streamRef._sys?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    streamRef._mic = null
    streamRef._sys = null
    recorderRef.current = null
    streamSpecsRef.current = []
    closeMicAudioCtx()
    emit('mic-status', { active: false })
    clearRollingSpeech()
    setMicTranscript('')
    micTranscriptRef.current = ''
    latestTranscriptRef.current = ''
  }

  /**
   * Shared post-processing after text is obtained from either the local or cloud STT path.
   * Handles speaker tagging, rolling buffer, live segments, and AI trigger.
   */
  function processTranscribedText(text, audioPathKey) {
    const trimmedChunk = text.trim()
    const tChunk = Date.now()
    const silenceBeforeMs = lastSpeechTimeRef.current > 0 ? tChunk - lastSpeechTimeRef.current : 0
    let speaker
    if (audioPathKey === 'mic') { speaker = 'me'; lastSpeakerRef.current = 'me' }
    else if (audioPathKey === 'sys') { speaker = 'other'; lastSpeakerRef.current = 'other' }
    else { speaker = assignChunkSpeaker(trimmedChunk, silenceBeforeMs, lastSpeakerRef) }
    const roleTag = speaker === 'me' ? 'Me' : 'Participant'

    lastChunkRef.current = trimmedChunk
    const stamp = Date.now()
    lastAudioUpdateRef.current = stamp
    lastSpeechActivityRef.current = stamp

    const labeled = `${roleTag}: ${trimmedChunk}`
    ipc?.invoke('session-transcript-append', labeled)

    if (speechTriggerDelayRef.current != null) {
      clearTimeout(speechTriggerDelayRef.current)
      speechTriggerDelayRef.current = null
    }

    const mergedBuff = speechBufferRef.current
      ? `${speechBufferRef.current} ${trimmedChunk}`
      : trimmedChunk
    speechBufferRef.current = trimBufferSmart(mergedBuff)
    lastSpeechTimeRef.current = Date.now()
    appendLiveSegment(speaker, trimmedChunk)

    setMicTranscript((prev) => {
      const combined = (prev + ' ' + trimmedChunk).trim().split(/\s+/).slice(-600).join(' ')
      micTranscriptRef.current = combined
      latestTranscriptRef.current = combined
      emit('transcript-updated', { latest: labeled, full: combined })
      return combined
    })

    maybeTriggerAIRef.current?.()
  }

  startMicRef.current = startMic
  stopMicRef.current = stopMic

  async function transcribe(blob, mimeType, audioPathKey) {
    try {
      // Local mode uses Moonshine streaming callbacks — MediaRecorder chunks never reach here.
      // Must read sttMode from the store, not React state: setSttMode in startMic is async, so
      // `sttMode` can still be "local" on the first cloud chunks and this would return early
      // (no transcription) until a re-render — looked like "Groq / cloud not listening".
      const mode = (await ipc?.invoke('get-store', 'sttMode')) === 'cloud' ? 'cloud' : 'local'
      if (mode === 'local') return

      // ── CLOUD path (Groq / OpenAI Whisper, NVIDIA Parakeet, …) ─────────────
      const cfg = await ipc?.invoke('get-transcription-config')
      if (!cfg?.apiKey) return

      if (cfg.sttKind === 'nvidia_riva') {
        const pcm = await blobToLinear16Mono(blob)
        const { text: nvidiaText } =
          (await ipc?.invoke('nvidia-transcribe-pcm', {
            pcm,
            sampleRate: 16000,
            languageCode: cfg.languageCode || 'multi',
          })) || {}
        const text = String(nvidiaText || '').trim()
        if (!text || text.length < 3 || HALLUCINATIONS.some((r) => r.test(text))) return
        processTranscribedText(text, audioPathKey)
        return
      }

      if (!cfg.url) return

      const ext = (mimeType || '').includes('ogg') ? 'ogg' : 'webm'
      const post = (format) => {
        const fd = new FormData()
        fd.append('file', blob, `a.${ext}`)
        fd.append('model', cfg.model)
        fd.append('temperature', '0')
        if (cfg.language) fd.append('language', cfg.language)
        if (cfg.prompt) fd.append('prompt', cfg.prompt)
        if (format === 'verbose_json') {
          fd.append('response_format', 'verbose_json')
          fd.append('timestamp_granularities[]', 'segment')
        } else if (format === 'json') {
          fd.append('response_format', 'json')
        } else {
          fd.append('response_format', 'text')
        }
        return fetch(cfg.url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${cfg.apiKey}` },
          body: fd,
        })
      }

      let useWhisperMeta = cfg.useWhisperSegmentMeta === true
      let res
      if (useWhisperMeta) {
        res = await post('verbose_json')
        if (!res.ok) { res = await post('json'); useWhisperMeta = false }
      } else if (cfg.responseKind === 'json') {
        res = await post('json')
      } else {
        res = await post('text')
      }
      if (!res.ok) return

      let text = ''
      const ct = (res.headers.get('content-type') || '').toLowerCase()
      if (useWhisperMeta || cfg.responseKind === 'json' || ct.includes('application/json')) {
        try {
          const j = await res.json()
          if (useWhisperMeta) {
            const gated = filterWhisperVerboseJson(j, audioPathKey === 'sys' ? 'sys' : 'mic')
            text = String(gated.text || '').trim()

            const allowed = Array.isArray(cfg.allowedLanguages) ? cfg.allowedLanguages : null
            if (text && allowed && gated.detectedLanguage) {
              const wrongLang = !allowed.includes(gated.detectedLanguage)
              const agg = gated.aggregateLogprob
              const confidentDetection =
                audioPathKey !== 'sys' || (agg != null && Number.isFinite(agg) && agg > -0.55)
              if (wrongLang && confidentDetection) text = ''
            }

            const hardMin = audioPathKey === 'sys' ? -0.90 : AGGREGATE_DROP_HARD_MIN
            const agg = gated.aggregateLogprob
            if (text && typeof agg === 'number' && Number.isFinite(agg) && agg < hardMin) text = ''
          } else {
            text = String(j.text || j.transcription || '').trim()
          }
        } catch {
          return
        }
      } else {
        text = (await res.text()).trim()
      }
      if (!text || text.length < 3 || HALLUCINATIONS.some((r) => r.test(text.trim()))) return

      const trimmedChunk = text.trim()
      const tChunk = Date.now()
      const silenceBeforeMs =
        lastSpeechTimeRef.current > 0 ? tChunk - lastSpeechTimeRef.current : 0
      /** System loopback = remote meeting audio; mic = you. Do not infer from text/heuristics alone. */
      processTranscribedText(trimmedChunk, audioPathKey)
    } catch {}
  }

  const maybeTriggerAI = useCallback(() => {
    if (!sessionOnRef.current) return
    if (!assistAutoTriggerRef.current) return
    if (responseLockRef.current) return
    const silenceMs = Date.now() - lastSpeechTimeRef.current
    // Speech is too stale — clear and bail rather than trigger with old content
    if (lastSpeechTimeRef.current > 0 && silenceMs > MAX_SPEECH_WINDOW_MS) {
      clearRollingSpeech()
      return
    }
    const speech = String(speechBufferRef.current || '').trim()
    if (speech.length < MIN_SPEECH_LENGTH) return
    if (silenceMs <= SPEECH_STABILITY_MS) return
    if (Date.now() - lastTriggerTimeRef.current < SPEECH_TRIGGER_COOLDOWN_MS) return
    /** Don't re-trigger if buffer hasn't grown since last send (same text = same answer). */
    if (speech === lastSentSpeechRef.current) return
    /** One armed delay only: clearing on every 500ms tick was starving the timer (never fired). */
    if (speechTriggerDelayRef.current != null) return
    /**
     * CRITICAL: Claim this speech content SYNCHRONOUSLY before the async OCR path runs.
     * Without this, the 500ms interval fires again before handleAsk's async block updates
     * lastSentSpeechRef, causing a duplicate trigger with identical content.
     */
    lastSentSpeechRef.current = speech
    console.log('🎤 BUFFER:', speechBufferRef.current)
    console.log('⏱ LAST TRIGGER:', lastTriggerTimeRef.current)
    speechTriggerDelayRef.current = window.setTimeout(() => {
      speechTriggerDelayRef.current = null
      if (!sessionOnRef.current || !assistAutoTriggerRef.current || responseLockRef.current) return
      const silenceNow = Date.now() - lastSpeechTimeRef.current
      if (lastSpeechTimeRef.current > 0 && silenceNow > MAX_SPEECH_WINDOW_MS) {
        clearRollingSpeech()
        return
      }
      const after = String(speechBufferRef.current || '').trim()
      if (after.length < MIN_SPEECH_LENGTH) return
      if (silenceNow <= SPEECH_STABILITY_MS) return
      if (Date.now() - lastTriggerTimeRef.current < SPEECH_TRIGGER_COOLDOWN_MS) return
      /** If new speech arrived during the 150ms lead-in, update the claim to the new content. */
      if (after !== speech) lastSentSpeechRef.current = after
      handleAskRef.current?.(null, { auto: true, source: 'speech' })
    }, SPEECH_TRIGGER_LEAD_IN_MS)
  }, [clearRollingSpeech])

  const maybeTriggerFromScreen = useCallback(() => {
    if (!sessionOnRef.current) return
    if (!assistAutoTriggerRef.current) return
    if (responseLockRef.current) return
    handleAskRef.current?.(null, { auto: true, source: 'screen' })
  }, [])

  const handleAsk = useCallback(
    (q, opts = {}) => {
      const isAuto = opts.auto === true
      const isScreenRead = opts.source === 'screen-read' || opts.source === 'screen'
      const assistSource = isScreenRead
        ? 'screen'
        : opts.source === 'speech-failsafe'
          ? 'speech-failsafe'
          : 'speech'
      /** Screen-read always bypasses OCR cooldown to get fresh context. */
      if (isScreenRead) opts = { ...opts, bypassCaptureCooldown: true }
      if (responseLockRef.current) {
        console.log('BLOCKED: response in-flight')
        return
      }
      if (isThinkingRef.current) {
        console.log('BLOCKED: already processing')
        return
      }
      if (isProcessingAskRef.current) return
      const trimmed = q?.trim() || null
      const hasText = !!(trimmed && trimmed.length > 0)
      if (!sessionOnRef.current && !hasText) return
      if (!isAuto && Date.now() - lastAskTimeRef.current < MIN_ASK_GAP_MS) return

      const hasSpeechBuff = String(speechBufferRef.current || '').trim().length > 0
      const hasScreenText = String(latestOcrTextRef.current || '').trim().length > 0

      if (isAuto) {
        if (!hasText && !hasSpeechBuff && hasScreenText && assistSource !== 'screen') return

        let screenSnapshot = ''
        if (assistSource === 'screen') {
          screenSnapshot = String(latestOcrTextRef.current || '')
          if (isSemanticallySameScreen(screenSnapshot, lastOcrTriggerRef.current)) return
          if (screenSnapshot.trim().length < MIN_OCR_TRIGGER_CHARS) return
          if (Date.now() - lastScreenTriggerTimeRef.current < SCREEN_ASSIST_COOLDOWN_MS) return
          if (Date.now() - lastGlobalTriggerTimeRef.current < GLOBAL_TRIGGER_COOLDOWN_MS) return
          lastGlobalTriggerTimeRef.current = Date.now()
        } else if (assistSource === 'speech-failsafe') {
          const sp = String(speechBufferRef.current || '').trim()
          if (sp.length <= 20) return
        } else {
          const sp = String(speechBufferRef.current || '').trim()
          if (sp.length < MIN_SPEECH_LENGTH) return
          if (Date.now() - lastSpeechTimeRef.current <= SPEECH_STABILITY_MS) return
        }

        if (assistSource === 'screen') {
          lastOcrTriggerRef.current = screenSnapshot
          lastScreenTriggerTimeRef.current = Date.now()
        }
      }

      const bypassCapture =
        opts.bypassCaptureCooldown === true || bypassCaptureOnceRef.current
      bypassCaptureOnceRef.current = false

      void (async () => {
        try {
          if (isProcessingAskRef.current || isThinkingRef.current || responseLockRef.current) return

          // Snapshot the speech buffer NOW — before async OCR wait and before
          // applySpeechSilenceWindow() can wipe it (silence > 20s wipes the live ref).
          const bufferedSpeech = String(speechBufferRef.current || '').trim()

          if (sessionOnRef.current && ipc) {
            const ocrAgeMs = Date.now() - lastOcrUpdateRef.current
            const hasFreshOcr =
              ocrAgeMs >= 0 &&
              ocrAgeMs <= FRESH_OCR_MAX_AGE_MS &&
              String(latestOcrTextRef.current || '').trim().length > 0
            const preferFastStart = isScreenRead
            if (hasFreshOcr && preferFastStart) {
              // Keep latency low for Ctrl+Enter: use fresh OCR now, refresh in background.
              void refreshLocalOcr({ bypassCaptureCooldown: false })
            } else {
              const r = await refreshLocalOcr({
                bypassCaptureCooldown: bypassCapture,
              })
              if (r?.ok && typeof r.text === 'string') {
                latestOcrTextRef.current = r.text
                lastOcrUpdateRef.current = Date.now()
              }
            }
          }

          if (isProcessingAskRef.current || isThinkingRef.current || responseLockRef.current) return

          if (isAuto && (assistSource === 'speech' || assistSource === 'speech-failsafe')) {
            lastTriggerTimeRef.current = Date.now()
            lastSentSpeechRef.current = bufferedSpeech
          }
          isProcessingAskRef.current = true
          applySpeechSilenceWindow()

          console.log('TRIGGER SOURCE:', opts?.source || 'speech')
          console.log('SPEECH:', bufferedSpeech)
          console.log('SCREEN:', latestOcrTextRef.current)

          const ocrText = latestOcrTextRef.current || ''
          const screenLimited = isOcrQualityGood(ocrText)
            ? String(ocrText).slice(0, MAX_SCREEN_CONTEXT_CHARS)
            : ''

          /**
           * Determine prompt mode (mirrors Cluely's two-prompt architecture):
           *  'screen' → Ctrl+Enter with no typed text: DO NOT use stale audio, focus on screen.
           *  'typed'  → user typed a question: typed text is primary.
           *  'audio'  → speech/auto trigger: respond to last question in transcript.
           */
          const promptMode = (isScreenRead && !trimmed) ? 'screen' : trimmed ? 'typed' : 'audio'

          /**
           * Screen mode must NOT inject stale audio — the user wants screen info,
           * not a replay of what they said minutes ago ("Am I audible to the meeting").
           */
          const rawSpeech = promptMode === 'screen' ? '' : bufferedSpeech
          const transcriptToSend = rawSpeech || (promptMode !== 'screen' ? micTranscriptRef.current : '') || ''

          console.log('🔀 PROMPT MODE:', promptMode, '| ocr_useful:', !!screenLimited, '| audio_len:', rawSpeech.length)

          const finalPrompt = buildStructuredUserPrompt({
            rawSpeech,
            micFallback: transcriptToSend,
            screenText: screenLimited,
            typedQuestion: trimmed,
            mode: promptMode,
          })
          console.log('FINAL PROMPT:', finalPrompt)

          if (hasText) {
            setMessages((m) => [...m, { role: 'user', text: trimmed, id: ++msgId.current }])
            scrollBottom()
          }

          lastAskTimeRef.current = Date.now()
          perfAskT0Ref.current = Date.now()
          const meta = {
            transcript: transcriptToSend,
            screen: ocrText,
            structuredUserPrompt: finalPrompt,
            mode: promptMode,
            promptSummary: {
              hasTypedQuestion: !!trimmed,
              hasSpeechContext: !!(rawSpeech || String(transcriptToSend || '').trim()),
              hasScreen: !!String(ocrText || '').trim(),
            },
            assistTrigger: assistSource,
            source: trimmed ? 'typed' : rawSpeech ? 'speech' : 'screen',
            _llmTriggerAt: perfAskT0Ref.current,
          }
          console.log('TRIGGER INPUT', {
            mode: promptMode,
            speech: rawSpeech?.slice(0, 120),
            transcriptLen: transcriptToSend.length,
            ocr: ocrText?.slice(0, 80),
          })

          try {
            responseLockRef.current = true
            const askP = ipc?.invoke('ask-ai-with-transcript', trimmed, transcriptToSend, meta)
            if (askP) {
              await askP
            }
            /**
             * Each finished answer ends the turn: rolling STT buffer + full mic transcript
             * (main process also clears session transcript segments on success).
             */
            clearRollingSpeechRef.current?.()
            setMicTranscript('')
            micTranscriptRef.current = ''
            latestTranscriptRef.current = ''
          } catch (err) {
            console.warn('[ask-ai-with-transcript]', err)
          } finally {
            responseLockRef.current = false
            isProcessingAskRef.current = false
          }
        } catch (e) {
          isProcessingAskRef.current = false
          responseLockRef.current = false
        }
      })()
    },
    [scrollBottom, applySpeechSilenceWindow, clearRollingSpeech],
  )
  useEffect(() => {
    handleAskRef.current = handleAsk
  }, [handleAsk])
  useEffect(() => {
    clearRollingSpeechRef.current = clearRollingSpeech
  }, [clearRollingSpeech])
  useEffect(() => {
    maybeTriggerAIRef.current = maybeTriggerAI
  }, [maybeTriggerAI])
  useEffect(() => {
    maybeTriggerFromScreenRef.current = maybeTriggerFromScreen
  }, [maybeTriggerFromScreen])

  useEffect(() => {
    if (!sessionOn) return
    const tick = window.setInterval(() => {
      applySpeechSilenceWindow()
      maybeTriggerAIRef.current?.()
    }, 500)
    return () => clearInterval(tick)
  }, [sessionOn, applySpeechSilenceWindow])

  useEffect(() => {
    if (!sessionOn) return
    void warmupLocalOcr()
    void refreshLocalOcr({ allowAutoTrigger: false })
  }, [sessionOn, refreshLocalOcr])

  useEffect(() => {
    if (!sessionOn) return
    if (localOcrTickRef.current) clearInterval(localOcrTickRef.current)
    localOcrTickRef.current = window.setInterval(() => {
      if (!sessionOnRef.current || responseLockRef.current || isThinkingRef.current) return
      void refreshLocalOcr({ allowAutoTrigger: true })
    }, 1200)
    return () => {
      if (localOcrTickRef.current) {
        clearInterval(localOcrTickRef.current)
        localOcrTickRef.current = null
      }
    }
  }, [sessionOn, refreshLocalOcr])

  useEffect(
    () => () => {
      if (speechTriggerDelayRef.current != null) {
        clearTimeout(speechTriggerDelayRef.current)
        speechTriggerDelayRef.current = null
      }
      if (localOcrTickRef.current) {
        clearInterval(localOcrTickRef.current)
        localOcrTickRef.current = null
      }
      void terminateLocalOcr()
    },
    [],
  )

  useEffect(() => {
    if (!sessionOn) return
    if (speechFailsafeIntervalRef.current) clearInterval(speechFailsafeIntervalRef.current)
    speechFailsafeIntervalRef.current = window.setInterval(() => {
      if (!sessionOnRef.current) return
      if (!assistAutoTriggerRef.current || responseLockRef.current) return
      applySpeechSilenceWindow()
      const fsBuffer = String(speechBufferRef.current || '').trim()
      if (fsBuffer.length <= 20) return
      if (Date.now() - lastTriggerTimeRef.current <= FAILSAFE_MIN_GAP_AFTER_TRIGGER_MS) return
      if (fsBuffer === lastSentSpeechRef.current) return
      // Claim synchronously — same race-condition fix as maybeTriggerAI
      lastSentSpeechRef.current = fsBuffer
      console.log('🎤 BUFFER:', speechBufferRef.current)
      console.log('⏱ LAST TRIGGER:', lastTriggerTimeRef.current)
      handleAskRef.current?.(null, { auto: true, source: 'speech-failsafe' })
    }, SPEECH_FAILSAFE_MS)
    return () => {
      if (speechFailsafeIntervalRef.current) {
        clearInterval(speechFailsafeIntervalRef.current)
        speechFailsafeIntervalRef.current = null
      }
    }
  }, [sessionOn, applySpeechSilenceWindow])

  const hideOverlay = useCallback(() => {
    setHiding(true)
    setTimeout(() => { setHiding(false); ipc?.send('overlay-hide') }, 220)
  }, [])

  const quitApp = useCallback(() => {
    ipc?.send('app-quit')
  }, [])

  const onToggleSession = useCallback(() => {
    ipc?.send('ui-toggle-session')
  }, [])
  const onOpenSettings = useCallback(() => {
    ipc?.send('open-settings')
  }, [])
  const onExpandPanel = useCallback(() => {
    bypassCaptureOnceRef.current = true
    setExpanded(true)
  }, [])

  const onResizeEnd = useCallback((b) => {
    expandedSize.current = { w: b.width, h: b.height }
  }, [])

  return (
    <div
      className="relative flex h-full w-full flex-col"
      style={{
        opacity: hiding ? 0 : 1,
        transform: hiding ? 'translateY(-6px) scale(0.98)' : 'translateY(0) scale(1)',
        transition: hiding ? 'opacity 0.18s ease, transform 0.18s ease' : 'none',
      }}
    >
      {/* Main card */}
      <div
        className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.09]"
        style={{
          background: `rgba(10,10,13,${opacity})`,
          backdropFilter: 'blur(24px) saturate(1.3)',
          boxShadow: '0 0 0 0.5px rgba(255,255,255,0.05) inset, 0 8px 40px -10px rgba(0,0,0,0.65)',
        }}
      >
        <StatusBar
          status={status}
          sessionOn={sessionOn}
          expanded={expanded}
          onToggleSession={onToggleSession}
          onOpenSettings={onOpenSettings}
          onExpand={onExpandPanel}
          onHide={hideOverlay}
          onQuit={quitApp}
        />

        {/* Compact stealth toggle */}
        <div
          className="flex shrink-0 items-center justify-between border-b border-white/[0.05] px-3 py-1.5"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <span className="text-[10px] text-zinc-700">
            {stealthMode ? 'Hidden from capture' : 'Visible in capture'}
          </span>
          <div
            role="group"
            aria-label="Screen capture visibility"
            className="flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] p-0.5"
          >
            <button
              type="button"
              title="Visible — may appear in screen share"
              aria-label="Visible mode"
              aria-pressed={!stealthMode}
              onClick={() => void setProtectionMode(false)}
              className={[
                'cursor-default flex h-5 w-6 items-center justify-center rounded-full transition-colors duration-150',
                !stealthMode ? 'text-zinc-200' : 'text-zinc-700 hover:text-zinc-500',
              ].join(' ')}
            >
              <EyeVisibleIcon />
            </button>
            <button
              type="button"
              title="Stealth — hidden from screen capture"
              aria-label="Stealth mode"
              aria-pressed={stealthMode}
              onClick={() => void setProtectionMode(true)}
              className={[
                'cursor-default flex h-5 w-6 items-center justify-center rounded-full transition-colors duration-150',
                stealthMode ? 'text-zinc-200' : 'text-zinc-700 hover:text-zinc-500',
              ].join(' ')}
            >
              <IncognitoGlyph />
            </button>
          </div>
        </div>

        {/* Expandable content */}
        <div
          className="grid min-h-0 flex-1 w-full overflow-hidden"
          style={{
            gridTemplateRows: expanded ? 'minmax(0, 1fr)' : '0fr',
            transition: 'grid-template-rows 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div
              className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
              style={{
                opacity: expanded ? 1 : 0,
                transition: 'opacity 0.18s ease',
              }}
            >
              <ResponsePanel
                ref={panelRef}
                messages={messages}
                isThinking={isThinking}
                streamTextRef={streamTextRef}
                streamPulseRef={streamPulseRef}
                fontSize={fontSize}
                activeAskSource={activeAskSource}
              />

              {/* LiveTranscriptPanel — logic + data intact, not rendered per UI spec */}

              <div className="shrink-0 border-t border-white/[0.07]">
                <InputBar onAsk={(t, opts) => handleAsk(t, opts || {})} isThinking={isThinking} />
              </div>
            </div>
          </div>
        </div>

        {expanded && (
          <>
            <ResizeHandle edge="left" onResizeEnd={onResizeEnd} />
            <ResizeHandle edge="right" onResizeEnd={onResizeEnd} />
            <ResizeHandle edge="bottom" onResizeEnd={onResizeEnd} />
            <ResizeHandle edge="sw" onResizeEnd={onResizeEnd} />
            <ResizeHandle edge="se" onResizeEnd={onResizeEnd} />
          </>
        )}
      </div>

      {/* Audio consent modal */}
      {showAudioConsent && (
        <div
          className="pointer-events-auto fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950/98 p-5 shadow-2xl">
            <p className="text-[13px] leading-relaxed text-zinc-300">
              You are responsible for informing all participants that AI assistance is active in this session.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAudioConsent(false)}
                className="cursor-default rounded-xl border border-white/10 px-4 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAudioSession}
                className="cursor-default rounded-xl bg-accent/20 border border-accent/30 px-4 py-1.5 text-xs font-medium text-accent-light transition-colors hover:bg-accent/30"
              >
                I understand, start
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collapse button */}
      {expanded && (
        <div
          className="flex shrink-0 justify-start pt-1.5"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="cursor-default flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/70 px-3.5 py-1.5 text-[11px] font-medium text-zinc-500 transition-all duration-150 hover:border-white/15 hover:text-zinc-300 active:scale-95"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
            Collapse
          </button>
        </div>
      )}
    </div>
  )
}
