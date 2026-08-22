#!/usr/bin/env node
// Copyright (c) 2026 VeilAssist. Interview auto-answer utterance gate tests.

const path = require('path')
const {
  isUtteranceReadyForAutoAnswer,
  estimatedAnswerReadbackHoldMs,
} = require('../lib/utteranceReady.cjs')

const results = []
function pass(name) {
  results.push({ ok: true, name })
  console.log(`  ✓ ${name}`)
}
function fail(name, detail) {
  results.push({ ok: false, name, detail })
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
}

console.log('utteranceReady.cjs')

if (!isUtteranceReadyForAutoAnswer('marks with SAP')) {
  pass('blocks mid-sentence fragment')
} else {
  fail('blocks mid-sentence fragment')
}

if (isUtteranceReadyForAutoAnswer('What is gradient boosting and when would you use it?')) {
  pass('allows finished question')
} else {
  fail('allows finished question')
}

if (isUtteranceReadyForAutoAnswer('Tell me about your experience with distributed systems at scale')) {
  pass('allows long statement without question mark')
} else {
  fail('allows long statement without question mark')
}

const hold = estimatedAnswerReadbackHoldMs('word '.repeat(80))
if (hold >= 6000 && hold <= 12000) pass('answer readback hold scales with length')
else fail('answer readback hold scales with length', String(hold))

if (isUtteranceReadyForAutoAnswer('What is XGBoost')) {
  pass('allows short what-question')
} else {
  fail('allows short what-question')
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) process.exit(1)
