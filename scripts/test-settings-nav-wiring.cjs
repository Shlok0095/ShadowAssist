#!/usr/bin/env node
/**
 * Settings nav + panel wiring after Profile / Advance split.
 * Usage: node scripts/test-settings-nav-wiring.cjs
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8')
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

console.log('\n── Settings nav wiring ──\n')

const navSrc = read('renderer/settings/settingsNav.jsx')
const tabSrc = read('renderer/settings/SettingsTabContent.jsx')
const profileSrc = read('renderer/settings/ProfileSettingsPanel.jsx')
const advanceSrc = read('renderer/settings/AdvanceSettingsPanel.jsx')
const displaySrc = read('renderer/settings/DisplaySettingsPanel.jsx')
const aiSrc = read('renderer/settings/AiProviderPanel.jsx')
const meetingsSrc = read('renderer/settings/MeetingsSettingsPanel.jsx')
const appSrc = read('renderer/settings/App.jsx')

const tabIds = [...navSrc.matchAll(/id: '([^']+)'/g)].map((m) => m[1])
const expectedTabs = ['display', 'profile', 'advance', 'keybinds', 'meetings', 'privacy', 'help', 'about']
if (JSON.stringify(tabIds) === JSON.stringify(expectedTabs)) {
  pass('SETTINGS_TABS order', tabIds.join(', '))
} else {
  fail('SETTINGS_TABS order', `got ${tabIds.join(', ')}`)
}

if (navSrc.includes("label: 'Profile'") && navSrc.includes("label: 'Advance'") && navSrc.includes("label: 'Meeting'")) {
  pass('Profile + Advance + Meeting labels in nav')
} else {
  fail('Profile + Advance + Meeting labels in nav')
}

if (!navSrc.includes("label: 'Calendar'") && !navSrc.includes("label: 'AI Providers'")) {
  pass('removed top-level Calendar and AI Providers tabs')
} else {
  fail('old top-level tabs still in nav')
}

if (navSrc.includes('LEGACY_PROFILE_TAB_IDS') && navSrc.includes('LEGACY_ADVANCE_TAB_IDS')) {
  pass('legacy tab id sets for profile and advance')
} else {
  fail('legacy tab id sets missing')
}

if (navSrc.includes("if (id === 'profile'") && navSrc.includes("LEGACY_PROFILE_TAB_IDS.has(id)) return 'profile'")) {
  pass('skills legacy id maps to profile tab')
} else {
  fail('skills legacy mapping')
}

if (navSrc.includes("LEGACY_ADVANCE_TAB_IDS.has(id)) return 'advance'")) {
  pass('ai/speech/phone/intelligence map to advance')
} else {
  fail('advance legacy mapping')
}

if (tabSrc.includes("activeTab === 'profile'") && tabSrc.includes('ProfileSettingsPanel')) {
  pass('SettingsTabContent routes profile tab')
} else {
  fail('SettingsTabContent profile route')
}

if (tabSrc.includes("activeTab === 'advance'") && tabSrc.includes('AdvanceSettingsPanel')) {
  pass('SettingsTabContent routes advance tab')
} else {
  fail('SettingsTabContent advance route')
}

if (profileSrc.includes('Modes & background') && profileSrc.includes('SkillsSettingsPanel')) {
  pass('Profile tab contains modes + skills')
} else {
  fail('Profile tab missing modes or skills')
}

if (!advanceSrc.includes('ProfileModesPanel') && !advanceSrc.includes('SkillsSettingsPanel')) {
  pass('Advance tab does not include profile or skills')
} else {
  fail('Advance still contains profile/skills')
}

for (const section of ['AI Providers', 'Audio', 'Phone', 'Intelligence']) {
  if (advanceSrc.includes(`title="${section}"`)) pass(`Advance section: ${section}`)
  else fail(`Advance section missing: ${section}`)
}

if (displaySrc.includes('Answers & screenshots') && displaySrc.includes('Answer structure')) {
  pass('General has Answers & screenshots section')
} else {
  fail('General missing Answers & screenshots')
}

if (!aiSrc.includes('Interview answers')) {
  pass('AI Providers panel no longer owns interview answers')
} else {
  fail('AI Providers still has Interview answers section')
}

if (meetingsSrc.includes('title="Meeting"')) {
  pass('Meetings panel titled Meeting')
} else {
  fail('Meetings panel title not updated')
}

if (appSrc.includes("useState('display')") && appSrc.includes('normalizeSettingsTabId')) {
  pass('App defaults to General and normalizes tab ids')
} else {
  fail('App tab default/normalize')
}

if (appSrc.includes("setActiveTab('advance')")) {
  pass('first-run opens Advance tab (API setup)')
} else {
  fail('first-run should open Advance')
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) process.exit(1)
