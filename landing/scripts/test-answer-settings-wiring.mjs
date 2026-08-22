/**
 * Verifies answer structure / response format / answer length are wired into
 * session chat payloads (prompt text + max_tokens).
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/mobile')
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')

const promptBuilder = read('promptBuilder.ts')
const session = read('useInterviewSession.ts')
const app = read('MobileInterviewApp.tsx')
const catalog = read('settingsCatalog.ts')

const results = []
const pass = (n) => {
  results.push({ ok: true, n })
  console.log('PASS ', n)
}
const fail = (n, d) => {
  results.push({ ok: false, n })
  console.log('FAIL ', n, d || '')
}

try {
  assert.match(promptBuilder, /answerStructure:\s*input\.settings\.answerStructure/)
  assert.match(promptBuilder, /responseFormat:\s*input\.settings\.responseFormat/)
  assert.match(promptBuilder, /answerLength:\s*input\.settings\.answerLength/)
  pass('promptBuilder reads all three from settings')
} catch (e) {
  fail('promptBuilder reads all three from settings', e.message)
}

try {
  assert.match(catalog, /Use STAR/)
  assert.match(catalog, /Use CAR/)
  assert.match(catalog, /Format as a natural spoken answer/)
  assert.match(catalog, /short bullet points/)
  pass('settingsCatalog maps structure + format prompts')
} catch (e) {
  fail('settingsCatalog maps structure + format prompts', e.message)
}

try {
  assert.match(promptBuilder, /structurePrompt\(input\.answerStructure\)/)
  assert.match(promptBuilder, /formatPrompt\(input\.responseFormat\)/)
  assert.match(promptBuilder, /Target under 80 words/)
  assert.match(promptBuilder, /Up to 250 words/)
  assert.match(promptBuilder, /Target under 180 words/)
  assert.match(
    promptBuilder,
    /answerLength === 'long' \? 1800 : answerLength === 'short' \? 600 : 1400/,
  )
  pass('system prompt + max_tokens honor length')
} catch (e) {
  fail('system prompt + max_tokens honor length', e.message)
}

try {
  assert.match(session, /settingsRef\.current = settings/)
  assert.match(session, /settings: currentSettings/)
  assert.match(session, /requestInterviewAnswer\(/)
  pass('session generate uses live settingsRef')
} catch (e) {
  fail('session generate uses live settingsRef', e.message)
}

try {
  assert.match(app, /useInterviewSession\(profile, settings\)/)
  assert.match(app, /onPatchSettings=\{updateSettings\}/)
  assert.match(app, /saveAppSettings\(next\)/)
  pass('app persists settings into live session')
} catch (e) {
  fail('app persists settings into live session', e.message)
}

try {
  assert.match(read('screens/SettingsScreen.tsx'), /answerStructure/)
  assert.match(read('screens/SettingsScreen.tsx'), /responseFormat/)
  assert.match(read('screens/SettingsScreen.tsx'), /answerLength/)
  pass('settings panel owns structure/format/length UI')
} catch (e) {
  fail('settings panel owns structure/format/length UI', e.message)
}

try {
  assert.match(read('providerChat.ts'), /buildChatPayload\(/)
  assert.match(read('providerChat.ts'), /settings: \{ \.\.\.params\.settings/)
  pass('providerChat rebuilds payload with settings on each attempt')
} catch (e) {
  fail('providerChat rebuilds payload with settings on each attempt', e.message)
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} answer-settings wiring checks passed`)
if (failed.length) process.exit(1)
