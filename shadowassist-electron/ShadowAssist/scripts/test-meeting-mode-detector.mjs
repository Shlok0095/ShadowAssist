/**
 * Smoke test: meeting mode detector — extended cases + auto-provision.
 */
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const root = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(root, '..')
const require = createRequire(import.meta.url)

const {
  detectMeetingMode,
  findPromptForTemplate,
  buildPromptFromStarterTemplate,
} = require(path.join(appRoot, 'lib', 'meetingModeDetector.js'))

const prompts = [
  { id: 'sales-1', name: 'Sales call' },
  { id: 'recruit-1', name: 'Recruiting screen' },
  { id: 'tech-1', name: 'Gen AI engineer prep' },
  { id: 'lecture-1', name: 'Lecture notes' },
  { id: 'meet-1', name: 'Team meet sync' },
  { id: 'general-1', name: 'General meeting' },
]

const cases = [
  {
    text: 'Let us walk through pricing and ROI for the pilot. Any objection on procurement timeline?',
    expectTemplate: 'sales',
  },
  {
    text: 'We need to fill this job req — candidate pipeline and offer letter timeline.',
    expectTemplate: 'recruiting',
  },
  {
    text: 'Tell me about yourself. What is your greatest weakness using the STAR method?',
    expectTemplate: 'looking-for-work',
  },
  {
    text: 'For this leetcode problem, what is the time complexity of your algorithm on the whiteboard?',
    expectTemplate: 'technical-interview',
  },
  {
    text: 'Good morning everyone, today chapter five covers the theorem for the exam assignment.',
    expectTemplate: 'lecture',
  },
  {
    text: 'Quick standup — any blockers on the sprint? Retro action items from yesterday.',
    expectTemplate: 'team-meet',
  },
  {
    text: 'Random chat about the weather and lunch plans only.',
    expectTemplate: null,
  },
]

let passed = 0
for (const c of cases) {
  const hit = detectMeetingMode(c.text)
  const got = hit?.template ?? null
  if (got === c.expectTemplate) {
    console.log(`PASS  ${c.expectTemplate ?? 'null'} ← ${c.text.slice(0, 50)}…`)
    passed++
  } else {
    console.error(`FAIL  expected ${c.expectTemplate}, got ${got} for: ${c.text.slice(0, 60)}`)
  }
}

const mapped = findPromptForTemplate(prompts, 'sales')
if (mapped?.id === 'sales-1') {
  console.log('PASS  findPromptForTemplate(sales)')
  passed++
} else {
  console.error(`FAIL  findPromptForTemplate(sales) → ${mapped?.id}`)
}

const tech = findPromptForTemplate(prompts, 'technical-interview')
if (tech?.id === 'tech-1') {
  console.log('PASS  findPromptForTemplate(technical → Gen AI)')
  passed++
} else {
  console.error(`FAIL  technical map → ${tech?.id}`)
}

const provisioned = buildPromptFromStarterTemplate('sales', [])
if (provisioned?.name === 'Sales' && provisioned.content) {
  console.log('PASS  buildPromptFromStarterTemplate(sales)')
  passed++
} else {
  console.error('FAIL  buildPromptFromStarterTemplate', provisioned)
}

const mainSrc = require('fs').readFileSync(path.join(appRoot, 'main', 'index.js'), 'utf8')
for (const needle of [
  'maybeDetectMeetingMode',
  'accept-mode-suggestion',
  'dismiss-mode-suggestion',
  'mode-suggestion',
  'buildPromptFromStarterTemplate',
  'hindsight.hybridRecall',
]) {
  if (!mainSrc.includes(needle)) {
    console.error(`FAIL  main/index.js missing ${needle}`)
    process.exit(1)
  }
}
console.log('PASS  main/index.js wiring')

console.log('')
console.log(`Done: ${passed}/${cases.length + 3} passed`)
process.exit(passed === cases.length + 3 ? 0 : 1)
