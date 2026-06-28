// Copyright (c) 2026 VeilAssist. All rights reserved.

const SILENCE_RMS_THRESHOLD = 50
const MIN_PCM_BYTES = 3200 // ~0.1s at 16 kHz mono int16

function pcm16Rms(buffer) {
  const view = Buffer.isBuffer(buffer)
    ? new Int16Array(buffer.buffer, buffer.byteOffset, Math.floor(buffer.byteLength / 2))
    : new Int16Array(buffer)
  if (!view.length) return 0
  let sum = 0
  for (let i = 0; i < view.length; i++) sum += view[i] * view[i]
  return Math.sqrt(sum / view.length)
}

function isSilentPcm(buffer, threshold = SILENCE_RMS_THRESHOLD) {
  return pcm16Rms(buffer) < threshold
}

module.exports = {
  pcm16Rms,
  isSilentPcm,
  SILENCE_RMS_THRESHOLD,
  MIN_PCM_BYTES,
}
