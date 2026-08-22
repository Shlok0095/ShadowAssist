#!/usr/bin/env node
/**
 * Desktop interview settings wiring — parity with mobile interview session.
 * Verifies structure/format always reach the Ask AI system prompt (manual + auto).
 *
 * Usage: node scripts/test-desktop-interview-wiring.cjs
 */
const assert = require('assert')
const path = require('path')

const catalog = require('../lib/interviewSettingsCatalog.cjs')
const { getInterviewAnswerSuffixFromStore } = require('../lib/interviewAnswerPrompt.cjs')
const { buildAiResponseLanguageBlock } = require('../lib/aiResponseLanguage.cjs')
const { isLikelySelfReadback, stripSelfReadback } = require('../lib/selfReadback.cjs')

/** Mirrors main/index.js handleAskAI prompt tail (language + interview suffix). */
function simulateAskPromptTail(store) {
  return `${buildAiResponseLanguageBlock(store.get('aiResponseLanguage'))}\n\n---\n${getInterviewAnswerSuffixFromStore(store)}`
}

const results = []
function pass(name, detail = '') {
  results.push({ ok: true, name, detail })
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`)
}
function fail(name, detail = '') {
  results.push({ ok: false, name, detail })
  console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
}

console.log('\n── Desktop interview wiring ──\n')

// 1. minChars parity with mobile
const mobileThresholds = { low: 24, medium: 14, high: 6 }
for (const [level, expected] of Object.entries(mobileThresholds)) {
  const got = catalog.minCharsForDetection(level)
  if (got === expected) pass(`minCharsForDetection(${level})`, String(got))
  else fail(`minCharsForDetection(${level})`, `expected ${expected}, got ${got}`)
}

// 2. boost sensitivity lowers threshold (mobile useInterviewSession parity)
const boosted = catalog.effectiveMinSpeechChars('high', 'boost')
if (boosted === 8) pass('effectiveMinSpeechChars boost', String(boosted))
else fail('effectiveMinSpeechChars boost', `expected 8, got ${boosted}`)

// 3. Structure + format always in suffix
const suffix = catalog.buildInterviewAnswerSuffix({
  answerStructure: 'star',
  responseFormat: 'conversational',
  answerLength: 'medium',
})
if (/STAR/i.test(suffix) && /filler|conversational|Hmm/i.test(suffix) && /180 words/i.test(suffix)) {
  pass('buildInterviewAnswerSuffix includes structure + format + medium length')
} else {
  fail('buildInterviewAnswerSuffix includes structure + format + medium length', suffix.slice(0, 120))
}

// 3b. Conversational includes desktop spoken override (Android parity)
const convSuffix = catalog.buildInterviewAnswerSuffix({
  answerStructure: 'car',
  responseFormat: 'conversational',
  answerLength: 'short',
})
if (/SPOKEN INTERVIEW MODE/i.test(convSuffix) && /REQUIRED.*Hmm/i.test(convSuffix)) {
  pass('conversational suffix includes spoken override for fillers')
} else {
  fail('conversational suffix includes spoken override for fillers', convSuffix.slice(-200))
}

// 3c. Example-driven overrides Takeaway/plaintext and forbids fillers
const exampleSuffix = catalog.buildInterviewAnswerSuffix({
  answerStructure: 'car',
  responseFormat: 'example',
  answerLength: 'medium',
})
if (
  /EXAMPLE-DRIVEN/i.test(exampleSuffix)
  && /CAR/i.test(exampleSuffix)
  && /Do NOT open with filler/i.test(exampleSuffix)
  && !/REQUIRED.*Hmm/i.test(exampleSuffix)
) {
  pass('example-driven suffix includes CAR + no-filler override')
} else {
  fail('example-driven suffix includes CAR + no-filler override', exampleSuffix.slice(-280))
}

// 4. Conversational format includes filler guidance (mobile formatPrompt parity)
const conv = catalog.formatPrompt('conversational')
if (/basically|Hmm|filler/i.test(conv)) pass('conversational formatPrompt fillers')
else fail('conversational formatPrompt fillers')

// 5. Mock store — suffix always has structure + format regardless of auto flags
const mockStore = {
  _data: {
    answerStructure: 'car',
    responseFormat: 'bullets',
    answerLength: 'short',
    assistAutoTrigger: false,
    overlayAnswerAutoScroll: false,
  },
  get(k) {
    return this._data[k]
  },
}
const fromStore = getInterviewAnswerSuffixFromStore(mockStore)
if (/CAR/i.test(fromStore) && /bullet/i.test(fromStore) && /80 words/i.test(fromStore)) {
  pass('getInterviewAnswerSuffixFromStore (manual mode)')
} else {
  fail('getInterviewAnswerSuffixFromStore (manual mode)', fromStore)
}

mockStore._data.assistAutoTrigger = true
mockStore._data.overlayAnswerAutoScroll = true
const fromStoreAuto = getInterviewAnswerSuffixFromStore(mockStore)
if (/CAR/i.test(fromStoreAuto) && /bullet/i.test(fromStoreAuto)) {
  pass('getInterviewAnswerSuffixFromStore (auto-answer on — same prompt rules)')
} else {
  fail('getInterviewAnswerSuffixFromStore (auto mode)', fromStoreAuto)
}

// 6. Language block independent of auto flags
mockStore._data.aiResponseLanguage = 'hi'
mockStore._data.assistAutoTrigger = false
mockStore._data.overlayAnswerAutoScroll = false
const manualTail = simulateAskPromptTail(mockStore)
if (/Respond in Hindi/i.test(manualTail) && /CAR/i.test(manualTail)) {
  pass('language + structure/format in prompt tail (manual mode)')
} else {
  fail('language + structure/format in prompt tail (manual mode)', manualTail.slice(0, 160))
}
mockStore._data.assistAutoTrigger = true
mockStore._data.overlayAnswerAutoScroll = true
const autoTail = simulateAskPromptTail(mockStore)
if (manualTail === autoTail) {
  pass('prompt tail identical with auto-answer + auto-scroll on')
} else {
  fail('prompt tail differs when auto flags toggled')
}

// 7. maxTokens from answerLength (same for all ask paths)
const tokenCases = [
  ['short', 600],
  ['medium', 1400],
  ['long', 1800],
]
for (const [len, expected] of tokenCases) {
  const got = catalog.maxTokensForAnswerLength(len)
  if (got === expected) pass(`maxTokensForAnswerLength(${len})`, String(got))
  else fail(`maxTokensForAnswerLength(${len})`, `expected ${expected}, got ${got}`)
}

// 8. main/index.js uses interview suffix + language (static grep)
const fs = require('fs')
const mainSrc = fs.readFileSync(path.join(__dirname, '..', 'main', 'index.js'), 'utf8')
if (mainSrc.includes('getInterviewAnswerSuffixFromStore(store)')) {
  pass('main/index.js wires interview suffix into Ask path')
} else {
  fail('main/index.js wires interview suffix into Ask path')
}
if (mainSrc.includes("buildAiResponseLanguageBlock(store.get('aiResponseLanguage'))")) {
  pass('main/index.js wires aiResponseLanguage into Ask path')
} else {
  fail('main/index.js wires aiResponseLanguage into Ask path')
}
if (mainSrc.includes('maxTokensForAnswerLength(answerLength')) {
  pass('main/index.js wires answerLength → maxTokens in Ask path')
} else {
  fail('main/index.js wires answerLength → maxTokens in Ask path')
}
const handleAskChunk = mainSrc.slice(mainSrc.indexOf('async function handleAskAI'), mainSrc.indexOf('async function handleAskAI') + 12000)
if (!/assistAutoTrigger/.test(handleAskChunk) && !/overlayAnswerAutoScroll/.test(handleAskChunk)) {
  pass('handleAskAI does not gate prompt on auto-answer or auto-scroll')
} else {
  fail('handleAskAI gates prompt on auto-answer or auto-scroll')
}
if (!mainSrc.includes('getAnswerStyleSuffix(')) {
  pass('main/index.js no longer uses legacy answerStyle suffix alone')
} else {
  fail('main/index.js still uses getAnswerStyleSuffix')
}

// 9. Overlay manual + auto share same IPC ask path
const overlayApp = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'overlay', 'App.jsx'), 'utf8')
if (overlayApp.includes("ipc?.invoke('ask-ai-with-transcript'") && overlayApp.includes('opts.auto === true')) {
  pass('overlay App.jsx: manual and auto both invoke ask-ai-with-transcript')
} else {
  fail('overlay App.jsx: shared ask IPC path')
}

// 10. Settings UI exposes structure/format + language
const displayPanel = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'settings', 'DisplaySettingsPanel.jsx'), 'utf8')
if (displayPanel.includes('Answer structure') && displayPanel.includes('Response format')) {
  pass('DisplaySettingsPanel interview answer controls (General)')
} else {
  fail('DisplaySettingsPanel interview answer controls (General)')
}

// 11. Self-readback — mobile parity (auto-answer overlay gate only)
const answer =
  'Hmm, basically I led a migration project where we moved our payment stack to AWS and reduced latency by forty percent.'
const readback =
  'Hmm basically I led a migration project where we moved our payment stack to AWS and reduced latency by forty percent'
if (isLikelySelfReadback(readback, answer)) pass('isLikelySelfReadback detects answer readback')
else fail('isLikelySelfReadback detects answer readback')
const followUp =
  'Hmm basically I led a migration project where we moved our payment stack to AWS. What would you do differently next time?'
const tail = stripSelfReadback(followUp, answer)
if (tail.includes('differently') && !/migration project/.test(tail)) {
  pass('stripSelfReadback keeps genuine follow-up tail')
} else {
  fail('stripSelfReadback keeps genuine follow-up tail', tail)
}
if (overlayApp.includes('assistAutoTriggerRef.current') && overlayApp.includes('stripSelfReadback')) {
  pass('overlay App.jsx gates self-readback on auto-answer')
} else {
  fail('overlay App.jsx gates self-readback on auto-answer')
}

if (displayPanel.includes('Custom instructions') && displayPanel.includes('Add filler words to sound natural')) {
  pass('DisplaySettingsPanel custom instructions field (General)')
} else {
  fail('DisplaySettingsPanel custom instructions field (General)')
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) process.exit(1)
