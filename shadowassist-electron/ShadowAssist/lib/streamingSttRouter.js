// Copyright (c) 2026 VeilAssist. All rights reserved.
// Routes main-process streaming STT — Deepgram, ElevenLabs, Azure, Google, Soniox.

const deepgramStt = require('./deepgramStt')
const elevenLabsStt = require('./elevenLabsStt')
const azureStt = require('./azureStt')
const googleStt = require('./googleStt')
const sonioxStt = require('./sonioxStt')

const STREAMING_PROVIDERS = new Set(['deepgram', 'elevenlabs', 'azure', 'google', 'soniox'])

/** @type {string | null} */
let activeProvider = null

function engineFor(prov) {
  if (prov === 'deepgram') return deepgramStt
  if (prov === 'elevenlabs') return elevenLabsStt
  if (prov === 'azure') return azureStt
  if (prov === 'google') return googleStt
  if (prov === 'soniox') return sonioxStt
  return null
}

function setStoreGetter(get) {
  deepgramStt.setStoreGetter(get)
  elevenLabsStt.setStoreGetter(get)
  azureStt.setStoreGetter(get)
  googleStt.setStoreGetter(get)
  sonioxStt.setStoreGetter(get)
}

function setTranscriptCallback(cb) {
  deepgramStt.setTranscriptCallback(cb)
  elevenLabsStt.setTranscriptCallback(cb)
  azureStt.setTranscriptCallback(cb)
  googleStt.setTranscriptCallback(cb)
  sonioxStt.setTranscriptCallback(cb)
}

async function startListening(provider) {
  const prov = String(provider || '').trim()
  if (!STREAMING_PROVIDERS.has(prov)) {
    return { ok: false, error: `Streaming STT not configured for provider: ${prov || 'unknown'}` }
  }
  const eng = engineFor(prov)
  const res = await eng.startListening()
  if (res?.ok) activeProvider = prov
  return res
}

async function writeChunk(channel, pcm, sampleRate) {
  const eng = engineFor(activeProvider)
  if (!eng) return
  await eng.writeChunk(channel, pcm, sampleRate)
}

function notifySpeechEnded(channel) {
  const eng = engineFor(activeProvider)
  eng?.notifySpeechEnded(channel)
}

function stopListening() {
  deepgramStt.stopListening()
  elevenLabsStt.stopListening()
  azureStt.stopListening()
  googleStt.stopListening()
  sonioxStt.stopListening()
  activeProvider = null
}

function isStreamingProvider(prov) {
  return STREAMING_PROVIDERS.has(prov)
}

module.exports = {
  startListening,
  stopListening,
  writeChunk,
  notifySpeechEnded,
  setTranscriptCallback,
  setStoreGetter,
  isStreamingProvider,
  STREAMING_PROVIDERS,
}
