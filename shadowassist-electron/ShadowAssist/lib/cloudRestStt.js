// Copyright (c) 2026 VeilAssist. All rights reserved.
// Natively RestSTT — buffer 16 kHz PCM, flush on speech_ended + 10 s safety net.

const { getTranscriptionRequestConfig } = require('./transcriptionRouting')
const { filterTranscript } = require('./localStt/hallucinationFilter')
const nvidiaNimStt = require('./nvidiaNimStt')

const MIN_BUFFER_BYTES = 4000
const SAFETY_NET_INTERVAL_MS = 10000
const SILENCE_RMS_THRESHOLD = 50
const SAMPLE_RATE = 16000

function pcmRms(pcmBuffer) {
  let sum = 0
  let count = 0
  const step = 20
  for (let i = 0; i < pcmBuffer.length - 1; i += 2 * step) {
    const sample = pcmBuffer.readInt16LE(i)
    sum += sample * sample
    count += 1
  }
  if (!count) return 0
  return Math.sqrt(sum / count)
}

function isSilent(pcmBuffer) {
  return pcmRms(pcmBuffer) < SILENCE_RMS_THRESHOLD
}

function addWavHeader(samples, sampleRate = SAMPLE_RATE, channels = 1, bitsPerSample = 16) {
  const buffer = Buffer.alloc(44 + samples.length)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + samples.length, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(channels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28)
  buffer.writeUInt16LE(channels * (bitsPerSample / 8), 32)
  buffer.writeUInt16LE(bitsPerSample, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(samples.length, 40)
  samples.copy(buffer, 44)
  return buffer
}

class RestSttChannel {
  /**
   * @param {'mic'|'sys'} channel
   * @param {() => object | null} getConfig
   * @param {(text: string) => void} onFinal
   */
  constructor(channel, getConfig, onFinal) {
    this.channel = channel
    this.getConfig = getConfig
    this.onFinal = onFinal
    this.chunks = []
    this.totalBufferedBytes = 0
    this.safetyNetTimer = null
    this.active = false
    this.isUploading = false
    this.flushPending = false
  }

  start() {
    if (this.active) return
    this.active = true
    this.chunks = []
    this.totalBufferedBytes = 0
    this.safetyNetTimer = setInterval(() => {
      void this.flushAndUpload()
    }, SAFETY_NET_INTERVAL_MS)
  }

  stop() {
    if (!this.active) return
    if (this.safetyNetTimer) {
      clearInterval(this.safetyNetTimer)
      this.safetyNetTimer = null
    }
    this.active = false
    void this.flushAndUpload(true)
  }

  /** @param {Buffer} audioData */
  write(audioData) {
    if (!this.active || !audioData?.byteLength) return
    this.chunks.push(audioData)
    this.totalBufferedBytes += audioData.length
  }

  notifySpeechEnded() {
    if (!this.active) return
    void this.flushAndUpload()
  }

  async flushAndUpload(force = false) {
    if (!force && !this.active) return
    if (this.chunks.length === 0 || this.totalBufferedBytes < MIN_BUFFER_BYTES) return

    if (this.isUploading) {
      this.flushPending = true
      return
    }

    if (this.safetyNetTimer && this.active) {
      clearInterval(this.safetyNetTimer)
      this.safetyNetTimer = setInterval(() => {
        void this.flushAndUpload()
      }, SAFETY_NET_INTERVAL_MS)
    }

    const rawPcm = Buffer.concat(this.chunks)
    this.chunks = []
    this.totalBufferedBytes = 0

    if (isSilent(rawPcm)) return

    const cfg = this.getConfig()
    if (!cfg?.apiKey) return
    if (cfg.sttKind !== 'nvidia_nim' && !cfg?.url) return

    const wavBuffer = addWavHeader(rawPcm, SAMPLE_RATE)
    this.isUploading = true
    try {
      const text = await uploadWav(cfg, wavBuffer)
      const trimmed = filterTranscript(String(text || '').trim()) || ''
      if (trimmed) this.onFinal(trimmed)
    } catch (err) {
      console.warn(`[RestSTT:${this.channel}] upload failed:`, err?.message || err)
    } finally {
      this.isUploading = false
      if (this.flushPending) {
        this.flushPending = false
        void this.flushAndUpload()
      }
    }
  }
}

async function uploadWav(cfg, wavBuffer) {
  if (cfg?.sttKind === 'nvidia_nim') {
    const text = await nvidiaNimStt.transcribeWav({
      wavBuffer,
      apiKey: cfg.apiKey,
      languageCode: cfg.languageCode || 'multi',
      functionId: cfg.nvcfFunctionId,
    })
    return text
  }

  const form = new FormData()
  form.append('file', new Blob([wavBuffer], { type: 'audio/wav' }), 'audio.wav')
  form.append('model', cfg.model)
  form.append('temperature', '0')
  form.append('response_format', 'json')
  if (cfg.language) form.append('language', cfg.language)
  if (cfg.prompt) form.append('prompt', cfg.prompt)

  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
    body: form,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json()
  if (typeof data === 'string') return data
  return data?.text ?? ''
}

/** @type {{ mic?: RestSttChannel, sys?: RestSttChannel }} */
const channels = {}
/** @type {((evt: { channel: string, text: string, isFinal: boolean }) => void) | null} */
let transcriptCallback = null
/** @type {((key: string) => any) | null} */
let storeGet = null

function setTranscriptCallback(cb) {
  transcriptCallback = typeof cb === 'function' ? cb : null
}

function setStoreGetter(get) {
  storeGet = typeof get === 'function' ? get : null
}

function getConfig() {
  if (!storeGet) return null
  return getTranscriptionRequestConfig(storeGet)
}

function ensureChannel(ch) {
  const key = ch === 'sys' ? 'sys' : 'mic'
  if (channels[key]) return channels[key]
  const inst = new RestSttChannel(key, getConfig, (text) => {
    if (transcriptCallback) transcriptCallback({ channel: key, text, isFinal: true })
  })
  channels[key] = inst
  return inst
}

function startListening() {
  const cfg = getConfig()
  if (!cfg?.apiKey) {
    return { ok: false, error: 'No cloud STT API key configured' }
  }
  for (const ch of ['mic', 'sys']) {
    ensureChannel(ch).start()
  }
  return { ok: true }
}

function writeChunk(channel, pcm) {
  const buf = Buffer.isBuffer(pcm) ? pcm : Buffer.from(pcm)
  if (!buf.byteLength) return
  const ch = channel === 'sys' ? 'sys' : 'mic'
  const inst = ensureChannel(ch)
  if (!inst.active) inst.start()
  inst.write(buf)
}

function notifySpeechEnded(channel) {
  const ch = channel === 'sys' ? 'sys' : 'mic'
  channels[ch]?.notifySpeechEnded()
}

function stopListening() {
  for (const key of Object.keys(channels)) {
    try {
      channels[key]?.stop()
    } catch (_) {}
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
