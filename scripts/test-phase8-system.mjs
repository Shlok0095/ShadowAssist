/**
 * Phase 8 smoke test — local hindsight server + store keys.
 */
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import http from 'http'

const root = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(root, '..')
const require = createRequire(import.meta.url)

const { createHindsightLocalServer } = require(path.join(appRoot, 'lib/hindsightLocalServer.js'))
const storeSchema = require(path.join(appRoot, 'lib/store.js')).schema

for (const key of [
  'overlayMousePassthroughEnabled',
  'hideFromTaskbarEnabled',
  'hindsightAutoStartEnabled',
  'globalMeetingSearchEnabled',
]) {
  if (!storeSchema[key]) throw new Error(`store missing ${key}`)
}

const mem = []
const mockStore = {
  get: (k) => {
    if (k === 'longTermMemoryEnabled') return true
    if (k === 'longTermMemory') return mem
    if (k === 'vectorMemoryEnabled') return false
    return undefined
  },
  set: (k, v) => {
    if (k === 'longTermMemory' && Array.isArray(v)) {
      mem.splice(0, mem.length, ...v)
    }
  },
}

const ltm = require(path.join(appRoot, 'lib/longTermMemory.js')).createLongTermMemoryStore(mockStore)
ltm.retain({ content: 'Discussed enterprise pricing and annual discount', source: 'meeting_summary' })

const server = createHindsightLocalServer({
  storeGet: mockStore.get,
  longTermMemory: ltm,
  vectorMemory: null,
  port: 18888,
})

await server.start()

const body = JSON.stringify({ query: 'pricing discount', maxResults: 4 })
const res = await new Promise((resolve, reject) => {
  const req = http.request(
    {
      hostname: '127.0.0.1',
      port: 18888,
      path: '/recall',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    },
    (r) => {
      const chunks = []
      r.on('data', (c) => chunks.push(c))
      r.on('end', () => resolve({ status: r.statusCode, text: Buffer.concat(chunks).toString('utf8') }))
    },
  )
  req.on('error', reject)
  req.write(body)
  req.end()
})

if (res.status !== 200) throw new Error(`recall HTTP ${res.status}`)
const data = JSON.parse(res.text)
if (!Array.isArray(data.matches) || !data.matches.length) throw new Error('recall returned no matches')

server.stop()
console.log('OK phase8 system', { matches: data.matches.length, sample: data.matches[0].text.slice(0, 40) })
