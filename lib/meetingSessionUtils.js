// Copyright (c) 2026 VeilAssist. All rights reserved.
// Phase 4 — parse transcript lines, summary sections, speaker display labels.

const MAX_STORED_TRANSCRIPT_LINES = 400
const MAX_STORED_EXCHANGES = 40

const DEFAULT_SPEAKER_LABELS = { me: 'Me', other: 'Participant' }

/**
 * @param {string} text
 * @returns {{ speaker: string, text: string }}
 */
function parseLabeledTranscriptText(text) {
  const raw = String(text || '').trim()
  if (!raw) return { speaker: 'unknown', text: '' }
  const m = raw.match(/^(Me|Participant|Speaker\s*\d+):\s*(.*)$/is)
  if (m) {
    const tag = m[1].toLowerCase()
    const speaker = tag === 'me' ? 'me' : 'other'
    return { speaker, text: String(m[2] || '').trim() }
  }
  return { speaker: 'unknown', text: raw }
}

/**
 * @param {import('./sessionRecorder').SessionSnapshot['transcriptLines']} lines
 * @returns {{ at: number, speaker: string, text: string }[]}
 */
function normalizeTranscriptLinesForSave(lines) {
  if (!Array.isArray(lines)) return []
  return lines
    .slice(-MAX_STORED_TRANSCRIPT_LINES)
    .map((line) => {
      const parsed = parseLabeledTranscriptText(line?.text)
      return {
        at: Number(line?.at) || Date.now(),
        speaker: parsed.speaker,
        text: parsed.text.slice(0, 2000),
      }
    })
    .filter((l) => l.text)
}

/**
 * @param {import('./sessionRecorder').SessionSnapshot['exchanges']} exchanges
 */
function normalizeExchangesForSave(exchanges) {
  if (!Array.isArray(exchanges)) return []
  return exchanges.slice(-MAX_STORED_EXCHANGES).map((e) => ({
    at: Number(e?.at) || Date.now(),
    question: String(e?.question || '').slice(0, 2000),
    answer: String(e?.answer || '').slice(0, 8000),
  }))
}

/**
 * @param {Record<string, string> | null | undefined} labels
 */
function resolveSpeakerLabel(speaker, labels) {
  const map = { ...DEFAULT_SPEAKER_LABELS, ...(labels || {}) }
  if (speaker === 'me') return map.me || DEFAULT_SPEAKER_LABELS.me
  if (speaker === 'other') return map.other || DEFAULT_SPEAKER_LABELS.other
  return map[speaker] || 'Speaker'
}

/**
 * @param {{ at: number, speaker?: string, text: string }} line
 * @param {Record<string, string>} labels
 */
function formatStoredTranscriptLine(line, labels) {
  const tag = resolveSpeakerLabel(line.speaker || 'unknown', labels)
  const ts = line.at ? new Date(line.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
  return ts ? `[${ts}] ${tag}: ${line.text}` : `${tag}: ${line.text}`
}

/**
 * Extract bullet lines under a markdown ## heading (case-insensitive).
 * @param {string} summary
 * @param {string} heading
 * @returns {string[]}
 */
function extractSummaryBullets(summary, heading) {
  const text = String(summary || '')
  const re = new RegExp(`^##\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'im')
  const match = text.match(re)
  if (!match || match.index == null) return []
  const start = match.index + match[0].length
  const rest = text.slice(start)
  const nextHeading = rest.search(/^##\s/m)
  const section = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest
  return section
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^[-*]\s+/.test(l))
    .map((l) => l.replace(/^[-*]\s+/, '').trim())
    .filter(Boolean)
}

/**
 * @param {string} summary
 */
function extractActionItems(summary) {
  for (const h of ['Action items', 'Action Items', 'Next steps', 'Follow-ups', 'Follow ups']) {
    const items = extractSummaryBullets(summary, h)
    if (items.length) return items
  }
  return []
}

/**
 * @param {string} summary
 */
function extractDecisions(summary) {
  for (const h of ['Decisions', 'Key decisions']) {
    const items = extractSummaryBullets(summary, h)
    if (items.length) return items
  }
  return []
}

module.exports = {
  DEFAULT_SPEAKER_LABELS,
  MAX_STORED_TRANSCRIPT_LINES,
  MAX_STORED_EXCHANGES,
  parseLabeledTranscriptText,
  normalizeTranscriptLinesForSave,
  normalizeExchangesForSave,
  resolveSpeakerLabel,
  formatStoredTranscriptLine,
  extractSummaryBullets,
  extractActionItems,
  extractDecisions,
}
