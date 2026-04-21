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
let loadPersistedFn = null
let savePersistedFn = null

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

function toSafeText(v) {
  return String(v || '').trim()
}

function normalizeSession(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = toSafeText(raw.id)
  if (!id) return null
  const startedAt = toSafeText(raw.startedAt) || nowIso()
  const endedAt = raw.endedAt ? toSafeText(raw.endedAt) : null
  const transcript = Array.isArray(raw.transcript)
    ? raw.transcript
      .map((t) => ({ at: toSafeText(t?.at) || nowIso(), text: toSafeText(t?.text) }))
      .filter((t) => t.text)
      .slice(-MAX_TRANSCRIPT_LINES)
    : []
  const asks = Array.isArray(raw.asks)
    ? raw.asks.map((a) => ({
      id: toSafeText(a?.id),
      at: toSafeText(a?.at) || nowIso(),
      question: toSafeText(a?.question),
      askSource: toSafeText(a?.askSource) || 'unknown',
      promptPreview: toSafeText(a?.promptPreview).slice(0, 1200),
      response: toSafeText(a?.response).slice(0, MAX_RESPONSE_CHARS),
      error: toSafeText(a?.error),
      completedAt: a?.completedAt ? toSafeText(a.completedAt) : null,
    })).filter((a) => a.id)
    : []
  const generatedResponses = Array.isArray(raw.generatedResponses)
    ? raw.generatedResponses.map((r) => ({
      askId: toSafeText(r?.askId),
      at: toSafeText(r?.at) || nowIso(),
      text: toSafeText(r?.text).slice(0, MAX_RESPONSE_CHARS),
    })).filter((r) => r.askId || r.text)
    : []
  const overlayInteractions = Array.isArray(raw.overlayInteractions)
    ? raw.overlayInteractions.map((x) => ({
      at: toSafeText(x?.at) || nowIso(),
      action: toSafeText(x?.action) || 'unknown',
      source: toSafeText(x?.source) || 'n/a',
    }))
    : []
  const activity = Array.isArray(raw.activity)
    ? raw.activity.slice(-MAX_ACTIVITY_ITEMS)
    : []
  const llmSummary = {
    status: ['idle', 'generating', 'ready', 'error'].includes(toSafeText(raw?.llmSummary?.status))
      ? toSafeText(raw.llmSummary.status)
      : 'idle',
    generatedAt: raw?.llmSummary?.generatedAt ? toSafeText(raw.llmSummary.generatedAt) : null,
    text: toSafeText(raw?.llmSummary?.text),
    error: toSafeText(raw?.llmSummary?.error),
  }
  return {
    id,
    startedAt,
    endedAt,
    transcript,
    asks,
    generatedResponses,
    overlayInteractions,
    activity,
    llmSummary,
  }
}

function saveState() {
  if (!savePersistedFn) return
  try {
    savePersistedFn(sessions.map(cloneForUi))
  } catch {}
}

function recomputeCounters() {
  let maxSession = 0
  let maxAsk = 0
  for (const s of sessions) {
    const sm = String(s.id || '').match(/^listen-(\d+)$/)
    if (sm) maxSession = Math.max(maxSession, Number(sm[1]) || 0)
    for (const a of (Array.isArray(s.asks) ? s.asks : [])) {
      const am = String(a?.id || '').match(/^ask-(\d+)$/)
      if (am) maxAsk = Math.max(maxAsk, Number(am[1]) || 0)
    }
  }
  nextSessionId = maxSession + 1
  nextAskId = maxAsk + 1
}

function initPersistence({ load, save }) {
  loadPersistedFn = typeof load === 'function' ? load : null
  savePersistedFn = typeof save === 'function' ? save : null
  if (!loadPersistedFn) return
  try {
    const raw = loadPersistedFn()
    const hydrated = Array.isArray(raw)
      ? raw.map(normalizeSession).filter(Boolean).slice(0, MAX_SESSIONS)
      : []
    sessions = hydrated
    // If app was closed mid-session, close that session on next launch.
    const open = sessions.find((s) => !s.endedAt)
    if (open) {
      open.endedAt = nowIso()
      pushActivity(open, { type: 'session_stop_recovered_after_restart', at: open.endedAt })
    }
    current = null
    recomputeCounters()
    saveState()
  } catch {
    sessions = []
    current = null
    nextSessionId = 1
    nextAskId = 1
  }
}

function pushActivity(session, item) {
  session.activity.push(item)
  if (session.activity.length > MAX_ACTIVITY_ITEMS) {
    session.activity = session.activity.slice(-MAX_ACTIVITY_ITEMS)
  }
  saveState()
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
  saveState()
  return s
}

function stopSession() {
  if (!current || current.endedAt) return null
  current.endedAt = nowIso()
  pushActivity(current, { type: 'session_stop', at: current.endedAt })
  const out = current
  current = null
  saveState()
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
  saveState()
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
  saveState()
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
  saveState()
}

function clearCompletedSummaries() {
  // Keep currently running listen session (if any), remove all ended summaries.
  sessions = sessions.filter((s) => !s.endedAt)
  saveState()
}

module.exports = {
  initPersistence,
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

