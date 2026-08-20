#!/usr/bin/env node
/**
 * General → Answers & screenshots wiring (CAR + Conversational + Short combo, etc.)
 *
 * Usage: node scripts/test-general-answer-settings-wiring.cjs
 */
const fs = require('fs')
const path = require('path')

const catalog = require('../lib/interviewSettingsCatalog.cjs')
const { getInterviewAnswerSuffixFromStore } = require('../lib/interviewAnswerPrompt.cjs')
const { buildAiResponseLanguageBlock } = require('../lib/aiResponseLanguage.cjs')

const ROOT = path.join(__dirname, '..')
const mainSrc = fs.readFileSync(path.join(ROOT, 'main', 'index.js'), 'utf8')
const settingsApp = fs.readFileSync(path.join(ROOT, 'renderer', 'settings', 'App.jsx'), 'utf8')
const displayPanel = fs.readFileSync(path.join(ROOT, 'renderer', 'settings', 'DisplaySettingsPanel.jsx'), 'utf8')
const tabContent = fs.readFileSync(path.join(ROOT, 'renderer', 'settings', 'SettingsTabContent.jsx'), 'utf8')
const overlayApp = fs.readFileSync(path.join(ROOT, 'renderer', 'overlay', 'App.jsx'), 'utf8')
const storeSrc = fs.readFileSync(path.join(ROOT, 'lib', 'store.js'), 'utf8')

const results = []
function pass(name, detail = '') {
  results.push({ ok: true, name, detail })
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`)
}
function fail(name, detail = '') {
  results.push({ ok: false, name, detail })
  console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
}

console.log('\n── General answer settings wiring ──\n')

// 1. User screenshot combo: CAR + Conversational + Short
const comboStore = {
  _data: {
    answerStructure: 'car',
    responseFormat: 'conversational',
    answerLength: 'short',
    aiResponseLanguage: '',
    overlayAnswerAutoScroll: true,
  },
  get(k) {
    return this._data[k]
  },
}
const comboSuffix = getInterviewAnswerSuffixFromStore(comboStore)
if (/CAR/i.test(comboSuffix) && /filler|Hmm|conversational/i.test(comboSuffix) && /80 words/i.test(comboSuffix)) {
  pass('CAR + Conversational + Short → prompt suffix')
} else {
  fail('CAR + Conversational + Short → prompt suffix', comboSuffix.slice(0, 200))
}
if (/SPOKEN INTERVIEW MODE/i.test(comboSuffix) && /REQUIRED.*Hmm/i.test(comboSuffix)) {
  pass('Conversational adds spoken override (Hmm/umm parity with Android)')
} else {
  fail('Conversational adds spoken override (Hmm/umm parity with Android)', comboSuffix.slice(-220))
}

const comboTokens = catalog.maxTokensForAnswerLength('short')
if (comboTokens === 600) pass('Short answer length → 600 max tokens', String(comboTokens))
else fail('Short answer length → 600 max tokens', String(comboTokens))

const comboStyle = catalog.overlayDisplayStyleFromFormat('conversational')
if (comboStyle === 'detailed') pass('Conversational format → detailed overlay layout')
else fail('Conversational format → detailed overlay layout', comboStyle)

const comboFont = catalog.fontSizeFromAnswerLength('short')
if (comboFont === 'small') pass('Short answer length → small overlay font when auto-scroll on')
else fail('Short answer length → small overlay font', comboFont)

// 2. Language block (default empty)
if (!buildAiResponseLanguageBlock('')) pass('Empty language → no prompt block')
else fail('Empty language → no prompt block')

comboStore._data.aiResponseLanguage = 'hi'
const withLang = buildAiResponseLanguageBlock(comboStore.get('aiResponseLanguage'))
if (/Respond in Hindi/i.test(withLang)) pass('Hindi language → system prompt block')
else fail('Hindi language → system prompt block', withLang)

// 3. Settings UI → handlers (static)
const handlerChecks = [
  ['applyAnswerStructure', "save('answerStructure'"],
  ['applyResponseFormat', "save('responseFormat'"],
  ['applyResponseFormat', 'apply-overlay-display'],
  ['applyAnswerLength', "save('answerLength'"],
  ['applyAnswerLength', 'fontSizeFromAnswerLength'],
  ['applyAiResponseLanguage', "save('aiResponseLanguage'"],
  ['applyInterviewCustomInstructions', "save('interviewCustomInstructions'"],
]
for (const [fn, needle] of handlerChecks) {
  const idx = settingsApp.indexOf(`const ${fn}`)
  const chunk = idx >= 0 ? settingsApp.slice(idx, idx + 600) : ''
  if (chunk.includes(needle)) pass(`App.jsx ${fn} → ${needle}`)
  else fail(`App.jsx ${fn} → ${needle}`)
}

// 4. DisplaySettingsPanel props wired through SettingsTabContent
const panelProps = [
  'answerStructureUi',
  'onAnswerStructureChange',
  'responseFormatUi',
  'onResponseFormatChange',
  'answerLengthUi',
  'onAnswerLengthChange',
  'aiResponseLanguageUi',
  'onAiResponseLanguageChange',
  'interviewCustomInstructionsUi',
  'onInterviewCustomInstructionsChange',
]
for (const prop of panelProps) {
  if (displayPanel.includes(prop) && tabContent.includes(prop)) pass(`General tab wires ${prop}`)
  else fail(`General tab wires ${prop}`)
}

// 5. Main process: answer length + auto-scroll → overlay font
if (mainSrc.includes('fontSizeFromAnswerLength') && mainSrc.includes('overlayFontPayloadForAnswerLength')) {
  pass('main/index.js couples answerLength → overlayFontSize when auto-scroll on')
} else {
  fail('main/index.js couples answerLength → overlayFontSize when auto-scroll on')
}
if (mainSrc.includes('overlayFontPayloadForAutoScrollToggle')) {
  pass('main/index.js syncs font when auto-scroll toggled on')
} else {
  fail('main/index.js syncs font when auto-scroll toggled on')
}

// 6. Overlay resolves font from answer length on startup when auto-scroll on
if (overlayApp.includes('fontSizeFromAnswerLength') && overlayApp.includes('overlayAnswerAutoScroll')) {
  pass('overlay App.jsx resolves font from answer length + auto-scroll on load')
} else {
  fail('overlay App.jsx resolves font from answer length + auto-scroll on load')
}
if (overlayApp.includes("p?.overlayFontSize")) {
  pass('overlay App.jsx applies overlayFontSize from display updates')
} else {
  fail('overlay App.jsx applies overlayFontSize from display updates')
}

// 7. Store schema includes answer settings keys
const storeKeys = ['answerStructure', 'responseFormat', 'answerLength', 'aiResponseLanguage', 'interviewCustomInstructions']
for (const key of storeKeys) {
  if (new RegExp(`${key}:\\s*\\{`).test(storeSrc)) pass(`store.js defines ${key}`)
  else fail(`store.js defines ${key}`)
}

// 8. Answers section copy matches behavior
if (displayPanel.includes('Answers & screenshots') && displayPanel.includes('auto-scroll is on')) {
  pass('DisplaySettingsPanel documents answer-length → font coupling')
} else {
  fail('DisplaySettingsPanel documents answer-length → font coupling')
}

// 9. All structures normalize and reach prompt
for (const s of ['star', 'car', 'soar', 'par', 'soara']) {
  const norm = catalog.normalizeAnswerStructure(s)
  const prompt = catalog.structurePrompt(norm)
  if (prompt && prompt.length > 10) pass(`structure ${s} → prompt`)
  else fail(`structure ${s} → prompt`)
}

// 10. Custom instructions — Android parity
const customSuffix = catalog.buildInterviewAnswerSuffix({
  answerStructure: 'star',
  responseFormat: 'bullets',
  answerLength: 'medium',
  customInstructions: 'Add filler words to sound natural',
})
if (/Custom instructions: Add filler words/i.test(customSuffix)) {
  pass('custom instructions appended to interview suffix (Android parity)')
} else {
  fail('custom instructions appended to interview suffix', customSuffix.slice(-120))
}

const mockCustomStore = {
  _data: { answerStructure: 'star', responseFormat: 'bullets', answerLength: 'medium', interviewCustomInstructions: 'Use Hinglish fillers' },
  get(k) { return this._data[k] },
}
const fromCustomStore = getInterviewAnswerSuffixFromStore(mockCustomStore)
if (/Custom instructions: Use Hinglish fillers/i.test(fromCustomStore)) {
  pass('getInterviewAnswerSuffixFromStore includes custom instructions')
} else {
  fail('getInterviewAnswerSuffixFromStore includes custom instructions', fromCustomStore)
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) process.exit(1)
