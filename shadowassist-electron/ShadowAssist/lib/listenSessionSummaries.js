// Copyright (c) 2026 ShadowAssist. All rights reserved.
// In-memory meeting summary records based on Listen sessions only.

const MAX_SESSIONS = 30
const MAX_TRANSCRIPT_LINES = 120
const MAX_ACTIVITY_ITEMS = 200
const MAX_RESPONSE_CHARS = 12000

/** @type {Array<any>} */
let sessions = []
let current = null
let nextSessionId = 1
let nextAskId = 1

function nowIso() {
  return new Date().toISOString()
}

function cloneForUi(session) {
  return JSON.parse(JSON.stringify(session))
}

function ensureCurrentSession() {
  if (current && !current.endedAt) return current
  return null
}

function pushActivity(session, item) {
  session.activity.push(item)
  if (session.activity.length > MAX_ACTIVITY_ITEMS) {
    session.activity = session.activity.slice(-MAX_ACTIVITY_ITEMS)
  }
}

function startSession() {
  if (current && !current.endedAt) return current
  const s = {
    id: `listen-${nextSessionId++}`,
    startedAt: nowIso(),
    endedAt: null,
    transcript: [],
    asks: [],
    generatedResponses: [],
    overlayInteractions: [],
    activity: [],
    llmSummary: {
      status: 'idle', // idle | generating | ready | error
      generatedAt: null,
      text: '',
      error: '',
    },
  }
  sessions.unshift(s)
  if (sessions.length > MAX_SESSIONS) sessions = sessions.slice(0, MAX_SESSIONS)
  current = s
  pushActivity(s, { type: 'session_start', at: nowIso() })
  return s
}

function stopSession() {
  if (!current || current.endedAt) return null
  current.endedAt = nowIso()
  pushActivity(current, { type: 'session_stop', at: current.endedAt })
  const out = current
  current = null
  return out
}

function recordTranscript(line) {
  const text = String(line || '').trim()
  if (!text) return
  const s = ensureCurrentSession()
  if (!s) return
  s.transcript.push({ at: nowIso(), text })
  if (s.transcript.length > MAX_TRANSCRIPT_LINES) {
    s.transcript = s.transcript.slice(-MAX_TRANSCRIPT_LINES)
  }
  pushActivity(s, { type: 'transcript', at: nowIso(), text })
}

function beginAsk({ question, askSource, promptPreview }) {
  const s = ensureCurrentSession()
  if (!s) return null
  const ask = {
    id: `ask-${nextAskId++}`,
    at: nowIso(),
    question: String(question || '').trim(),
    askSource: String(askSource || 'unknown'),
    promptPreview: String(promptPreview || '').trim().slice(0, 1200),
    response: '',
    error: '',
    completedAt: null,
  }
  s.asks.push(ask)
  s.overlayInteractions.push({
    at: ask.at,
    action: 'ask_triggered',
    source: ask.askSource,
  })
  pushActivity(s, {
    type: 'ask_start',
    at: ask.at,
    askId: ask.id,
    askSource: ask.askSource,
    question: ask.question,
  })
  return ask.id
}

function completeAsk(askId, responseText) {
  if (!askId) return
  const s = current || sessions.find((x) => !x.endedAt) || sessions[0]
  if (!s) return
  const ask = s.asks.find((a) => a.id === askId)
  if (!ask) return
  const text = String(responseText || '').trim().slice(0, MAX_RESPONSE_CHARS)
  ask.response = text
  ask.completedAt = nowIso()
  s.generatedResponses.push({
    askId,
    at: ask.completedAt,
    text,
  })
  pushActivity(s, {
    type: 'ask_complete',
    at: ask.completedAt,
    askId,
    responseChars: text.length,
  })
}

function failAsk(askId, errorMessage) {
  if (!askId) return
  const s = current || sessions.find((x) => !x.endedAt) || sessions[0]
  if (!s) return
  const ask = s.asks.find((a) => a.id === askId)
  if (!ask) return
  const msg = String(errorMessage || 'Request failed')
  ask.error = msg
  ask.completedAt = nowIso()
  pushActivity(s, {
    type: 'ask_error',
    at: ask.completedAt,
    askId,
    error: msg,
  })
}

function getSummaries() {
  return sessions.map(cloneForUi)
}

function getSummaryById(sessionId) {
  return sessions.find((s) => s.id === sessionId) || null
}

function markSummaryGenerating(sessionId) {
  const s = getSummaryById(sessionId)
  if (!s) return
  s.llmSummary = {
    status: 'generating',
    generatedAt: null,
    text: '',
    error: '',
  }
  pushActivity(s, { type: 'llm_summary_generating', at: nowIso() })
}

function setSummaryReady(sessionId, text) {
  const s = getSummaryById(sessionId)
  if (!s) return
  s.llmSummary = {
    status: 'ready',
    generatedAt: nowIso(),
    text: String(text || '').trim(),
    error: '',
  }
  pushActivity(s, { type: 'llm_summary_ready', at: s.llmSummary.generatedAt })
}

function setSummaryError(sessionId, message) {
  const s = getSummaryById(sessionId)
  if (!s) return
  s.llmSummary = {
    status: 'error',
    generatedAt: nowIso(),
    text: '',
    error: String(message || 'Summary generation failed'),
  }
  pushActivity(s, { type: 'llm_summary_error', at: s.llmSummary.generatedAt, error: s.llmSummary.error })
}

function clearCompletedSummaries() {
  // Keep currently running listen session (if any), remove all ended summaries.
  sessions = sessions.filter((s) => !s.endedAt)
}

module.exports = {
  startSession,
  stopSession,
  recordTranscript,
  beginAsk,
  completeAsk,
  failAsk,
  getSummaries,
  getSummaryById,
  markSummaryGenerating,
  setSummaryReady,
  setSummaryError,
  clearCompletedSummaries,
}

