// Copyright (c) 2026 VeilAssist. All rights reserved.
// Bounded, in-memory same-session conversation memory.

const MAX_TURNS_PER_SESSION = 100
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'to', 'of', 'in',
  'on', 'for', 'with', 'i', 'you', 'we', 'it', 'that', 'this',
])

function extractEntities(text, max = 8) {
  const seen = new Set()
  const out = []
  const tokens = String(text || '').match(/\b[A-Z][a-zA-Z0-9+.&-]{2,}\b|\b[a-z]+(?:\+\+|#)\b/g) || []
  for (const token of tokens) {
    const key = token.toLowerCase()
    if (STOP_WORDS.has(key) || seen.has(key)) continue
    seen.add(key)
    out.push(token)
    if (out.length >= max) break
  }
  return out
}

function meaningfulTerms(text) {
  const matched = String(text || '').toLowerCase().match(/[a-z0-9']+/g) || []
  return new Set(matched.filter((term) => term.length > 2 && !STOP_WORDS.has(term)))
}

function summarizeTurn(userMessage, assistantAnswer) {
  const question = String(userMessage || '').replace(/\s+/g, ' ').trim().slice(0, 80)
  const answer = String(assistantAnswer || '').replace(/\s+/g, ' ').trim().slice(0, 120)
  return `Q: ${question}${answer ? ` | A: ${answer}` : ''}`
}

function createConversationMemoryService({ maxTurns = MAX_TURNS_PER_SESSION } = {}) {
  const sessions = new Map()
  let sequence = 0

  function record(turn) {
    const sessionId = String(turn?.sessionId || '').trim()
    const userMessage = String(turn?.userMessage || '').trim()
    const assistantAnswer = String(turn?.assistantAnswer || '').trim()
    if (!sessionId || !userMessage || !assistantAnswer) return null
    const stored = Object.freeze({
      sessionId,
      meetingId: String(turn?.meetingId || '').trim() || undefined,
      userMessage,
      assistantAnswer,
      mode: String(turn?.mode || '').trim() || undefined,
      timestamp: Number(turn?.timestamp) || Date.now(),
      contextSourcesUsed: Array.isArray(turn?.contextSourcesUsed)
        ? turn.contextSourcesUsed.map(String).slice(0, 12)
        : [],
      entities: Array.isArray(turn?.entities)
        ? turn.entities.map(String).slice(0, 8)
        : extractEntities(`${userMessage} ${assistantAnswer}`),
      id: `turn_${sequence++}`,
      summary: summarizeTurn(userMessage, assistantAnswer),
    })
    const turns = sessions.get(sessionId) || []
    turns.push(stored)
    if (turns.length > maxTurns) turns.splice(0, turns.length - maxTurns)
    sessions.set(sessionId, turns)
    return stored
  }

  function getRecentTurns(sessionId, count = 10) {
    const turns = sessions.get(String(sessionId || '')) || []
    return turns.slice(-Math.max(0, count))
  }

  function getSessionSummary(sessionId, maxTurns = 12) {
    return getRecentTurns(sessionId, maxTurns).map((turn) => turn.summary).join('\n')
  }

  function getLastAssistantAnswer(sessionId) {
    const turns = sessions.get(String(sessionId || '')) || []
    for (let i = turns.length - 1; i >= 0; i -= 1) {
      if (turns[i].assistantAnswer) return turns[i].assistantAnswer
    }
    return null
  }

  function getLastCodingTurn(sessionId) {
    const turns = sessions.get(String(sessionId || '')) || []
    for (let i = turns.length - 1; i >= 0; i -= 1) {
      const turn = turns[i]
      if (/```[\s\S]*```/.test(turn.assistantAnswer)) {
        return turn
      }
    }
    return null
  }

  function resolveSameSession(sessionId, followUp) {
    const turns = sessions.get(String(sessionId || '')) || []
    if (!turns.length) return null
    const entities = new Set(extractEntities(followUp).map((entity) => entity.toLowerCase()))
    const terms = meaningfulTerms(followUp)
    let best = null
    let bestScore = 0
    for (let i = turns.length - 1; i >= 0; i -= 1) {
      const turn = turns[i]
      const haystack = `${turn.userMessage} ${turn.assistantAnswer}`.toLowerCase()
      let score = 0
      for (const entity of entities) if (haystack.includes(entity)) score += 2
      for (const term of terms) if (haystack.includes(term)) score += 1
      if (score > bestScore) {
        bestScore = score
        best = turn
      }
    }
    const query = String(followUp || '').trim()
    const recencyFallback =
      /\b(that|it|this|those|and|also|what about|continue|carry on|keep going|go on|previous|earlier|last|why|how|so|then|more|expand|elaborate|deeper|detail|tell me more|go deeper|explain)\b/i
    if (!best && query.split(/\s+/).length <= 6 && recencyFallback.test(query)) {
      return turns[turns.length - 1]
    }
    return best
  }

  function clearSession(sessionId) {
    sessions.delete(String(sessionId || ''))
  }

  function clearAll() {
    sessions.clear()
  }

  return Object.freeze({
    record,
    getRecentTurns,
    getSessionSummary,
    getLastAssistantAnswer,
    getLastCodingTurn,
    resolveSameSession,
    clearSession,
    clearAll,
    get sessionCount() {
      return sessions.size
    },
  })
}

module.exports = {
  MAX_TURNS_PER_SESSION,
  createConversationMemoryService,
  extractEntities,
  meaningfulTerms,
  summarizeTurn,
}
