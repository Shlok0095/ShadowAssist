// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

/** In-memory session buffers only — never persisted to disk or electron-store. */
const MAX_TRANSCRIPT_SEGMENTS = 15
const MAX_OCR_SNAPSHOTS = 8
const INACTIVITY_MS = 45 * 60 * 1000

let transcriptSegments = []
let ocrSnapshots = []
let lastActivity = Date.now()
/** Updated only when a real transcript segment is appended (not OCR). */
let lastTranscriptAt = 0
let inactivityTimer = null

function touch() {
  lastActivity = Date.now()
}

function appendTranscriptSegment(text) {
  const t = (text || '').trim()
  if (!t) return
  touch()
  lastTranscriptAt = Date.now()
  transcriptSegments.push(t)
  if (transcriptSegments.length > MAX_TRANSCRIPT_SEGMENTS) {
    transcriptSegments = transcriptSegments.slice(-MAX_TRANSCRIPT_SEGMENTS)
  }
}

function addOcrSnapshot(text) {
  const t = (text || '').trim()
  if (!t) return
  touch()
  ocrSnapshots.push(t)
  if (ocrSnapshots.length > MAX_OCR_SNAPSHOTS) {
    ocrSnapshots = ocrSnapshots.slice(-MAX_OCR_SNAPSHOTS)
  }
}

function getTranscriptText() {
  return transcriptSegments.join(' ').trim()
}

/** For Ask AI: omit stale speech so OCR/screen can drive answers after silence. */
function getTranscriptIfRecent(maxAgeMs) {
  if (!transcriptSegments.length) return ''
  if (Date.now() - lastTranscriptAt > maxAgeMs) return ''
  return transcriptSegments.join(' ').trim()
}

function wipe() {
  transcriptSegments = []
  ocrSnapshots = []
  lastTranscriptAt = 0
  lastActivity = Date.now()
}

function startInactivityWatcher(onTimeout) {
  stopInactivityWatcher()
  inactivityTimer = setInterval(() => {
    if (Date.now() - lastActivity >= INACTIVITY_MS) {
      wipe()
      if (typeof onTimeout === 'function') onTimeout()
      lastActivity = Date.now()
    }
  }, 60 * 1000)
}

function stopInactivityWatcher() {
  if (inactivityTimer) {
    clearInterval(inactivityTimer)
    inactivityTimer = null
  }
}

module.exports = {
  appendTranscriptSegment,
  addOcrSnapshot,
  getTranscriptText,
  getTranscriptIfRecent,
  wipe,
  touch,
  startInactivityWatcher,
  stopInactivityWatcher,
  INACTIVITY_MS,
}
