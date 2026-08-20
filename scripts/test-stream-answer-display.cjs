#!/usr/bin/env node
/**
 * Overlay stream display — Natively-style plain text while generating.
 * Usage: node scripts/test-stream-answer-display.cjs
 */
const assert = require('assert')
const {
  stripMarkdownForStreamDisplay,
  splitStreamTakeaway,
  streamPreviewIntervalFor,
} = require('../renderer/overlay/streamAnswerDisplay.js')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    passed += 1
    console.log(`  PASS  ${name}`)
  } catch (e) {
    failed += 1
    console.log(`  FAIL  ${name} — ${e.message}`)
  }
}

console.log('\n── Stream answer display ──\n')

test('strips markdown fences and bold', () => {
  const raw = '**Takeaway:** Use a hash map.\n\n```python\nx = 1\n```'
  const plain = stripMarkdownForStreamDisplay(raw)
  assert(!plain.includes('**'), plain)
  assert(!plain.includes('```'), plain)
  assert(plain.includes('Use a hash map'), plain)
  assert(plain.includes('x = 1'), plain)
})

test('splitStreamTakeaway extracts first paragraph', () => {
  const raw = 'Lead with a direct answer.\n\nThen explain the approach in detail.'
  const { takeaway, rest } = splitStreamTakeaway(raw)
  assert.strictEqual(takeaway, 'Lead with a direct answer.')
  assert.ok(rest.includes('explain the approach'))
})

test('splitStreamTakeaway handles single paragraph', () => {
  const { takeaway, rest } = splitStreamTakeaway('Only one block here.')
  assert.strictEqual(takeaway, 'Only one block here.')
  assert.strictEqual(rest, '')
})

test('streamPreviewIntervalFor scales with length', () => {
  assert.strictEqual(streamPreviewIntervalFor(100), 80)
  assert.strictEqual(streamPreviewIntervalFor(3000), 160)
  assert.strictEqual(streamPreviewIntervalFor(8000), 280)
})

console.log(`\n${passed}/${passed + failed} passed`)
if (failed) process.exit(1)
