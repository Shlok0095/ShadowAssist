// Copyright (c) 2026 VeilAssist. All rights reserved.
// Phase 10 — optional phone mic → STT (additive; desktop mic unchanged).

const { LocalPcmBuffer } = require('./localStt/localPcmBuffer')
const { getTranscriptionRequestConfig } = require('./transcriptionRouting')
const localStt = require('./localStt')
const { filterTranscript } = require('./localStt/hallucinationFilter')

const SAMPLE_RATE = 16000

function addWavHeader(samples, sampleRate = SAMPLE_RATE) {
  const buffer = Buffer.alloc(44 + samples.length)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + samples.length, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(2, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(samples.length, 40)
  samples.copy(buffer, 44)
  return buffer
}

async function uploadCloudWav(cfg, wavBuffer) {
  const form = new FormData()
  form.append('file', new Blob([wavBuffer], { type: 'audio/wav' }), 'phone.wav')
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

/**
 * @param {object} deps
 * @param {(key: string) => any} deps.storeGet
 * @param {(text: string) => void} deps.onTranscript
 * @param {() => boolean} deps.isActive
 */
function createPhoneLinkMicIngest({ storeGet, onTranscript, isActive }) {
  /** @type {import('./localStt/localPcmBuffer').LocalPcmBuffer | null} */
  let buffer = null

  async function transcribePcm(rawPcm) {
    const sttMode = storeGet('sttMode') === 'cloud' ? 'cloud' : 'local'
    if (sttMode === 'cloud') {
      const cfg = getTranscriptionRequestConfig(storeGet)
      if (!cfg?.apiKey || !cfg?.url) return ''
      const wav = addWavHeader(rawPcm, SAMPLE_RATE)
      const text = await uploadCloudWav(cfg, wav)
      return filterTranscript(String(text || '').trim()) || ''
    }
    const lang = storeGet('micListenLanguage') || 'en'
    const out = await localStt.feedPcm('mic', rawPcm, lang)
    return filterTranscript(String(out?.text || '').trim()) || ''
  }

  function ensureBuffer() {
    if (buffer) return buffer
    buffer = new LocalPcmBuffer('mic', transcribePcm, (text) => {
      if (text) onTranscript(text)
    })
    return buffer
  }

  function write(pcm) {
    if (!isActive()) return
    const buf = Buffer.isBuffer(pcm) ? pcm : Buffer.from(pcm)
    if (!buf.byteLength) return
    ensureBuffer().start()
    ensureBuffer().write(buf)
  }

  function notifySpeechEnded() {
    if (!isActive()) return
    buffer?.notifySpeechEnded()
  }

  function stop() {
    buffer?.stop()
    buffer = null
  }

  return { write, notifySpeechEnded, stop }
}

module.exports = { createPhoneLinkMicIngest }
