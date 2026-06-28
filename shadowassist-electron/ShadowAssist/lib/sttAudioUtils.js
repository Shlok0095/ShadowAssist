// Copyright (c) 2026 VeilAssist. All rights reserved.
// Shared PCM helpers for cloud STT engines.

const { TARGET_RATE } = require('./localStt/audioResampler')

const MIN_SEND_BYTES = 3200

function f32ToLinear16(f32) {
  const out = Buffer.alloc(f32.length * 2)
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]))
    out.writeInt16LE(s < 0 ? s * 0x8000 : s * 0x7fff, i * 2)
  }
  return out
}

function addWavHeader(samples, sampleRate = TARGET_RATE) {
  const buffer = Buffer.alloc(44 + samples.length)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + samples.length, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(samples.length, 40)
  samples.copy(buffer, 44)
  return buffer
}

module.exports = { addWavHeader, f32ToLinear16, MIN_SEND_BYTES, TARGET_RATE }
