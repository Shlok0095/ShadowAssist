/**
 * Phase 6 smoke test — vector memory chunking + keyword recall (no embedding model).
 */
import path from 'path'
import fs from 'fs'
import os from 'os'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const root = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(root, '..')
const require = createRequire(import.meta.url)

const { chunkText, keywordOverlapScore, buildSessionIndexText } = require(path.join(appRoot, 'lib/vectorMemoryUtils.js'))
const { createVectorMemoryStore } = require(path.join(appRoot, 'lib/vectorMemory.js'))

const chunks = chunkText('alpha beta gamma delta '.repeat(120))
if (chunks.length < 2) throw new Error('chunkText expected multiple chunks')

const score = keywordOverlapScore('pricing demo follow-up', 'We discussed pricing and a product demo')
if (score <= 0) throw new Error('keyword overlap failed')

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'veil-vec-'))
const mem = { data: { vectorMemoryEnabled: true } }
const store = { get: (k) => mem.data[k], set: (k, v) => { mem.data[k] = v } }
const vm = createVectorMemoryStore({ memoryRoot: tmp, store, embedClient: null })

const session = {
  id: 'sess-1',
  modeName: 'Sales',
  startedAt: Date.now() - 3600000,
  summary: '## Action items\n- Send pricing deck\n- Schedule demo',
  transcriptLines: [{ at: Date.now(), speaker: 'other', text: 'What is your pricing model?' }],
}
const text = buildSessionIndexText(session)
if (!text.includes('pricing')) throw new Error('buildSessionIndexText failed')

await vm.indexSession(session)
const hits = await vm.recall('pricing deck demo', { topK: 4, timeoutMs: 500 })
if (!hits.length) throw new Error('keyword recall returned no hits')

const search = await vm.searchPastMeetings('pricing', { maxResults: 4, meetingSessions: [session] })
if (!search.length) throw new Error('searchPastMeetings empty')

fs.rmSync(tmp, { recursive: true, force: true })
console.log('OK phase6 vector-memory', { chunks: chunks.length, hits: hits.length })
