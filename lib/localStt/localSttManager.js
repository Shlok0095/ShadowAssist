// Copyright (c) 2026 VeilAssist. All rights reserved.
// Natively LocalWhisperSTT — Moonshine streams fast; optional Whisper gate (off by default).

const { resolveLocalModel, resolveGateModel, SAMPLE_RATE } = require('./modelConfig')
const { filterTranscript } = require('./hallucinationFilter')
const { filterMoonshineOutput, gateMoonshineText } = require('./localWhisperGate')
const { MIN_PCM_BYTES } = require('./pcmUtils')
const { StreamingSession } = require('./streamingSession')
const workerClient = require('./inferenceWorkerClient')

let engineReady = false
let currentModelKey = null
/** @type {() => boolean} */
let whisperGateEnabled = () => false

/** @type {{ mic?: StreamingSession, sys?: StreamingSession }} */
const sessions = {}

/** @type {((evt: { channel: string, text: string, isFinal: boolean }) => void) | null} */
let transcriptCallback = null
let listenLanguage = 'en'
/** @type {() => string} */
let modelPreferenceGetter = () => 'auto'

function setModelPreferenceGetter(fn) {
  modelPreferenceGetter = typeof fn === 'function' ? fn : () => 'auto'
}

function currentModelPreference() {
  try {
    return String(modelPreferenceGetter() || 'auto').trim() || 'auto'
  } catch {
    return 'auto'
  }
}

function setWhisperGateEnabled(fn) {
  whisperGateEnabled = typeof fn === 'function' ? fn : () => false
}

function shouldUseWhisperGate(micListenLanguage) {
  if (!whisperGateEnabled()) return false
  return !!resolveGateModel(micListenLanguage)
}

function setTranscriptCallback(cb) {
  transcriptCallback = typeof cb === 'function' ? cb : null
}

function emitTranscript(channel, text, isFinal, meta = {}) {
  if (transcriptCallback && text) {
    transcriptCallback({ channel, text, isFinal: !!isFinal, ...meta })
  }
}

async function prepare(micListenLanguage) {
  const spec = resolveLocalModel(micListenLanguage, currentModelPreference())
  const gate = shouldUseWhisperGate(micListenLanguage) ? resolveGateModel(micListenLanguage) : null
  const modelKey = gate
    ? `${spec.modelId}:${spec.language}+${gate.modelId}:gate`
    : `${spec.modelId}:${spec.language}`

  if (engineReady && currentModelKey === modelKey) {
    return { ok: true, modelId: spec.modelId, family: spec.family }
  }

  try {
    await workerClient.prepare(spec.modelId)
    if (gate) await workerClient.prepare(gate.modelId)
    engineReady = true
    currentModelKey = modelKey
    return { ok: true, modelId: spec.modelId, family: spec.family }
  } catch (e) {
    engineReady = false
    currentModelKey = null
    throw e
  }
}

function makeTranscribeFn(spec) {
  return async (pcm, { partial = false } = {}) => {
    await prepare(listenLanguage)
    const raw = await workerClient.transcribePcm(spec.modelId, pcm, {
      sampleRate: SAMPLE_RATE,
      language: spec.language,
      family: spec.family,
      partial,
    })
    return String(raw || '').trim()
  }
}

const MIN_GATE_PCM_BYTES = 4800 * 2

async function runMoonshineGate(moonshineText, pcm, channel = 'mic') {
  const moonOnly = filterMoonshineOutput(moonshineText)
  if (!moonOnly) return null

  const gate = resolveGateModel(listenLanguage)
  if (!gate || !whisperGateEnabled()) return moonOnly

  const buf = Buffer.isBuffer(pcm) ? pcm : Buffer.from(pcm)
  if (buf.byteLength < MIN_GATE_PCM_BYTES) return moonOnly

  const pathKind = channel === 'sys' ? 'sys' : 'mic'
  try {
    const payload = await workerClient.transcribePcm(gate.modelId, buf, {
      sampleRate: SAMPLE_RATE,
      language: gate.language,
      family: gate.family,
      partial: false,
      gate: true,
    })
    return gateMoonshineText(moonshineText, payload, pathKind)
  } catch (err) {
    console.warn('[localStt:gate] whisper pass failed:', err?.message || err)
    return moonOnly
  }
}

function ensureSession(channel) {
  const ch = channel === 'sys' ? 'sys' : 'mic'
  if (sessions[ch]) return sessions[ch]

  const spec = resolveLocalModel(listenLanguage)
  const useGate = spec.family === 'moonshine' && shouldUseWhisperGate(listenLanguage)

  const session = new StreamingSession({
    channel: ch,
    spec,
    transcribeFn: makeTranscribeFn(spec),
    gateFinalFn: useGate
      ? async (moonText, pcm, chan) => runMoonshineGate(moonText, pcm, chan)
      : async (moonText) => filterMoonshineOutput(moonText),
    onPartial: (text) => emitTranscript(ch, text, false),
    onFinal: (text, meta) => emitTranscript(ch, text, true, meta),
  })
  sessions[ch] = session
  return session
}

async function startListening(micListenLanguage) {
  listenLanguage = micListenLanguage || 'en'
  await prepare(listenLanguage)
  ensureSession('mic').start()
  return { ok: true }
}

function writeChunk(channel, pcm, sampleRate) {
  const buf = Buffer.isBuffer(pcm) ? pcm : Buffer.from(pcm)
  if (!buf.byteLength) return
  const ch = channel === 'sys' ? 'sys' : 'mic'
  const session = ensureSession(ch)
  if (!session.active) session.start()
  session.writePcm(buf, sampleRate)
}

function notifySpeechEnded(channel) {
  const ch = channel === 'sys' ? 'sys' : 'mic'
  const session = sessions[ch]
  if (session?.active) session.notifySpeechEnded()
}

async function flushChannel(channel) {
  const ch = channel === 'sys' ? 'sys' : 'mic'
  const session = sessions[ch]
  if (session?.active) await session.flushAndDrain()
  return { ok: true }
}

function stopListening() {
  for (const key of Object.keys(sessions)) {
    try {
      sessions[key]?.stop()
    } catch (_) {}
    delete sessions[key]
  }
}

async function stopListeningAndDrain() {
  const keys = Object.keys(sessions)
  const tasks = keys.map((key) => {
    const session = sessions[key]
    delete sessions[key]
    return session?.stopAndDrain?.() ?? session?.stop?.()
  })
  if (tasks.length) await Promise.allSettled(tasks)
}

async function feedPcm(channel, pcm, micListenLanguage) {
  const bufData = Buffer.isBuffer(pcm) ? pcm : Buffer.from(pcm)
  if (bufData.byteLength < MIN_PCM_BYTES) return { ok: true, text: null, channel }

  const spec = resolveLocalModel(micListenLanguage)
  const ch = channel === 'sys' ? 'sys' : 'mic'

  try {
    await prepare(micListenLanguage)
    listenLanguage = micListenLanguage || 'en'
    const raw = await workerClient.transcribePcm(spec.modelId, bufData, {
      sampleRate: SAMPLE_RATE,
      language: spec.language,
      family: spec.family,
      partial: false,
    })
    let text = filterTranscript(String(raw || '').trim())
    if (text && spec.family === 'moonshine' && shouldUseWhisperGate(micListenLanguage)) {
      text = await runMoonshineGate(text, bufData, ch)
    } else if (text) {
      text = filterMoonshineOutput(text)
    }
    return { ok: true, text, channel: ch }
  } catch (err) {
    console.warn('[localStt] feed failed:', err?.message || err)
    return { ok: false, text: null, channel: ch, error: err?.message || String(err) }
  }
}

function shutdown() {
  stopListening()
  workerClient.shutdown()
  engineReady = false
  currentModelKey = null
  transcriptCallback = null
}

function getStatus() {
  return {
    ready: engineReady,
    modelKey: currentModelKey,
    whisperGate: whisperGateEnabled(),
    listening: {
      mic: !!sessions.mic?.active,
      sys: !!sessions.sys?.active,
    },
  }
}

function setStatusCallback(_cb) {
  /* no-op */
}

const startStreaming = startListening
const stopStreaming = stopListening
const feedStreamingPcm = (channel, pcm, lang, sampleRate) => {
  listenLanguage = lang || listenLanguage
  writeChunk(channel, pcm, sampleRate)
  return { ok: true, channel }
}

module.exports = {
  prepare,
  feedPcm,
  startListening,
  stopListening,
  stopListeningAndDrain,
  writeChunk,
  notifySpeechEnded,
  flushChannel,
  startStreaming,
  stopStreaming,
  feedStreamingPcm,
  setTranscriptCallback,
  setWhisperGateEnabled,
  setModelPreferenceGetter,
  shutdown,
  getStatus,
  setStatusCallback,
  resolveLocalModel,
  resolveGateModel,
}
