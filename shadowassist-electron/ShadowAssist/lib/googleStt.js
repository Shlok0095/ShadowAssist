// Copyright (c) 2026 VeilAssist. All rights reserved.
// Phase 7 — Google Cloud Speech-to-Text (REST recognize per utterance).

const { filterTranscript } = require('./localStt/hallucinationFilter')
const { resampleToF32, TARGET_RATE } = require('./localStt/audioResampler')
const { f32ToLinear16, MIN_SEND_BYTES } = require('./sttAudioUtils')

/** @type {Record<string, GoogleRestChannel>} */
const channels = {}
let transcriptCallback = null
let storeGet = null

function sttLocaleFromStore(get) {
  const raw = get('micListenLanguage')
  if (raw === 'hi') return 'hi-IN'
  if (raw === 'en_hi_hinglish') return 'en-IN'
  return get('googleSttLanguage') || 'en-US'
}

function getConfig() {
  if (!storeGet) return null
  const apiKey = storeGet('googleSttKey')
  if (!apiKey) return null
  return {
    apiKey,
    language: sttLocaleFromStore(storeGet),
  }
}

async function googleRecognize(cfg, pcm16) {
  const url = `https://speech.googleapis.com/v1/speech:recognize?key=${encodeURIComponent(cfg.apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: TARGET_RATE,
        languageCode: cfg.language || 'en-US',
        enableAutomaticPunctuation: true,
      },
      audio: { content: pcm16.toString('base64') },
    }),
  })
  if (!res.ok) throw new Error(`Google STT HTTP ${res.status}`)
  const data = await res.json()
  return String(data?.results?.[0]?.alternatives?.[0]?.transcript || '').trim()
}

class GoogleRestChannel {
  constructor(channel, onFinal) {
    this.channel = channel
    this.onFinal = onFinal
    this.chunks = []
    this.inputSampleRate = TARGET_RATE
    this.active = false
    this.uploading = false
  }

  start() {
    this.active = true
    this.chunks = []
  }

  write(pcm, sampleRate = TARGET_RATE) {
    if (!this.active || !pcm?.byteLength) return
    if (sampleRate > 0) this.inputSampleRate = sampleRate
    const f32 = resampleToF32(pcm, this.inputSampleRate)
    this.chunks.push(f32ToLinear16(f32))
  }

  async flush() {
    if (!this.active || !this.chunks.length || this.uploading) return
    const cfg = getConfig()
    if (!cfg?.apiKey) return
    const pcm = Buffer.concat(this.chunks)
    this.chunks = []
    if (pcm.length < MIN_SEND_BYTES) return
    this.uploading = true
    try {
      const text = await googleRecognize(cfg, pcm)
      const cleaned = filterTranscript(text) || ''
      if (cleaned) this.onFinal(cleaned)
    } catch (e) {
      console.warn(`[google-stt:${this.channel}]`, e?.message || e)
    } finally {
      this.uploading = false
    }
  }

  notifySpeechEnded() {
    void this.flush()
  }

  stop() {
    this.active = false
    void this.flush()
    this.chunks = []
  }
}

function ensureChannel(ch) {
  const key = ch === 'sys' ? 'sys' : 'mic'
  if (channels[key]) return channels[key]
  const inst = new GoogleRestChannel(key, (text) => {
    if (transcriptCallback) transcriptCallback({ channel: key, text, isFinal: true })
  })
  channels[key] = inst
  return inst
}

function setTranscriptCallback(cb) {
  transcriptCallback = typeof cb === 'function' ? cb : null
}

function setStoreGetter(get) {
  storeGet = typeof get === 'function' ? get : null
}

async function startListening() {
  const cfg = getConfig()
  if (!cfg?.apiKey) return { ok: false, error: 'No Google Cloud STT key configured' }
  ensureChannel('mic').start()
  return { ok: true, sttKind: 'google_rest' }
}

async function writeChunk(channel, pcm, sampleRate) {
  const buf = Buffer.isBuffer(pcm) ? pcm : Buffer.from(pcm)
  if (!buf.byteLength) return
  const ch = channel === 'sys' ? 'sys' : 'mic'
  const inst = ensureChannel(ch)
  if (!inst.active) inst.start()
  inst.write(buf, Number(sampleRate) || TARGET_RATE)
}

function notifySpeechEnded(channel) {
  const ch = channel === 'sys' ? 'sys' : 'mic'
  channels[ch]?.notifySpeechEnded()
}

function stopListening() {
  for (const key of Object.keys(channels)) {
    try {
      channels[key]?.stop()
    } catch {}
    delete channels[key]
  }
}

module.exports = {
  startListening,
  stopListening,
  writeChunk,
  notifySpeechEnded,
  setTranscriptCallback,
  setStoreGetter,
}
