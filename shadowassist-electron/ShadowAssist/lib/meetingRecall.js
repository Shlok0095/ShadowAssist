// Copyright (c) 2026 VeilAssist. All rights reserved.
// Keyword recall over saved meeting sessions — Natively meeting-summary / Hindsight subset.

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
  'what', 'when', 'where', 'who', 'why', 'how', 'which', 'that', 'this', 'these', 'those',
  'we', 'they', 'you', 'i', 'me', 'my', 'our', 'their', 'your', 'about', 'last', 'time',
  'meeting', 'discuss', 'discussed', 'said', 'mention', 'mentioned', 'before', 'previous',
])

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
}

/**
 * @param {Array<{ id: string, modeName?: string, startedAt?: number, summary?: string, transcriptPreview?: string }>} sessions
 * @param {string} query
 * @param {{ maxResults?: number }} [opts]
 */
function searchMeetingSessions(sessions, query, opts = {}) {
  const maxResults = Math.max(1, Math.min(5, opts.maxResults || 3))
  const terms = tokenize(query)
  if (!terms.length || !Array.isArray(sessions) || !sessions.length) return []

  const scored = []
  for (const s of sessions) {
    const blob = `${s.summary || ''}\n${s.transcriptPreview || ''}\n${s.modeName || ''}`.toLowerCase()
    if (!blob.trim()) continue
    let score = 0
    for (const t of terms) {
      if (blob.includes(t)) score += 1
    }
    if (score <= 0) continue
    scored.push({ session: s, score })
  }

  scored.sort((a, b) => b.score - a.score || (b.session.startedAt || 0) - (a.session.startedAt || 0))
  return scored.slice(0, maxResults).map((x) => x.session)
}

/**
 * @param {ReturnType<typeof searchMeetingSessions>} matches
 */
function formatMeetingRecallBlock(matches) {
  if (!Array.isArray(matches) || !matches.length) return ''
  const parts = matches.map((s, i) => {
    const when = s.startedAt
      ? new Date(s.startedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
      : 'unknown date'
    const summary = String(s.summary || s.transcriptPreview || '').trim().slice(0, 2000)
    return `### Past session ${i + 1} (${s.modeName || 'Session'}, ${when})\n${summary}`
  })
  return `\n\n---\n## PAST MEETINGS (recall — facts only, do not invent)\n${parts.join('\n\n')}`
}

module.exports = {
  searchMeetingSessions,
  formatMeetingRecallBlock,
  tokenize,
}
