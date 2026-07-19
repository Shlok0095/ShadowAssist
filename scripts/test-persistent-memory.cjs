// Copyright (c) 2026 VeilAssist. All rights reserved.

const { after, test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const http = require('http')
const os = require('os')
const path = require('path')

const { createVectorMemoryStore } = require('../lib/vectorMemory')
const { createHindsightAdapter } = require('../lib/hindsightAdapter')
const {
  MAX_TOKENS,
  OVERLAP_TARGET_TOKENS,
  chunkSession,
} = require('../lib/vectorMemoryUtils')

if (process.versions.electron) {
  after(() => {
    const { app } = require('electron')
    setTimeout(() => app.exit(process.exitCode || 0), 50)
  })
}

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'veil-memory-'))
}

function fakeStore(values = {}) {
  return { get: (key) => values[key] }
}

function fakeEmbedClient() {
  function vector(text) {
    const out = new Array(384).fill(0)
    const source = String(text || '').toLowerCase()
    for (let i = 0; i < source.length; i += 1) out[source.charCodeAt(i) % out.length] += 1
    const norm = Math.sqrt(out.reduce((sum, value) => sum + value * value, 0)) || 1
    return out.map((value) => value / norm)
  }
  return {
    embedText: async (text) => vector(text),
    embedTexts: async (texts) => texts.map(vector),
    status: () => ({ prepared: true }),
  }
}

function savedSession(id = 'meeting-1') {
  return {
    id,
    modeName: 'Technical interview',
    startedAt: Date.now() - 1000,
    summary: 'Discussed OAuth token rotation and API authentication.',
    transcriptLines: [
      { at: Date.now() - 900, text: 'Participant: How does the payments API authenticate?' },
      { at: Date.now() - 800, text: 'Me: It uses rotating OAuth access tokens.' },
      { at: Date.now() - 700, text: 'Participant: How are refresh tokens stored?' },
    ],
    exchanges: [
      { at: Date.now() - 600, question: 'Explain token rotation', answer: 'Rotate access tokens and revoke compromised refresh tokens.' },
    ],
  }
}

test('speaker-turn chunking stays bounded and records token metadata', () => {
  const session = savedSession()
  session.transcriptLines.push({
    at: Date.now(),
    text: `Participant: ${'architecture detail '.repeat(260)}`,
  })
  const chunks = chunkSession(session)
  assert.ok(chunks.length >= 2)
  assert.ok(chunks.every((chunk) => chunk.tokenCount > 0))
  assert.ok(chunks.every((chunk) => chunk.tokenCount <= MAX_TOKENS))
  assert.equal(OVERLAP_TARGET_TOKENS, 50)
})

test('SQLite vector memory indexes and semantically recalls saved meetings', async (t) => {
  const root = tempRoot()
  const memory = createVectorMemoryStore({
    memoryRoot: root,
    store: fakeStore({ vectorMemoryEnabled: true, globalMeetingSearchEnabled: true }),
    embedClient: fakeEmbedClient(),
  })
  t.after(() => {
    memory.close()
    fs.rmSync(root, { recursive: true, force: true })
  })
  const indexed = await memory.indexSession(savedSession())
  assert.equal(indexed.ok, true)
  const stats = memory.stats()
  assert.equal(stats.storage, 'sqlite')
  assert.ok(stats.chunks > 0)
  assert.equal(stats.embedded, stats.chunks)
  const hits = await memory.recall('OAuth authentication tokens', { topK: 3, timeoutMs: 3000 })
  assert.ok(hits.length > 0)
  assert.match(hits[0].text, /OAuth|token/i)
})

test('embedding failure degrades to keyword retrieval', async (t) => {
  const root = tempRoot()
  const failingEmbed = {
    embedTexts: async () => { throw new Error('offline') },
    embedText: async () => { throw new Error('offline') },
  }
  const memory = createVectorMemoryStore({
    memoryRoot: root,
    store: fakeStore({ vectorMemoryEnabled: true }),
    embedClient: failingEmbed,
  })
  t.after(() => {
    memory.close()
    fs.rmSync(root, { recursive: true, force: true })
  })
  await memory.indexSession(savedSession())
  const hits = await memory.recall('refresh tokens', { topK: 3 })
  assert.ok(hits.length > 0)
  assert.equal(hits[0].source, 'keyword_chunk')
})

test('clearAll removes both chunk text and vector rows', async (t) => {
  const root = tempRoot()
  const memory = createVectorMemoryStore({
    memoryRoot: root,
    store: fakeStore({ vectorMemoryEnabled: true }),
    embedClient: fakeEmbedClient(),
  })
  t.after(() => {
    memory.close()
    fs.rmSync(root, { recursive: true, force: true })
  })
  await memory.indexSession(savedSession())
  const cleared = memory.clearAll()
  assert.equal(cleared.ok, true)
  assert.ok(cleared.removed > 0)
  assert.equal(memory.stats().chunks, 0)
  assert.deepEqual(await memory.recall('OAuth', { topK: 3 }), [])
})

test('genuine Hindsight retain/recall is health-gated and bounded', async (t) => {
  let retained = 0
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json')
    if (req.url === '/health') {
      res.end(JSON.stringify({ ok: true }))
      return
    }
    if (req.method === 'POST' && req.url?.endsWith('/memories')) {
      retained += 1
      res.end(JSON.stringify({ status: 'accepted' }))
      return
    }
    if (req.method === 'POST' && req.url?.endsWith('/memories/recall')) {
      res.end(JSON.stringify({ results: [{ text: 'Remembered OAuth token rotation.', type: 'world' }] }))
      return
    }
    res.statusCode = 404
    res.end(JSON.stringify({ detail: 'not found' }))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const port = server.address().port
  const adapter = createHindsightAdapter({
    store: fakeStore({
      hindsightProvider: 'hindsight',
      hindsightApiUrl: `http://127.0.0.1:${port}`,
      hindsightBankId: 'test-bank',
    }),
  })
  assert.equal(await adapter.healthCheck({ force: true }), true)
  assert.equal(adapter.retain({ content: 'OAuth token rotation.', scope: { userId: 'local' } }), true)
  await adapter.flush()
  assert.equal(retained, 1)
  const hits = await adapter.recall('OAuth', { timeoutMs: 500, maxResults: 2, scope: { userId: 'local' } })
  assert.equal(hits.length, 1)
  assert.match(hits[0].text, /OAuth/)
})

test('Hindsight stays fail-open when health check cannot connect', async () => {
  const adapter = createHindsightAdapter({
    store: fakeStore({
      hindsightProvider: 'hindsight',
      hindsightApiUrl: 'http://127.0.0.1:9',
    }),
  })
  const started = Date.now()
  assert.deepEqual(await adapter.recall('anything', { timeoutMs: 100 }), [])
  assert.ok(Date.now() - started < 1500)
})
