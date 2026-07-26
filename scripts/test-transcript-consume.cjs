const test = require('node:test')
const assert = require('node:assert/strict')

const {
  consumeSegmentsThrough,
  rebuildSpeechBufferFromSegments,
  lastSpeechTimestampFromSegments,
} = require('../lib/transcriptConsume.cjs')

test('consume keeps only segments after watermark id', () => {
  const segments = [
    { id: 1, text: 'old', interim: false, capturedAt: 100 },
    { id: 2, text: 'asked', interim: false, capturedAt: 110 },
    { id: 3, text: 'new', interim: false, capturedAt: 130 },
  ]
  const { remaining, consumed } = consumeSegmentsThrough(segments, 2)
  assert.equal(consumed, 2)
  assert.deepEqual(remaining.map((s) => s.id), [3])
})

test('rebuild speech buffer joins remaining finals', () => {
  const remaining = [
    { id: 3, text: 'next question', interim: false },
    { id: 4, text: 'still listening', interim: false },
  ]
  assert.equal(
    rebuildSpeechBufferFromSegments(remaining),
    'next question still listening',
  )
})

test('last speech timestamp tracks newest segment', () => {
  const remaining = [
    { id: 3, text: 'a', capturedAt: 100, updatedAt: 120 },
    { id: 4, text: 'b', capturedAt: 130, updatedAt: 140 },
  ]
  assert.equal(lastSpeechTimestampFromSegments(remaining), 140)
})
