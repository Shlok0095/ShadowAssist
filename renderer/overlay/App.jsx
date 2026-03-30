// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import React, { useState, useEffect, useRef, useCallback } from 'react'
import StatusBar from './components/StatusBar'
import ResponsePanel from './components/ResponsePanel'
import InputBar from './components/InputBar'
import { applyUiAccentTheme, normalizeUiAccentId } from '../shared/uiAccentThemes'
import { createIpcShim } from '../shared/ipcShim'
import { filterWhisperVerboseJson } from '../shared/whisperTranscriptGate'

const ipc = createIpcShim()
const COLLAPSED_H = 38

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
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

/** Fedora + glasses — stealth / incognito */
function IncognitoGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 10.5c2.8-.9 5.6-1.35 8-1.35s5.2.45 8 1.35" />
      <path d="M7.5 10.2c.9-3.6 2.6-5.7 4.5-5.7s3.6 2.1 4.5 5.7" />
      <ellipse cx="9.25" cy="16" rx="3.25" ry="2.4" />
      <ellipse cx="14.75" cy="16" rx="3.25" ry="2.4" />
      <path d="M12.5 16h-1" />
    </svg>
  )
}

function getMimeType() {
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find((m) => MediaRecorder.isTypeSupported(m)) || ''
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
]

/** Skip only obviously empty blobs (container overhead varies by codec). */
const MIN_RECORDING_BYTES = 1200

/**
 * Per-path RMS (byte time-domain analyser). Mean + peak: blocks single-click / steady-hum false
 * STT. Mic and system are measured separately; a chunk is transcribed only if that path was active.
 */
const CHUNK_ENERGY_MEAN_MIN = 1.45
const CHUNK_ENERGY_PEAK_MIN = 4.25

function pathEnergyActive(stats) {
  if (!stats || stats.count < 1) return false
  const mean = stats.sum / stats.count
  return mean >= CHUNK_ENERGY_MEAN_MIN && stats.max >= CHUNK_ENERGY_PEAK_MIN
}

function highpassMicChain(ctx, mediaStream, dest) {
  const src = ctx.createMediaStreamSource(mediaStream)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 80
  hp.Q.value = 0.707
  src.connect(hp)
  hp.connect(dest)
  return hp
}

export default function App() {
  const [messages, setMessages] = useState([])
  const [streaming, setStreaming] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [status, setStatus] = useState('idle')
  const [opacity, setOpacity] = useState(0.92)
  const [fontSize, setFontSize] = useState('medium')
  const [micTranscript, setMicTranscript] = useState('')
  const [sessionOn, setSessionOn] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [hiding, setHiding] = useState(false)
  const [stealthMode, setStealthMode] = useState(false)
  const [showAudioConsent, setShowAudioConsent] = useState(false)

  const panelRef = useRef(null)
  const audioSessionAcknowledgedRef = useRef(false)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const isListening = useRef(false)
  const chunkMs = useRef(5000)
  const handleAskRef = useRef(null)
  const msgId = useRef(0)
  const expandedSize = useRef({ w: 400, h: 540 })
  const audioCtx = useRef(null)
  const energyIntervalRef = useRef(null)
  const energySampleRef = useRef(null)
  const chunkEnergyRef = useRef({ active: false, mic: null, sys: null })
  const audioPathsRef = useRef({ hasMic: false, hasSys: false })
  const streamSpecsRef = useRef([])
  const lastTranscribeFingerprint = useRef('')

  const streamBufRef = useRef('')
  const streamRafRef = useRef(null)
  /** Matches the in-flight ask so the assistant/error bubble carries the same source label as the strip. */
  const activeTurnMetaRef = useRef(null)
  const [activeAskSource, setActiveAskSource] = useState(null)

  const scrollBottom = useCallback(() => {
    requestAnimationFrame(() =>
      panelRef.current?.scrollTo({ top: panelRef.current.scrollHeight, behavior: 'smooth' }),
    )
  }, [])

  const pumpStreamBuf = useCallback(() => {
    streamRafRef.current = null
    const chunk = streamBufRef.current
    if (!chunk) return
    streamBufRef.current = ''
    setStreaming((s) => s + chunk)
    if (streamBufRef.current) {
      streamRafRef.current = requestAnimationFrame(pumpStreamBuf)
    }
  }, [])

  useEffect(() => {
    if (!ipc) return
    const cancelStreamPump = () => {
      if (streamRafRef.current != null) {
        cancelAnimationFrame(streamRafRef.current)
        streamRafRef.current = null
      }
    }

    const onStart = (_, meta) => {
      cancelStreamPump()
      streamBufRef.current = ''
      setStreaming('')
      setIsThinking(true)
      setExpanded(true)
      const askSource =
        meta && typeof meta === 'object' && typeof meta.askSource === 'string' ? meta.askSource : 'screen'
      activeTurnMetaRef.current = { askSource }
      setActiveAskSource(askSource)
      const echoRaw = meta && typeof meta === 'object' ? meta.transcriptEcho : null
      const echo = typeof echoRaw === 'string' && echoRaw.trim() ? echoRaw.trim() : ''
      if (echo) {
        setMessages((m) => [...m, { role: 'heard', text: echo, id: ++msgId.current }])
        requestAnimationFrame(() =>
          panelRef.current?.scrollTo({ top: panelRef.current.scrollHeight, behavior: 'smooth' }),
        )
      }
    }
    const onToken = (_, t) => {
      streamBufRef.current += t
      if (streamRafRef.current == null) {
        streamRafRef.current = requestAnimationFrame(pumpStreamBuf)
      }
    }
    const commit = () => {
      cancelStreamPump()
      const pending = streamBufRef.current
      streamBufRef.current = ''
      const turnMeta = activeTurnMetaRef.current
      activeTurnMetaRef.current = null
      setActiveAskSource(null)
      setStreaming((prev) => {
        const full = prev + pending
        if (full) {
          setMessages((m) => [...m, { role: 'ai', text: full, id: ++msgId.current, askSource: turnMeta?.askSource }])
          requestAnimationFrame(() =>
            panelRef.current?.scrollTo({ top: panelRef.current.scrollHeight, behavior: 'smooth' }),
          )
        }
        return ''
      })
    }
    const onThinking = (_, v) => {
      setIsThinking(v)
      if (!v) { commit(); ipc.invoke('session-active').then((a) => setStatus(a ? 'active' : 'idle')) }
      else setStatus('thinking')
    }
    const onAborted = () => { setIsThinking(false); commit() }
    const onError = (_, msg) => {
      cancelStreamPump()
      streamBufRef.current = ''
      setIsThinking(false)
      setStreaming('')
      const turnMeta = activeTurnMetaRef.current
      activeTurnMetaRef.current = null
      setActiveAskSource(null)
      setMessages((m) => [...m, { role: 'error', text: msg, id: ++msgId.current, askSource: turnMeta?.askSource }])
      scrollBottom()
    }
    const onClear = () => {
      cancelStreamPump()
      streamBufRef.current = ''
      activeTurnMetaRef.current = null
      setActiveAskSource(null)
      setMessages([])
      setStreaming('')
      setMicTranscript('')
      lastTranscribeFingerprint.current = ''
      setIsThinking(false)
    }
    const onTrigger = () => { setExpanded(true); handleAskRef.current?.(null) }

    ipc.on('ai-start', onStart)
    ipc.on('ai-token', onToken)
    ipc.on('ai-thinking', onThinking)
    ipc.on('ai-aborted', onAborted)
    ipc.on('ai-error', onError)
    ipc.on('clear-conversation', onClear)
    ipc.on('trigger-ask-ai', onTrigger)
    ipc.on('scroll', (_, dir) => panelRef.current?.scrollBy(0, dir * 80))

    return () => {
      cancelStreamPump()
      ;['ai-start', 'ai-token', 'ai-thinking', 'ai-aborted', 'ai-error', 'clear-conversation', 'trigger-ask-ai', 'scroll'].forEach((ch) =>
        ipc.removeAllListeners(ch),
      )
    }
  }, [scrollBottom, pumpStreamBuf])

  useEffect(() => {
    if (!ipc) return
    ipc.invoke('get-store', 'uiAccentTheme').then((id) => applyUiAccentTheme(document.documentElement, normalizeUiAccentId(id)))
    ipc.invoke('get-store', 'overlayOpacity').then((o) => o != null && setOpacity(o))
    ipc.invoke('get-store', 'overlayFontSize').then((f) => f && setFontSize(f))
    ipc.invoke('get-store', 'audioChunkSize').then((s) => {
      chunkMs.current = typeof s === 'number' && s >= 2000 ? s : 4000
    })
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
    }
    const onSessionTiming = (_, p) => {
      if (p?.audioChunkSize != null && typeof p.audioChunkSize === 'number' && p.audioChunkSize >= 2000) {
        chunkMs.current = p.audioChunkSize
      }
    }
    const onUiAccent = (_, id) => applyUiAccentTheme(document.documentElement, normalizeUiAccentId(id))
    const u1 = ipc.on('overlay-display-update', onDisplay)
    const u2 = ipc.on('session-timing-update', onSessionTiming)
    const u3 = ipc.on('ui-accent-update', onUiAccent)
    return () => {
      u1?.()
      u2?.()
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
      setSessionOn(active)
      setStatus(active ? 'active' : 'idle')
      if (active) startMic()
      else stopMic()
    }
    const unsub = ipc.on('session-status', onStatus)
    ipc.invoke('session-active').then((a) => {
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
      setMicTranscript('')
      lastTranscribeFingerprint.current = ''
    }
    const unsub = ipc.on('session-purge', onPurge)
    return () => unsub?.()
  }, [])

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
      const mic = await navigator.mediaDevices
        .getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        })
        .catch(() => null)
      let sys = null
      try {
        const sid = await ipc?.invoke('get-desktop-source-id')
        if (sid) {
          sys = await navigator.mediaDevices.getUserMedia({
            audio: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sid } },
            video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sid } },
          })
          sys.getVideoTracks().forEach((t) => t.stop())
        }
      } catch {}
      if (!mic && !sys) { emit('mic-error', { message: 'No audio' }); return }

      const ctx = new AudioContext()
      audioCtx.current = ctx
      streamRef._mic = mic
      streamRef._sys = sys
      streamRef.current = null

      const samplePack = { mic: null, sys: null }
      const specs = []

      if (mic) {
        const micDest = ctx.createMediaStreamDestination()
        const hpOut = highpassMicChain(ctx, mic, micDest)
        const a = ctx.createAnalyser()
        a.fftSize = 512
        hpOut.connect(a)
        samplePack.mic = { analyser: a, data: new Uint8Array(a.frequencyBinCount) }
        specs.push({ key: 'mic', stream: micDest.stream })
      }
      if (sys) {
        const sysDest = ctx.createMediaStreamDestination()
        const hpOut = highpassMicChain(ctx, sys, sysDest)
        const a = ctx.createAnalyser()
        a.fftSize = 512
        hpOut.connect(a)
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

      if (energyIntervalRef.current != null) clearInterval(energyIntervalRef.current)
      energyIntervalRef.current = setInterval(() => {
        const pack = energySampleRef.current
        const ce = chunkEnergyRef.current
        if (!pack || !ce.active) return
        const tick = (branch, key) => {
          if (!branch) return
          const node = pack[key]
          if (!node?.analyser) return
          node.analyser.getByteTimeDomainData(node.data)
          const rms = Math.sqrt(node.data.reduce((s, v) => s + (v - 128) ** 2, 0) / node.data.length)
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
    const recOpts = mime ? { mimeType: mime } : {}
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
        const pathOk =
          spec.key === 'mic'
            ? hasMic && pathEnergyActive(branch)
            : hasSys && pathEnergyActive(branch)
        const role = spec.key === 'mic' ? 'User' : 'Other'
        if (blob.size >= MIN_RECORDING_BYTES && pathOk) void transcribe(blob, mr.mimeType, role)
      }
      try {
        mr.start()
        recorders.push(mr)
      } catch {}
    })

    recorderRef.current = recorders.length === 1 ? recorders[0] : recorders
    if (!recorders.length && isListening.current) {
      setTimeout(() => startChunk(), chunkMs.current)
    }

    setTimeout(() => {
      recorders.forEach((r) => r.state === 'recording' && r.stop())
    }, chunkMs.current)
  }

  function stopMic() {
    isListening.current = false
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
  }

  async function transcribe(blob, mimeType, roleLabel) {
    try {
      const cfg = await ipc?.invoke('get-transcription-config')
      if (!cfg?.url || !cfg.apiKey) return

      const ext = (mimeType || '').includes('ogg') ? 'ogg' : 'webm'
      const post = (format) => {
        const fd = new FormData()
        fd.append('file', blob, `a.${ext}`)
        fd.append('model', cfg.model)
        fd.append('temperature', '0')
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
        if (!res.ok) {
          res = await post('json')
          useWhisperMeta = false
        }
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
            const gated = filterWhisperVerboseJson(j)
            text = gated.ok ? gated.text : ''
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

      const labeled = `${roleLabel}: ${text.trim()}`
      const fp = `${roleLabel}|${text.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 160)}`
      if (fp === lastTranscribeFingerprint.current) return
      lastTranscribeFingerprint.current = fp

      ipc?.invoke('session-transcript-append', labeled)
      setMicTranscript((prev) => {
        const combined = (prev + ' ' + text).trim().split(/\s+/).slice(-600).join(' ')
        emit('transcript-updated', { latest: labeled, full: combined })
        return combined
      })
    } catch {}
  }

  const handleAsk = useCallback(
    (q) => {
      if (q === '' && !micTranscript) return
      const trimmed = q?.trim() || null
      if (trimmed) {
        setMessages((m) => [...m, { role: 'user', text: trimmed, id: ++msgId.current }])
        scrollBottom()
      }
      ipc?.invoke('ask-ai-with-transcript', trimmed, micTranscript)
      setMicTranscript('')
    },
    [micTranscript, scrollBottom],
  )
  useEffect(() => { handleAskRef.current = handleAsk }, [handleAsk])

  const hideOverlay = useCallback(() => {
    setHiding(true)
    setTimeout(() => { setHiding(false); ipc?.send('overlay-hide') }, 220)
  }, [])

  const onResizeEnd = useCallback((b) => {
    expandedSize.current = { w: b.width, h: b.height }
  }, [])

  return (
    <div
      className="relative flex h-full w-full flex-col"
      style={{
        opacity: hiding ? 0 : 1,
        transform: hiding ? 'translateY(-8px) scale(0.98)' : 'translateY(0) scale(1)',
        transition: hiding ? 'opacity 0.22s, transform 0.22s' : 'none',
      }}
    >
      <div
        className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-violet-500/35 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.12)]"
        style={{
          background: `linear-gradient(165deg, rgba(8,8,10,${opacity}) 0%, rgba(18,18,22,${opacity * 0.95}) 100%)`,
          backdropFilter: 'blur(8px)',
          boxShadow: '0 8px 32px -8px rgba(0,0,0,0.4)',
        }}
      >
        <StatusBar
          status={status}
          sessionOn={sessionOn}
          expanded={expanded}
          onToggleSession={() => ipc?.send('ui-toggle-session')}
          onOpenSettings={() => ipc?.send('open-settings')}
          onExpand={() => setExpanded(true)}
          onHide={hideOverlay}
        />

        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] bg-zinc-950/30 px-3 py-2">
          <p className="min-w-0 flex-1 text-[10px] font-medium leading-snug text-zinc-500">
            {stealthMode ? 'Hidden from screen share' : 'Visible in screen share'}
          </p>
          <div
            role="group"
            aria-label="Screen capture visibility"
            className="flex shrink-0 items-center rounded-full border border-white/[0.1] bg-[#0a0f1a] p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            style={{ WebkitAppRegion: 'no-drag' }}
          >
            <button
              type="button"
              title="Visible — may appear in screen share"
              aria-label="Visible mode"
              aria-pressed={!stealthMode}
              onClick={() => void setProtectionMode(false)}
              className={[
                'flex h-7 w-8 cursor-default items-center justify-center rounded-full transition-colors',
                !stealthMode ? 'text-white' : 'text-zinc-500/40 hover:text-zinc-400/65',
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
                'flex h-7 w-8 cursor-default items-center justify-center rounded-full transition-colors',
                stealthMode ? 'text-white' : 'text-zinc-500/40 hover:text-zinc-400/65',
              ].join(' ')}
            >
              <IncognitoGlyph />
            </button>
          </div>
        </div>

        {/* flex-1 + min-h-0: fill space under StatusBar so input bar sits at card bottom */}
        <div
          className="grid min-h-0 flex-1 w-full overflow-hidden transition-[grid-template-rows] duration-300 ease-out-expo"
          style={{ gridTemplateRows: expanded ? 'minmax(0, 1fr)' : '0fr' }}
        >
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div
              className="flex h-full min-h-0 flex-1 flex-col overflow-hidden transition-opacity duration-200 ease-out-expo"
              style={{ opacity: expanded ? 1 : 0 }}
            >
              <ResponsePanel
                ref={panelRef}
                messages={messages}
                streaming={streaming}
                isThinking={isThinking}
                fontSize={fontSize}
                activeAskSource={activeAskSource}
              />

              <div className="flex flex-shrink-0 flex-col border-t border-white/[0.08] bg-gradient-to-b from-void-950/95 to-black/50 shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.45)]">
                <InputBar onAsk={handleAsk} isThinking={isThinking} />
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

      {showAudioConsent && (
        <div
          className="pointer-events-auto fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <div className="w-full max-w-md rounded-2xl border border-indigo-500/35 bg-zinc-950 p-6 shadow-2xl">
            <p className="text-sm leading-relaxed text-zinc-200">
              You are responsible for informing all participants that AI assistance is active in this session.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAudioConsent(false)}
                className="cursor-default rounded-xl border border-zinc-600 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAudioSession}
                className="cursor-default rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                I understand, start
              </button>
            </div>
          </div>
        </div>
      )}

      {expanded && (
        <div
          className="flex flex-shrink-0 justify-start pt-1.5"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="group flex cursor-default items-center gap-2 pl-4 pr-5 py-2 rounded-full text-xs font-semibold tracking-wide
              text-rose-100
              bg-gradient-to-b from-zinc-900/95 to-black/90
              border border-rose-500/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_12px_-4px_rgba(0,0,0,0.5)]
              hover:border-rose-400/60 hover:from-zinc-800/98 hover:to-zinc-950/95 hover:text-white
              hover:shadow-[0_4px_20px_-4px_rgba(244,63,94,0.25)]
              active:scale-[0.97] transition-all duration-200 ease-spring"
          >
            <span className="inline-flex transition-transform duration-300 ease-out-expo group-hover:-translate-y-0.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </span>
            Collapse
          </button>
        </div>
      )}
    </div>
  )
}
