/**
 * Smoke test: answerPlanner + contextRouter + meetingRecall.
 * Usage: node scripts/test-context-router.mjs
 */
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const root = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(root, '..')
const require = createRequire(import.meta.url)

const { planAnswer } = require(path.join(appRoot, 'lib', 'answerPlanner.js'))
const { routeContext, isBackwardLookingQuery, buildContextRoute } = require(path.join(appRoot, 'lib', 'contextRouter.js'))
const meetingRecall = require(path.join(appRoot, 'lib', 'meetingRecall.js'))

let passed = 0
function pass(msg) { console.log(`PASS  ${msg}`); passed++ }
function fail(msg, e) { console.error(`FAIL  ${msg} — ${e?.message || e}`) }

const coding = planAnswer({ question: 'implement binary search in O(log n)', source: 'manual_input' })
if (coding.answerType !== 'coding_question_answer' || coding.profileContextPolicy !== 'forbidden') {
  fail('coding plan', new Error(JSON.stringify(coding)))
} else pass('planAnswer coding forbids profile')

const sales = planAnswer({ question: 'handle pricing objection', source: 'manual_input', activeMode: 'sales' })
if (sales.answerType !== 'sales_answer') fail('sales plan', new Error(sales.answerType))
else pass('planAnswer sales')

const route = routeContext({
  userQuery: 'implement a hash map function',
  mode: 'general',
  profileAvailable: true,
  jdAvailable: true,
  referenceFilesAvailable: true,
  hasLiveTranscript: false,
  source: 'manual_input',
})
if (route.useReferenceFiles || route.useResume) {
  fail('coding route excludes refs/resume', new Error(JSON.stringify(route)))
} else pass('routeContext coding excludes profile layers')

const recallQ = 'what did we discuss in the last meeting about pricing'
if (!isBackwardLookingQuery(recallQ)) fail('backward recall detect', new Error('expected true'))
else pass('isBackwardLookingQuery')

const recallRoute = routeContext({
  userQuery: recallQ,
  mode: 'general',
  profileAvailable: false,
  referenceFilesAvailable: false,
  hasLiveTranscript: true,
  source: 'manual_input',
})
if (!recallRoute.useMeetingSummary) fail('recall route', new Error('useMeetingSummary false'))
else pass('routeContext meeting recall')

if (!recallRoute.useHindsightRecall) fail('recall route hindsight', new Error('useHindsightRecall false'))
else pass('routeContext hindsight recall')

const sessions = [
  { id: '1', modeName: 'Sales', startedAt: Date.now(), summary: 'Discussed pricing objection and ROI for enterprise buyer.' },
  { id: '2', modeName: 'Meeting', startedAt: Date.now() - 86400000, summary: 'Roadmap planning only.' },
]
const hits = meetingRecall.searchMeetingSessions(sessions, 'pricing objection last meeting')
if (!hits.length || !hits[0].summary.includes('pricing')) fail('meetingRecall search', new Error('no hit'))
else pass('meetingRecall keyword search')

const block = meetingRecall.formatMeetingRecallBlock(hits)
if (!block.includes('PAST MEETINGS')) fail('recall block format', new Error('missing header'))
else pass('formatMeetingRecallBlock')

const mainSrc = fs.readFileSync(path.join(appRoot, 'main', 'index.js'), 'utf8')
if (!mainSrc.includes('resolveContextRouteDecision')) fail('main wiring', new Error('missing resolver'))
else pass('main/index.js wiring')

console.log('')
console.log(`Done: ${passed} passed`)
process.exit(passed >= 9 ? 0 : 1)
