// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Persisted meeting session history (local only).

const {
  DEFAULT_SPEAKER_LABELS,
  normalizeTranscriptLinesForSave,
  normalizeExchangesForSave,
} = require('./meetingSessionUtils')

const MAX_STORED = 50

/**
 * @param {{ get: (k: string) => unknown, set: (k: string, v: unknown) => void }} store
 */
function createMeetingSessionsStore(store) {
  function list() {
    const raw = store.get('meetingSessions')
    return Array.isArray(raw) ? raw : []
  }

  function get(id) {
    return list().find((s) => s.id === id) || null
  }

  function writeAll(sessions) {
    store.set('meetingSessions', sessions)
  }

  /**
   * @param {import('./sessionRecorder').SessionSnapshot} snapshot
   * @param {{ text: string, source: string }} summaryResult
   */
  function save(snapshot, summaryResult) {
    const sessions = list()
    const durationMs = Math.max(0, (snapshot.endedAt || Date.now()) - snapshot.startedAt)
    const transcriptLines = normalizeTranscriptLinesForSave(snapshot.transcriptLines)
    const exchanges = normalizeExchangesForSave(snapshot.exchanges)
    const record = {
      id: snapshot.id,
      startedAt: snapshot.startedAt,
      endedAt: snapshot.endedAt || Date.now(),
      durationMs,
      modeName: snapshot.modeName,
      summary: String(summaryResult?.text || '').slice(0, 32000),
      summarySource: summaryResult?.source === 'llm' ? 'llm' : 'fallback',
      transcriptLineCount: snapshot.transcriptLines.length,
      exchangeCount: snapshot.exchanges.length,
      transcriptLines,
      exchanges,
      speakerLabels: { ...DEFAULT_SPEAKER_LABELS },
      transcriptPreview: transcriptLines
        .slice(-40)
        .map((l) => l.text)
        .join('\n')
        .slice(0, 6000),
    }
    sessions.unshift(record)
    while (sessions.length > MAX_STORED) sessions.pop()
    writeAll(sessions)
    return record
  }

  /**
   * @param {string} id
   * @param {{ me?: string, other?: string }} speakerLabels
   */
  function updateSpeakerLabels(id, speakerLabels) {
    const sessions = list()
    const idx = sessions.findIndex((s) => s.id === id)
    if (idx < 0) return { ok: false, error: 'Session not found' }
    const prev = sessions[idx].speakerLabels || { ...DEFAULT_SPEAKER_LABELS }
    sessions[idx] = {
      ...sessions[idx],
      speakerLabels: {
        me: String(speakerLabels?.me ?? prev.me ?? DEFAULT_SPEAKER_LABELS.me).slice(0, 48),
        other: String(speakerLabels?.other ?? prev.other ?? DEFAULT_SPEAKER_LABELS.other).slice(0, 48),
      },
    }
    writeAll(sessions)
    return { ok: true, session: sessions[idx] }
  }

  function remove(id) {
    const next = list().filter((s) => s.id !== id)
    writeAll(next)
    return { ok: true }
  }

  function clearAll() {
    writeAll([])
    return { ok: true }
  }

  return { list, get, save, updateSpeakerLabels, remove, clearAll }
}

module.exports = { createMeetingSessionsStore, MAX_STORED }
