// Copyright (c) 2026 VeilAssist. All rights reserved.
// Static guard for the Hide From Taskbar / Dock feature.
// Verifies main/index.js:
//   1. Every BrowserWindow is created with `skipTaskbar` in its options
//      (Windows/Linux create the taskbar button on FIRST show — constructor
//      flags are the only reliable way to suppress it).
//   2. Every window is also covered by the always-hidden re-assert loop in
//      applyTaskbarVisibility() (consent, onboarding, launcher, meeting
//      toast must not fall through the cracks again).
// Usage: node scripts/verify-taskbar-config.cjs

const fs = require('fs')
const path = require('path')

const src = fs.readFileSync(path.join(__dirname, '..', 'main', 'index.js'), 'utf8')
const problems = []

const windowVars = ['overlayWindow', 'settingsWindow', 'globalChatWindow', 'launcherWindow', 'consentWindow', 'onboardingWindow', 'meetingToastWindow']

for (const v of windowVars) {
  const m = src.match(new RegExp(`${v}\\s*=\\s*new\\s+BrowserWindow\\(`))
  if (!m) {
    problems.push(`${v} creation site not found`)
    continue
  }
  const block = src.slice(m.index, m.index + 1800)
  const hasLiteral = /skipTaskbar\s*:/s.test(block)
  const hasWinOptsSpread = /\.\.\.winOpts/.test(block)
  if (!hasLiteral && !hasWinOptsSpread) {
    const line = src.slice(0, m.index).split('\n').length
    problems.push(`${v} (main/index.js:${line}) creation has no skipTaskbar option`)
  }
}

// winOpts shared by the overlay must itself carry skipTaskbar.
const winOpts = src.match(/const winOpts = \{[\s\S]*?\n  \}/)
if (winOpts && !/skipTaskbar\s*:/s.test(winOpts[0])) {
  problems.push('overlay winOpts object has no skipTaskbar option')
}

// The always-hidden re-assert loop in applyTaskbarVisibility() must list every
// non-overlay window, and the overlay must appear once outside it.
const loopStart = src.indexOf('for (const w of [', src.indexOf('function applyTaskbarVisibility'))
const loopEnd = src.indexOf('])', loopStart)
const loop = src.slice(loopStart, loopEnd)
for (const v of windowVars) {
  if (v === 'overlayWindow') {
    if (loop.includes(v)) problems.push(`applyTaskbarVisibility loop must NOT contain ${v}`)
  } else if (!loop.includes(v)) {
    problems.push(`applyTaskbarVisibility loop does not cover ${v}`)
  }
}

if (problems.length) {
  console.error('[verify-taskbar] FAIL')
  for (const p of problems) console.error('  ✗', p)
  process.exit(1)
}
console.log(`[verify-taskbar] OK — ${windowVars.length} windows: constructor skipTaskbar + re-assert loop coverage`)
