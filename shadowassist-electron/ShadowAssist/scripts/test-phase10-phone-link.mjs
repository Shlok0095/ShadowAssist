// Phase 10 smoke test — Phone Link LAN server, pairing, optional mic routes.
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import http from 'http'

const root = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(root, '..')
const require = createRequire(import.meta.url)

const storeSchema = require(path.join(appRoot, 'lib/store.js')).schema
const { createPhoneLinkManager } = require(path.join(appRoot, 'lib/phoneLinkManager.js'))

for (const key of [
  'phoneLinkEnabled',
  'phoneLinkPort',
  'phoneLinkPairingToken',
  'phoneLinkRemoteMicEnabled',
]) {
  if (!storeSchema[key]) throw new Error(`store missing ${key}`)
}

const mockStore = {
  phoneLinkEnabled: true,
  phoneLinkPort: 18787,
  phoneLinkPairingToken: '',
  set: (k, v) => {
    mockStore[k] = v
  },
  get: (k) => mockStore[k],
}

const mgr = createPhoneLinkManager({
  storeGet: (k) => mockStore.get(k),
  storeSet: (k, v) => mockStore.set(k, v),
  onMicChunk: () => {},
  onMicSpeechEnded: () => {},
  isMicAllowed: () =>
    mockStore.get('phoneLinkRemoteMicEnabled') === true
    && mockStore.get('phoneLinkEnabled') === true
    && mgr.getStatus().state.sessionActive === true,
})

mockStore.set('phoneLinkRemoteMicEnabled', true)

const started = await mgr.start()
const token = started.token
if (!token) throw new Error('no pairing token')

mgr.pushState({ sessionActive: false, transcript: 'Hello from test', aiText: 'Sample answer' })

const pairBody = JSON.stringify({ token })
const pairRes = await new Promise((resolve, reject) => {
  const req = http.request(
    {
      hostname: '127.0.0.1',
      port: 18787,
      path: '/api/pair',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(pairBody) },
    },
    (r) => {
      const chunks = []
      r.on('data', (c) => chunks.push(c))
      r.on('end', () => resolve({ status: r.statusCode, text: Buffer.concat(chunks).toString('utf8') }))
    },
  )
  req.on('error', reject)
  req.write(pairBody)
  req.end()
})

if (pairRes.status !== 200) throw new Error(`pair HTTP ${pairRes.status}: ${pairRes.text}`)
const paired = JSON.parse(pairRes.text)
if (!paired.ok || !paired.state?.transcript?.includes('Hello')) {
  throw new Error('pair state missing transcript')
}

const stateRes = await new Promise((resolve, reject) => {
  http
    .get(`http://127.0.0.1:18787/api/state?t=${encodeURIComponent(token)}`, (r) => {
      const chunks = []
      r.on('data', (c) => chunks.push(c))
      r.on('end', () => resolve({ status: r.statusCode, text: Buffer.concat(chunks).toString('utf8') }))
    })
    .on('error', reject)
})

if (stateRes.status !== 200) throw new Error(`state HTTP ${stateRes.status}`)
const state = JSON.parse(stateRes.text)
if (!state.aiText?.includes('Sample')) throw new Error('state missing aiText')

const micBody = JSON.stringify({ token, pcm: Buffer.from('abc').toString('base64') })
const micRes = await new Promise((resolve, reject) => {
  const req = http.request(
    {
      hostname: '127.0.0.1',
      port: 18787,
      path: '/api/mic-chunk',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(micBody) },
    },
    (r) => {
      const chunks = []
      r.on('data', (c) => chunks.push(c))
      r.on('end', () => resolve({ status: r.statusCode }))
    },
  )
  req.on('error', reject)
  req.write(micBody)
  req.end()
})
if (micRes.status !== 403) throw new Error(`mic without session should 403, got ${micRes.status}`)

mgr.pushState({ sessionActive: true })
const micOk = await new Promise((resolve, reject) => {
  const req = http.request(
    {
      hostname: '127.0.0.1',
      port: 18787,
      path: '/api/mic-chunk',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(micBody) },
    },
    (r) => {
      const chunks = []
      r.on('data', (c) => chunks.push(c))
      r.on('end', () => resolve({ status: r.statusCode }))
    },
  )
  req.on('error', reject)
  req.write(micBody)
  req.end()
})
if (micOk.status !== 200) throw new Error(`mic with session should 200, got ${micOk.status}`)

mgr.stop()
console.log('OK phase10 phone-link', { token: token.slice(0, 8), transcript: state.transcript.slice(0, 24) })
