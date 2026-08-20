#!/usr/bin/env node
/**
 * Deepgram low-latency config — parity with Deepgram streaming docs + NVIDIA feel.
 * Usage: node scripts/test-deepgram-latency-config.cjs
 */
const assert = require('assert')
const {
  buildListenParams,
  STREAM_SEND_BYTES,
  DEFAULT_ENDPOINTING_MS,
} = require('../lib/deepgramStt')

const results = []
function pass(name, detail = '') {
  results.push({ ok: true, name, detail })
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`)
}
function fail(name, detail = '') {
  results.push({ ok: false, name, detail })
  console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
}

console.log('\n── Deepgram latency config ──\n')

const params = new URLSearchParams(buildListenParams({ model: 'nova-3-general', language: 'en', endpointing: 10 }))
const get = (k) => params.get(k)

if (get('interim_results') === 'true') pass('interim_results enabled')
else fail('interim_results enabled')

if (get('endpointing') === '10') pass('endpointing=10ms (fast default)', get('endpointing'))
else fail('endpointing=10ms', get('endpointing'))

if (get('no_delay') === 'true') pass('no_delay=true (skip smart_format wait)')
else fail('no_delay=true')

if (!params.has('smart_format')) pass('smart_format off (lower latency)')
else fail('smart_format should be off for speed', get('smart_format'))

if (get('encoding') === 'linear16' && get('sample_rate') === '16000') pass('linear16 @ 16kHz')
else fail('linear16 @ 16kHz')

if (STREAM_SEND_BYTES === 640) pass('STREAM_SEND_BYTES=640 (~20ms chunks)')
else fail('STREAM_SEND_BYTES', String(STREAM_SEND_BYTES))

if (DEFAULT_ENDPOINTING_MS === 10) pass('DEFAULT_ENDPOINTING_MS=10')
else fail('DEFAULT_ENDPOINTING_MS')

const fs = require('fs')
const src = fs.readFileSync(require('path').join(__dirname, '..', 'lib', 'deepgramStt.js'), 'utf8')
if (!src.includes("endpointing: '220'")) pass('removed slow 220ms endpointing default')
else fail('still uses 220ms endpointing')

if (src.includes('Promise.all') || src.includes('micConnect')) pass('pre-connect mic (+ sys) on session start')
else fail('parallel pre-connect on startListening')

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) process.exit(1)
