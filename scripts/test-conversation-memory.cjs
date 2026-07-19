// Copyright (c) 2026 VeilAssist. All rights reserved.

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const {
  MAX_TURNS_PER_SESSION,
  createConversationMemoryService,
} = require('../lib/conversationMemoryService')
const {
  isBareFollowUp,
  isCodingContinuation,
  isRefinementFollowUp,
  isReferentialFollowUp,
  normalizeFollowUpQuestion,
  resolveConversationFollowUp,
} = require('../lib/followUpResolver')

function record(memory, userMessage, assistantAnswer, extra = {}) {
  return memory.record({
    sessionId: 'overlay',
    userMessage,
    assistantAnswer,
    timestamp: Date.now(),
    ...extra,
  })
}

test('stores at most 100 delivered turns per session', () => {
  const memory = createConversationMemoryService()
  for (let i = 0; i < MAX_TURNS_PER_SESSION + 5; i += 1) {
    record(memory, `Question ${i}`, `Answer ${i}`)
  }
  const turns = memory.getRecentTurns('overlay', 200)
  assert.equal(turns.length, MAX_TURNS_PER_SESSION)
  assert.equal(turns[0].userMessage, 'Question 5')
})

test('selects an older relevant turn using token overlap instead of always using latest', () => {
  const memory = createConversationMemoryService()
  record(memory, 'How does the payments API authenticate?', 'It uses rotating OAuth tokens.')
  record(memory, 'What color is the dashboard?', 'The dashboard is blue.')
  const hit = memory.resolveSameSession('overlay', 'Explain the earlier API question')
  assert.equal(hit.userMessage, 'How does the payments API authenticate?')
})

test('bare context-free fragments fall back to the latest turn', () => {
  const memory = createConversationMemoryService()
  record(memory, 'First question', 'First answer')
  record(memory, 'Second question', 'Second answer')
  assert.equal(memory.resolveSameSession('overlay', 'why?').userMessage, 'Second question')
})

test('classifies Natively-style follow-up shapes without treating new questions as follow-ups', () => {
  assert.equal(isBareFollowUp('Can you explain?'), true)
  assert.equal(isRefinementFollowUp('Make that shorter'), true)
  assert.equal(isCodingContinuation('Give the time and space complexity'), true)
  assert.equal(isReferentialFollowUp('Explain the earlier API question'), true)
  assert.equal(isBareFollowUp('Why does JavaScript use an event loop?'), false)
  assert.equal(isRefinementFollowUp('Rewrite the billing service from scratch'), false)
})

test('extracts only the active question from segmented speech', () => {
  const structured = [
    '## RECENT CONTEXT',
    'Participant: Tell me about OAuth.',
    '',
    '## ACTIVE QUESTION',
    'Participant: Can you explain that?',
    '',
    '## TASK',
    'Answer only the active question.',
  ].join('\n')
  assert.equal(normalizeFollowUpQuestion(structured), 'Can you explain that?')
})

test('coding continuation uses the most recent actual coding turn', () => {
  const memory = createConversationMemoryService()
  record(memory, 'Solve Two Sum', '```js\nfunction twoSum() {}\n```')
  record(memory, 'Tell me about teamwork', 'I collaborate closely.')
  const resolved = resolveConversationFollowUp({
    question: 'Give the complexity',
    sessionId: 'overlay',
    memory,
  })
  assert.equal(resolved.kind, 'coding')
  assert.match(resolved.contextBlock, /Solve Two Sum/)
  assert.doesNotMatch(resolved.contextBlock, /teamwork/)
})

test('follow-up integration preserves supplied screenshot content', () => {
  const mainSource = fs.readFileSync(path.join(__dirname, '..', 'main', 'index.js'), 'utf8')
  assert.match(mainSource, /if \(visionB64\) \{\s*content\.unshift/)
  assert.doesNotMatch(mainSource, /followUp\s*\?\s*null\s*:\s*visionB64/)
})

test('session clearing removes the complete in-memory history', () => {
  const memory = createConversationMemoryService()
  record(memory, 'Question', 'Answer')
  memory.clearSession('overlay')
  assert.equal(memory.getRecentTurns('overlay').length, 0)
})
