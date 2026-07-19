// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

/** Parse "Me: …" / "Participant: …" lines for colored overlay display. */
function parseSpeakerDisplayLine(line) {
  const t = String(line || '').trim()
  const m = t.match(/^(Me|Participant|You|They)\s*:\s*(.*)$/i)
  if (!m) return null
  const raw = m[1].toLowerCase()
  const speaker = raw === 'me' || raw === 'you' ? 'me' : 'other'
  const label = speaker === 'me' ? 'Me' : 'Participant'
  return { speaker, label, text: m[2] }
}

/** Keep Me / Participant labels (normalize legacy You / They). */
function normalizeSpeakerLine(line) {
  const parsed = parseSpeakerDisplayLine(line)
  if (parsed) return `${parsed.label}: ${parsed.text}`
  return String(line || '').trim()
}

module.exports = { parseSpeakerDisplayLine, normalizeSpeakerLine }
