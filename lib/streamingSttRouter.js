// Copyright (c) 2026 VeilAssist. All rights reserved.
// Routes main-process streaming STT — Deepgram, ElevenLabs, Azure, Google, Soniox.

const deepgramStt = require('./deepgramStt')
const elevenLabsStt = require('./elevenLabsStt')
const azureStt = require('./azureStt')
const googleStt = require('./googleStt')
const sonioxStt = require('./sonioxStt')
const nvidiaNimStt = require('./nvidiaNimStt')

const STREAMING_PROVIDERS = new Set(['deepgram', 'elevenlabs', 'azure', 'google', 'soniox', 'nvidia'])

/** @type {string | null} */
let activeProvider = null

function engineFor(prov) {
  if (prov === 'deepgram') return deepgramStt
  if (prov === 'elevenlabs') return elevenLabsStt
  if (prov === 'azure') return azureStt
  if (prov === 'google') return googleStt
  if (prov === 'soniox') return sonioxStt
  if (prov === 'nvidia') return nvidiaNimStt
  return null
}

function setStoreGetter(get) {
  deepgramStt.setStoreGetter(get)
  elevenLabsStt.setStoreGetter(get)
  azureStt.setStoreGetter(get)
  googleStt.setStoreGetter(get)
  sonioxStt.setStoreGetter(get)
  nvidiaNimStt.setStoreGetter(get)
}

function setTranscriptCallback(cb) {
  deepgramStt.setTranscriptCallback(cb)
  elevenLabsStt.setTranscriptCallback(cb)
  azureStt.setTranscriptCallback(cb)
  googleStt.setTranscriptCallback(cb)
  sonioxStt.setTranscriptCallback(cb)
  nvidiaNimStt.setTranscriptCallback(cb)
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

async function flushChannel(channel) {
  const eng = engineFor(activeProvider)
  if (!eng) return { ok: true, inactive: true }
  if (typeof eng.flushChannel === 'function') return eng.flushChannel(channel)
  eng.notifySpeechEnded?.(channel)
  await new Promise((resolve) => setTimeout(resolve, 140))
  return { ok: true, final: false, compatibilityWait: true }
}

function stopListening() {
  deepgramStt.stopListening()
  elevenLabsStt.stopListening()
  azureStt.stopListening()
  googleStt.stopListening()
  sonioxStt.stopListening()
  nvidiaNimStt.stopListening()
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
  flushChannel,
  setTranscriptCallback,
  setStoreGetter,
  isStreamingProvider,
  STREAMING_PROVIDERS,
}
