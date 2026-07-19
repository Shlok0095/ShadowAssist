// Copyright (c) 2026 VeilAssist. All rights reserved.
// Natively RestSTT pattern — buffer PCM, flush on speech_ended, one transcribe per utterance.

const { filterTranscript } = require('./hallucinationFilter')

const MIN_BUFFER_BYTES = 4000 // ~125 ms @ 16 kHz mono int16 (Natively RestSTT)
const SAFETY_NET_INTERVAL_MS = 10000
const SILENCE_RMS_THRESHOLD = 50

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

class LocalPcmBuffer {
  /**
   * @param {'mic'|'sys'} channel
   * @param {(pcm: Buffer) => Promise<string>} transcribeFn
   * @param {(text: string) => void} onFinal
   */
  constructor(channel, transcribeFn, onFinal) {
    this.channel = channel
    this.transcribeFn = transcribeFn
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
      void this.flushAndTranscribe()
    }, SAFETY_NET_INTERVAL_MS)
  }

  stop() {
    if (!this.active) return
    if (this.safetyNetTimer) {
      clearInterval(this.safetyNetTimer)
      this.safetyNetTimer = null
    }
    this.active = false
    void this.flushAndTranscribe(true)
  }

  /** @param {Buffer} audioData */
  write(audioData) {
    if (!this.active || !audioData?.byteLength) return
    this.chunks.push(audioData)
    this.totalBufferedBytes += audioData.length
  }

  /** Natively: native SilenceSuppressor → RestSTT.notifySpeechEnded() */
  notifySpeechEnded() {
    if (!this.active) return
    void this.flushAndTranscribe()
  }

  finalize() {
    if (!this.active) return
    void this.flushAndTranscribe()
  }

  async flushAndTranscribe(force = false) {
    if (!force && !this.active) return
    if (this.chunks.length === 0 || this.totalBufferedBytes < MIN_BUFFER_BYTES) return

    if (this.isUploading) {
      this.flushPending = true
      return
    }

    if (this.safetyNetTimer && this.active) {
      clearInterval(this.safetyNetTimer)
      this.safetyNetTimer = setInterval(() => {
        void this.flushAndTranscribe()
      }, SAFETY_NET_INTERVAL_MS)
    }

    const currentChunks = this.chunks
    this.chunks = []
    this.totalBufferedBytes = 0

    const rawPcm = Buffer.concat(currentChunks)
    if (isSilent(rawPcm)) return

    this.isUploading = true
    try {
      const raw = await this.transcribeFn(rawPcm)
      const text = filterTranscript(String(raw || '').trim())
      if (text) this.onFinal(text)
    } catch (err) {
      console.warn(`[localStt:${this.channel}] transcribe failed:`, err?.message || err)
    } finally {
      this.isUploading = false
      if (this.flushPending) {
        this.flushPending = false
        void this.flushAndTranscribe()
      }
    }
  }
}

module.exports = { LocalPcmBuffer, MIN_BUFFER_BYTES }
