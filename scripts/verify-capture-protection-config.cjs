#!/usr/bin/env node
/**
 * Static guard for stealth / capture-exclusion wiring in main/index.js.
 * Usage: node scripts/verify-capture-protection-config.cjs
 */
const fs = require('fs')
const path = require('path')
const {
  STEALTH_MANAGED_WINDOW_NAMES,
  STEALTH_EXCLUDED_WINDOW_NAMES,
} = require('../lib/captureProtectionPolicy.cjs')

const mainSrc = fs.readFileSync(path.join(__dirname, '..', 'main', 'index.js'), 'utf8')
const problems = []

if (!mainSrc.includes('function isStealthModeEnabled()')) {
  problems.push('missing isStealthModeEnabled()')
}
if (!mainSrc.includes('function applyOverlayContentProtection')) {
  problems.push('missing applyOverlayContentProtection()')
}
if (!mainSrc.includes('function reassertStealthCaptureExclusionAfterWin32()')) {
  problems.push('missing reassertStealthCaptureExclusionAfterWin32()')
}
if (!mainSrc.includes('function withOverlayExcludedFromScreenCapture')) {
  problems.push('missing withOverlayExcludedFromScreenCapture()')
}
if (!mainSrc.includes('setContentProtection')) {
  problems.push('setContentProtection must be used for stealth')
}
if (!mainSrc.includes('STEALTH_OPACITY_SHIELD')) {
  problems.push('opacity shield timing must be defined')
}

const managedBlock = mainSrc.match(/function getStealthManagedWindows\(\)[\s\S]*?^\}/m)
if (!managedBlock) {
  problems.push('getStealthManagedWindows() not found')
} else {
  for (const name of STEALTH_MANAGED_WINDOW_NAMES) {
    if (!managedBlock[0].includes(name)) {
      problems.push(`getStealthManagedWindows() must include ${name}`)
    }
  }
  for (const name of STEALTH_EXCLUDED_WINDOW_NAMES) {
    if (managedBlock[0].includes(name)) {
      problems.push(`getStealthManagedWindows() must NOT include ${name}`)
    }
  }
}

if (problems.length) {
  console.error('verify-capture-protection-config FAILED')
  for (const p of problems) console.error(' -', p)
  process.exit(1)
}

console.log('OK verify-capture-protection-config')
