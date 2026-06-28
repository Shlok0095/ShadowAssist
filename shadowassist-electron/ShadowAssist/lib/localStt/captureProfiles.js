// Copyright (c) 2026 VeilAssist. All rights reserved.
// Mic/sys capture tuned for STT accent fidelity — aligned with Natively native capture
// (no heavy AGC stacking, light dynamics, lower VAD gates for quiet/accented speech).

/** Renderer mic path — Natively uses OS levels + Rust adaptive RMS, not browser AGC + heavy gain. */
const MIC_CAPTURE_PROFILES = {
  standard: {
    gain: 1.12,
    chunkMeanMin: 0.58,
    chunkPeakMin: 1.28,
    speechActivityRms: 0.68,
  },
  boost: {
    gain: 1.55,
    chunkMeanMin: 0.48,
    chunkPeakMin: 1.08,
    speechActivityRms: 0.58,
  },
}

/** System loopback — quieter than mic; separate gates (unchanged intent). */
const SYS_CAPTURE_PROFILES = {
  standard: {
    gain: 3.2,
    chunkMeanMin: 0.32,
    chunkPeakMin: 0.95,
    speechActivityRms: 0.5,
  },
  boost: {
    gain: 3.9,
    chunkMeanMin: 0.26,
    chunkPeakMin: 0.78,
    speechActivityRms: 0.42,
  },
}

function resolveMicCaptureProfile(raw) {
  return raw === 'boost' ? MIC_CAPTURE_PROFILES.boost : MIC_CAPTURE_PROFILES.standard
}

function resolveSysCaptureProfile(raw) {
  return raw === 'boost' ? SYS_CAPTURE_PROFILES.boost : SYS_CAPTURE_PROFILES.standard
}

module.exports = {
  MIC_CAPTURE_PROFILES,
  SYS_CAPTURE_PROFILES,
  resolveMicCaptureProfile,
  resolveSysCaptureProfile,
}
