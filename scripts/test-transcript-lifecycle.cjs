const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')

const sessionMemory = require('../lib/sessionMemory')
const { StreamingSession } = require('../lib/localStt/streamingSession')

beforeEach(() => {
  sessionMemory.wipe()
})

test('transcript watermark clears consumed speech but preserves newer speech', () => {
  sessionMemory.appendTranscriptSegment('Me: first question', 100)
  sessionMemory.appendTranscriptSegment('Participant: old context', 110)
  sessionMemory.appendTranscriptSegment('Participant: next question', 130)

  sessionMemory.clearTranscriptThrough(120)

  assert.equal(sessionMemory.getTranscriptText(), 'Participant: next question')
})

test('stopAndDrain transcribes pending VAD audio after the session becomes inactive', async () => {
  const finals = []
  const session = new StreamingSession({
    channel: 'mic',
    spec: { family: 'moonshine', modelId: 'moonshine-test' },
    transcribeFn: async () => 'pending final words',
    onPartial: () => {},
    onFinal: (text) => finals.push(text),
  })
  session.active = true
  session.vad.flush = () => [{ samples: new Float32Array(1920) }]

  await session.stopAndDrain()

  assert.deepEqual(finals, ['pending final words'])
  assert.equal(session.active, false)
})

test('final segments drain serially in capture order', async () => {
  const finals = []
  let call = 0
  const session = new StreamingSession({
    channel: 'sys',
    spec: { family: 'moonshine', modelId: 'moonshine-test' },
    transcribeFn: async () => {
      call += 1
      const current = call
      await new Promise((resolve) => setTimeout(resolve, current === 1 ? 15 : 0))
      return current === 1 ? 'first segment' : 'second segment'
    },
    onPartial: () => {},
    onFinal: (text) => finals.push(text),
  })
  session.active = true
  session.vad.flush = () => [
    { samples: new Float32Array(1920) },
    { samples: new Float32Array(1920) },
  ]

  await session.stopAndDrain()

  assert.deepEqual(finals, ['first segment', 'second segment'])
})
