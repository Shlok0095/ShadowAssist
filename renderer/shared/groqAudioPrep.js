// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Prepare MediaRecorder blobs for Groq/OpenAI Whisper: 16 kHz mono WAV (Groq-recommended).

/**
 * @param {ArrayBuffer} pcmBuffer - Int16LE mono PCM
 * @param {number} sampleRate
 * @returns {Blob}
 */
export function pcm16ToWavBlob(pcmBuffer, sampleRate = 16000) {
  const pcm = pcmBuffer instanceof ArrayBuffer ? new Int16Array(pcmBuffer) : pcmBuffer
  const dataLength = pcm.byteLength
  const header = new ArrayBuffer(44)
  const view = new DataView(header)

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, dataLength, true)

  return new Blob([header, pcm], { type: 'audio/wav' })
}

/**
 * Decode one or more encoded audio blobs, mix to mono, resample to 16 kHz, return WAV.
 * @param {Blob[]} blobs
 * @returns {Promise<Blob|null>}
 */
export async function blobsToGroqWav16k(blobs, existingCtx) {
  const list = (blobs || []).filter((b) => b && b.size > 0)
  if (!list.length) return null

  let ctx = existingCtx || null
  let owned = false
  if (!ctx) {
    try {
      ctx = new AudioContext()
      owned = true
    } catch {
      return null
    }
  }

  try {
    const decoded = []
    for (const blob of list) {
      const ab = await blob.arrayBuffer()
      if (!ab.byteLength) continue
      try {
        decoded.push(await ctx.decodeAudioData(ab.slice(0)))
      } catch {
        /* skip corrupt slice */
      }
    }
    if (!decoded.length) return null

    const targetRate = 16000
    const totalDuration = decoded.reduce((s, b) => s + b.duration, 0)
    if (totalDuration < 0.05) return null

    const offline = new OfflineAudioContext(
      1,
      Math.max(1, Math.ceil(totalDuration * targetRate)),
      targetRate,
    )

    let offsetSec = 0
    for (const buf of decoded) {
      const mono = offline.createBuffer(1, buf.length, buf.sampleRate)
      const out = mono.getChannelData(0)
      const nCh = buf.numberOfChannels
      if (nCh === 1) {
        out.set(buf.getChannelData(0))
      } else {
        for (let i = 0; i < buf.length; i++) {
          let sum = 0
          for (let c = 0; c < nCh; c++) sum += buf.getChannelData(c)[i]
          out[i] = sum / nCh
        }
      }
      const src = offline.createBufferSource()
      src.buffer = mono
      src.connect(offline.destination)
      src.start(offsetSec)
      offsetSec += buf.duration
    }

    const rendered = await offline.startRendering()
    const floats = rendered.getChannelData(0)
    const pcm = new Int16Array(floats.length)
    for (let i = 0; i < floats.length; i++) {
      const s = Math.max(-1, Math.min(1, floats[i]))
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return pcm16ToWavBlob(pcm.buffer, targetRate)
  } finally {
    if (owned) {
      try {
        await ctx.close()
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * Decode encoded blobs → 16 kHz mono Int16LE ArrayBuffer (for local ONNX STT).
 * @param {Blob[]} blobs
 * @returns {Promise<ArrayBuffer|null>}
 */
export async function blobsToPcm16kMono(blobs, existingCtx) {
  const wav = await blobsToGroqWav16k(blobs, existingCtx)
  if (!wav || wav.size < 48) return null
  const ab = await wav.arrayBuffer()
  if (ab.byteLength <= 44) return null
  return ab.slice(44)
}
