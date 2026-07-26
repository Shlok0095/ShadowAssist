const test = require('node:test')
const assert = require('node:assert/strict')

const {
  mergeRollingTranscriptPartial,
  mergeRollingTranscriptFinal,
  capRollingTranscript,
} = require('../lib/rollingTranscriptState.cjs')
const { buildPreparedTranscriptContext } = require('../lib/transcriptCleaner.cjs')

test('partial replaces in-progress tail without duplicating committed segments', () => {
  const prev = 'Hello world'
  const next = mergeRollingTranscriptPartial(prev, 'Hello world how are')
  assert.equal(next, 'Hello world how are')
})

test('final commits without duplicating matching partial', () => {
  const prev = mergeRollingTranscriptPartial('', 'hello world how')
  const final = mergeRollingTranscriptFinal(prev, 'Hello world, how are you?')
  assert.equal(final, 'Hello world, how are you?')
})

test('final appends a new utterance after separator', () => {
  const prev = mergeRollingTranscriptFinal('', 'First segment')
  const next = mergeRollingTranscriptFinal(prev, 'Second segment')
  assert.match(next, /First segment · Second segment/)
})

test('cap drops oldest segments on finalized boundary', () => {
  const long = `${'a'.repeat(4000)} · ${'b'.repeat(5000)}`
  const capped = capRollingTranscript(long, 6000)
  assert.ok(capped.length <= 6000)
  assert.doesNotMatch(capped, /^a{10}/)
})

test('prepared transcript uses INTERVIEWER/ME labels', () => {
  const now = Date.now()
  const out = buildPreparedTranscriptContext([
    { speaker: 'other', text: 'What is CNN?', capturedAt: now - 1000, interim: false },
    { speaker: 'me', text: 'I think it is a neural network', capturedAt: now - 500, interim: false },
  ])
  assert.match(out, /\[INTERVIEWER\]: what is cnn\?/)
  assert.match(out, /\[ME\]: i think it is a neural network/)
})

test('prepared transcript ignores segments outside the rolling window', () => {
  const now = Date.now()
  const out = buildPreparedTranscriptContext([
    { speaker: 'other', text: 'Ancient history question', capturedAt: now - 400_000, interim: false },
    { speaker: 'other', text: 'Recent question', capturedAt: now - 1000, interim: false },
  ])
  assert.match(out, /\[INTERVIEWER\]: recent question/)
  assert.doesNotMatch(out, /ancient history/)
})
