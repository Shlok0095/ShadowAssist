/**
 * Smoke test: googleCalendar module + main wiring.
 * Usage: node scripts/test-google-calendar.mjs
 */
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const root = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(root, '..')
const require = createRequire(import.meta.url)

const gc = require(path.join(appRoot, 'lib', 'googleCalendar.js'))
let passed = 0

function pass(name) {
  console.log(`PASS  ${name}`)
  passed++
}

function fail(name, err) {
  console.error(`FAIL  ${name} — ${err?.message || err}`)
}

const mockStore = new Map()
const get = (k) => mockStore.get(k)
const set = (k, v) => mockStore.set(k, v)

try {
  const st = gc.getConnectionStatus(get)
  if (st.connected !== false || typeof st.oauthReady !== 'boolean') {
    throw new Error('unexpected status shape')
  }
  pass('getConnectionStatus disconnected')

  mockStore.set('googleCalendarClientId', 'test-id')
  mockStore.set('googleCalendarClientSecret', 'test-secret')
  mockStore.set('googleCalendarRefreshToken', 'rt')
  const st2 = gc.getConnectionStatus(get)
  if (!st2.connected || !st2.oauthReady) throw new Error('expected connected with tokens')
  pass('getConnectionStatus connected')

  gc.disconnectGoogleCalendar(set)
  if (mockStore.get('googleCalendarRefreshToken')) throw new Error('disconnect should clear tokens')
  pass('disconnectGoogleCalendar')
} catch (e) {
  fail('googleCalendar', e)
}

const mainSrc = fs.readFileSync(path.join(appRoot, 'main', 'index.js'), 'utf8')
for (const needle of [
  'google-calendar:connect',
  'startCalendarReminderPoll',
  'calendarRemindersEnabled',
]) {
  if (!mainSrc.includes(needle)) fail('main wiring', new Error(`missing ${needle}`))
  else pass(`main has ${needle}`)
}

console.log('')
console.log(`Done: ${passed} checks passed`)
process.exit(passed >= 5 ? 0 : 1)
