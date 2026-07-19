/**
 * Smoke test: meetingSummary V3 chunking + structured fallback.
 * Usage: node scripts/test-meeting-summary.mjs
 */
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const root = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(root, '..')
const require = createRequire(import.meta.url)

const {
  buildFallbackSummary,
  chunkTranscriptLines,
  resolveSectionHeadings,
  estimateMaterialSize,
  generateMeetingSummary,
  SINGLE_PASS_CHAR_LIMIT,
} = require(path.join(appRoot, 'lib', 'meetingSummary.js'))

let passed = 0
function pass(msg) { console.log(`PASS  ${msg}`); passed++ }
function fail(msg, e) { console.error(`FAIL  ${msg} — ${e?.message || e}`) }

const snap = {
  id: 'ms-test',
  startedAt: Date.now() - 3600000,
  endedAt: Date.now(),
  modeName: 'Sales',
  notesSectionTitles: ['Overview', 'Pipeline'],
  transcriptLines: [],
  exchanges: [],
}

for (let i = 0; i < 180; i += 1) {
  snap.transcriptLines.push({
    at: Date.now(),
    text: `Segment ${i}: We need to follow up on pricing objection for enterprise buyer ACME by Friday. Discuss ROI and annual commit terms.`,
  })
}
snap.exchanges.push({
  at: Date.now(),
  question: 'How do I handle the discount ask?',
  answer: 'Anchor on ROI and annual commit before discussing percentage.',
})

const chunks = chunkTranscriptLines(snap.transcriptLines)
if (chunks.length < 2) fail('chunking long transcript', new Error(`got ${chunks.length} chunks`))
else pass(`chunkTranscriptLines (${chunks.length} chunks)`)

if (estimateMaterialSize(snap) <= SINGLE_PASS_CHAR_LIMIT) {
  fail('material size over limit', new Error(String(estimateMaterialSize(snap))))
} else pass(`estimateMaterialSize over single-pass (${estimateMaterialSize(snap)} chars)`)

const headings = resolveSectionHeadings(snap)
if (!headings.some((h) => /objection/i.test(h)) && !headings.includes('Objections & responses')) {
  fail('sales mode sections', new Error(JSON.stringify(headings)))
} else pass('resolveSectionHeadings sales extras')

const fallback = buildFallbackSummary(snap)
for (const section of ['Overview', 'Key points', 'Action items', 'Notable Q&A']) {
  if (!fallback.includes(section)) fail(`fallback section ${section}`, new Error('missing'))
}
pass('buildFallbackSummary structured sections')

const partialCalls = []
const mergeCalls = []
const mockStore = {
  get(k) {
    if (k === 'provider') return 'groq'
    if (k === 'groqKey') return 'test-key'
    if (k === 'groqModel') return 'llama-test'
    return ''
  },
}
const result = await generateMeetingSummary(snap, {
  store: mockStore,
  getAiClient: () => ({
    completeChat: async (_p, _k, body) => {
      const sys = body.messages[0].content
      const user = body.messages[1].content
      if (sys.includes('ONE transcript segment')) {
        partialCalls.push(user.slice(0, 40))
        return '- Pricing objection for ACME\n- Follow up by Friday'
      }
      if (user.includes('PARTIAL NOTES')) {
        mergeCalls.push(1)
        return '## Overview\n- Sales call on ACME pricing.\n\n## Action items\n- Follow up by Friday'
      }
      return '## Overview\n- Sales call on ACME pricing and follow-up timeline.\n\n## Action items\n- Follow up by Friday'
    },
  }),
})

if (partialCalls.length < 2) fail('chunked partial LLM calls', new Error(String(partialCalls.length)))
else pass('generateMeetingSummary chunked partials')

if (!mergeCalls.length) fail('chunked merge LLM call', new Error('no merge'))
else pass('generateMeetingSummary merge pass')

if (result.source !== 'llm' || !result.text.includes('Overview')) {
  fail('chunked result', new Error(JSON.stringify(result)))
} else pass('generateMeetingSummary pipeline result')

console.log('')
console.log(`Done: ${passed} passed`)
process.exit(passed >= 7 ? 0 : 1)
