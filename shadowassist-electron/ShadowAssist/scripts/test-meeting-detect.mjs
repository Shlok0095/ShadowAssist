/**
 * Smoke test: meeting foreground classification (no Electron).
 * Usage: node scripts/test-meeting-detect.mjs
 */
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const root = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(root, '..')
const require = createRequire(import.meta.url)

const { classifyForegroundMeeting, MEETING_POLL_MS } = require(path.join(appRoot, 'lib', 'meetingForegroundWindows.js'))

const cases = [
  { title: 'Weekly sync | Microsoft Teams', proc: 'ms-teams', expect: 'teams' },
  { title: 'abc-defg-hij | Google Meet', proc: 'chrome', expect: 'meet' },
  { title: 'Zoom Meeting', proc: 'zoom', expect: 'zoom' },
  { title: 'Random doc - Google Docs', proc: 'chrome', expect: null },
]

let passed = 0
for (const c of cases) {
  const hit = classifyForegroundMeeting(c.title, c.proc)
  const got = hit?.platform || null
  if (got === c.expect) {
    console.log(`PASS  ${c.title.slice(0, 40)} → ${got ?? 'null'}`)
    passed++
  } else {
    console.error(`FAIL  ${c.title} — expected ${c.expect}, got ${got}`)
  }
}

if (MEETING_POLL_MS !== 2500) {
  console.error(`FAIL  MEETING_POLL_MS expected 2500, got ${MEETING_POLL_MS}`)
} else {
  console.log('PASS  MEETING_POLL_MS = 2500')
  passed++
}

const mainSrc = require('fs').readFileSync(path.join(appRoot, 'main', 'index.js'), 'utf8')
for (const needle of ['startMeetingForegroundPoll', 'meeting-toast:show', 'detectMeetingForegroundOrScan']) {
  if (!mainSrc.includes(needle)) {
    console.error(`FAIL  main/index.js missing ${needle}`)
    process.exit(1)
  }
}
console.log('PASS  main/index.js wiring')

console.log('')
console.log(`Done: ${passed}/${cases.length + 2} passed`)
process.exit(passed === cases.length + 2 ? 0 : 1)
