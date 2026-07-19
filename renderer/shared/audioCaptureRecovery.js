// Copyright (c) 2026 VeilAssist. All rights reserved.
// Natively MicRecovery / AudioRecovery — up to 3 attempts, 1.5 s between.

export const CAPTURE_RECOVERY_MAX_ATTEMPTS = 3
export const CAPTURE_RECOVERY_DELAY_MS = 1500

/**
 * @param {MediaStreamTrack | null | undefined} track
 * @param {() => void} onRecover
 * @returns {() => void}
 */
export function watchMediaTrack(track, onRecover) {
  if (!track || typeof onRecover !== 'function') return () => {}
  const fire = () => onRecover()
  // Natively: recover on track ended only — mute fires on BT/HFP glitches and kills listen.
  track.addEventListener('ended', fire)
  return () => {
    track.removeEventListener('ended', fire)
  }
}

/**
 * @param {MediaStream | null | undefined} stream
 * @param {() => void} onRecover
 * @returns {() => void}
 */
export function watchMediaStream(stream, onRecover) {
  if (!stream?.getTracks) return () => {}
  const unsubs = stream.getTracks().map((t) => watchMediaTrack(t, onRecover))
  return () => unsubs.forEach((u) => u())
}

/** True when at least one capture track is still live (not ended). */
export function areCaptureTracksLive(streams) {
  const list = Array.isArray(streams) ? streams : [streams]
  for (const stream of list) {
    const tracks = stream?.getTracks?.() || []
    if (tracks.some((t) => t.readyState === 'live')) return true
  }
  return false
}

/** True when every expected capture path still has a live track. */
export function areRequiredCapturePathsLive(streamsByKey, { hasMic = false, hasSys = false } = {}) {
  const micOk = !hasMic || areCaptureTracksLive(streamsByKey.mic)
  const sysOk = !hasSys || areCaptureTracksLive(streamsByKey.sys)
  return micOk && sysOk
}
