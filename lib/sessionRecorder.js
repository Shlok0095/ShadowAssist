// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Full-session capture for meeting notes (separate from short-lived sessionMemory).

const MAX_TRANSCRIPT_LINES = 800
const MAX_EXCHANGES = 40

/** @type {SessionSnapshot | null} */
let active = null

/**
 * @typedef {{ at: number, text: string }} TranscriptLine
 * @typedef {{ at: number, question: string, answer: string }} Exchange
 * @typedef {{
 *   id: string,
 *   startedAt: number,
 *   endedAt?: number,
 *   modeName: string,
 *   notesSectionTitles: string[],
 *   transcriptLines: TranscriptLine[],
 *   exchanges: Exchange[],
 * }} SessionSnapshot
 */

function begin({ modeName = 'Session', notesSectionTitles = [] } = {}) {
  active = {
    id: `ms-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    startedAt: Date.now(),
    modeName: String(modeName || 'Session').slice(0, 64),
    notesSectionTitles: Array.isArray(notesSectionTitles)
      ? notesSectionTitles.map((s) => String(s).slice(0, 80)).filter(Boolean).slice(0, 12)
      : [],
    transcriptLines: [],
    exchanges: [],
  }
  return active.id
}

function isActive() {
  return !!active
}

function appendTranscript(text) {
  if (!active) return
  const t = String(text || '').trim()
  if (!t) return
  active.transcriptLines.push({ at: Date.now(), text: t.slice(0, 2000) })
  if (active.transcriptLines.length > MAX_TRANSCRIPT_LINES) {
    active.transcriptLines = active.transcriptLines.slice(-MAX_TRANSCRIPT_LINES)
  }
}

function recordExchange(question, answer) {
  if (!active) return
  const a = String(answer || '').trim()
  if (!a) return
  active.exchanges.push({
    at: Date.now(),
    question: String(question || 'Assist').trim().slice(0, 2000),
    answer: a.slice(0, 16000),
  })
  if (active.exchanges.length > MAX_EXCHANGES) {
    active.exchanges = active.exchanges.slice(-MAX_EXCHANGES)
  }
}

function hasContent(snap) {
  if (!snap) return false
  return snap.transcriptLines.length > 0 || snap.exchanges.length > 0
}

/** @returns {SessionSnapshot | null} */
function end() {
  const snap = active
  active = null
  if (!snap) return null
  snap.endedAt = Date.now()
  return snap
}

function cancel() {
  active = null
}

function recentTranscriptText(maxLines = 35) {
  if (!active) return ''
  return active.transcriptLines
    .slice(-Math.max(1, maxLines))
    .map((l) => l.text)
    .join('\n')
}

module.exports = {
  begin,
  isActive,
  appendTranscript,
  recordExchange,
  hasContent,
  end,
  cancel,
  recentTranscriptText,
}
