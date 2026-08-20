/**
 * Static checks — Task Manager grouping follows overlay Visible/Invisible toggle (stealth_mode).
 */
const fs = require('fs')
const path = require('path')

const mainSrc = fs.readFileSync(path.join(__dirname, '..', 'main', 'index.js'), 'utf8')
const problems = []

if (!mainSrc.includes('function shouldUseBackgroundProcessGrouping()')) {
  problems.push('main/index.js must define shouldUseBackgroundProcessGrouping()')
}
if (!mainSrc.includes('function syncTaskManagerGrouping()')) {
  problems.push('main/index.js must define syncTaskManagerGrouping()')
}
if (mainSrc.includes('runAsBackgroundProcess')) {
  problems.push('runAsBackgroundProcess toggle must be removed')
}
if (!mainSrc.includes('isStealthModeEnabled()')) {
  problems.push('shouldUseBackgroundProcessGrouping must use isStealthModeEnabled()')
}
if (!mainSrc.includes('backgroundProcessPolicyActive')) {
  problems.push('main/index.js must guard background refresh interval')
}
if (!mainSrc.includes('restoreNormalAppWindowPolicy')) {
  problems.push('main/index.js missing restoreNormalAppWindowPolicy')
}

if (problems.length) {
  console.error('verify-background-process-config FAILED')
  for (const p of problems) console.error(' -', p)
  process.exit(1)
}

console.log('OK verify-background-process-config')
