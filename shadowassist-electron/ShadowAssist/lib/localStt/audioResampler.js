// Copyright (c) 2026 VeilAssist. All rights reserved.
// Natively audioResampler.ts — Int16LE @ any rate → Float32 @ 16 kHz (linear).

const TARGET_RATE = 16000

/**
 * @param {Buffer | Uint8Array} chunk
 * @param {number} inputSampleRate
 * @returns {Float32Array}
 */
function resampleToF32(chunk, inputSampleRate) {
  const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
  const inputSamples = Math.floor(buf.byteLength / 2)
  const input = new Float32Array(inputSamples)
  for (let i = 0; i < inputSamples; i++) {
    input[i] = buf.readInt16LE(i * 2) / 32768
  }

  if (inputSampleRate === TARGET_RATE) return input

  const ratio = inputSampleRate / TARGET_RATE
  const outputLength = Math.max(1, Math.round(inputSamples / ratio))
  const output = new Float32Array(outputLength)

  for (let i = 0; i < outputLength; i++) {
    const srcPos = i * ratio
    const srcIdx = Math.floor(srcPos)
    const frac = srcPos - srcIdx
    const s0 = input[srcIdx] ?? 0
    const s1 = input[srcIdx + 1] ?? s0
    output[i] = s0 + frac * (s1 - s0)
  }

  return output
}

module.exports = { resampleToF32, TARGET_RATE }
