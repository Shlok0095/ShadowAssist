// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Context profile tags + calendar-based retrieval hints.

const CONTEXT_TAGS = ['meeting', 'interview', 'general']
const CONTEXT_RETRIEVAL_MODES = ['auto', 'meeting', 'interview', 'general', 'all']

const INTERVIEW_HINT =
  /\b(interview|recruiter|hiring|screen(?:ing)?|technical round|behavioral|leetcode|coding interview|onsite|panel)\b/i
const MEETING_HINT =
  /\b(standup|stand-up|sync|1[:-]1|one on one|team meeting|all hands|retro|sprint|planning|kickoff|review|weekly|daily)\b/i

function inferTagFromCalendarEvent(event) {
  const text = `${event?.title || ''} ${event?.description || ''}`.trim()
  if (INTERVIEW_HINT.test(text)) return 'interview'
  if (MEETING_HINT.test(text)) return 'meeting'
  return 'meeting'
}

/**
 * Pick a tag from the next/current calendar event (±30 min before start, up to 2h after).
 * Returns null when calendar is disconnected or no event in window.
 */
async function inferContextTagFromCalendar(storeGet, storeSet, googleCalendar) {
  try {
    const status = googleCalendar.getConnectionStatus(storeGet)
    if (!status.connected) return null
    const out = await googleCalendar.listUpcomingAcceptedMeetings(storeGet, storeSet)
    const events = out?.meetings || []
    const now = Date.now()
    const beforeMs = 30 * 60 * 1000
    const afterMs = 2 * 60 * 60 * 1000
    for (const ev of events) {
      const start = new Date(ev.start).getTime()
      if (!Number.isFinite(start)) continue
      if (start - now <= beforeMs && now - start <= afterMs) {
        return inferTagFromCalendarEvent(ev)
      }
    }
  } catch (e) {
    console.warn('[context] calendar tag infer:', e?.message || e)
  }
  return null
}

function extractRetrievalQuery({ userQ, structured, transcript, cleanScreen }) {
  const q = String(userQ || '').trim()
  if (q) return q
  const s = String(structured || '')
  if (s) {
    const active = s.match(/## ACTIVE QUESTION\s*\n([\s\S]*?)(?=\n## |$)/i)
    if (active?.[1]?.trim()) return active[1].trim()
    const question = s.match(/## QUESTION\s*\n([\s\S]*?)(?=\n## |$)/i)
    if (question?.[1]?.trim()) return question[1].trim()
  }
  const t = String(transcript || '').trim()
  if (t) {
    const lines = t.split('\n').map((l) => l.trim()).filter(Boolean)
    return lines[lines.length - 1] || t.slice(-400)
  }
  const sc = String(cleanScreen || '').trim()
  if (sc) return sc.slice(0, 400)
  return ''
}

module.exports = {
  CONTEXT_TAGS,
  CONTEXT_RETRIEVAL_MODES,
  inferTagFromCalendarEvent,
  inferContextTagFromCalendar,
  extractRetrievalQuery,
}
