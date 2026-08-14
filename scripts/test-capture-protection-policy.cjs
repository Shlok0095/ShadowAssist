#!/usr/bin/env node
/**
 * Policy unit tests for capture-protection helpers.
 * Usage: node scripts/test-capture-protection-policy.cjs
 */
const test = require('node:test')
const assert = require('node:assert/strict')
const policy = require('../lib/captureProtectionPolicy.cjs')

test('stealth mode enables content protection', () => {
  assert.equal(policy.contentProtectionEnabledForStealth(true), true)
  assert.equal(policy.contentProtectionEnabledForStealth(false), false)
})

test('documented capture exclusion is Windows-only', () => {
  assert.equal(policy.platformSupportsDocumentedCaptureExclusion('win32'), true)
  assert.equal(policy.platformSupportsDocumentedCaptureExclusion('darwin'), false)
})

test('launcher is in stealth-managed window list', () => {
  assert.ok(policy.STEALTH_MANAGED_WINDOW_NAMES.includes('launcherWindow'))
})

test('meeting toast stays outside stealth-managed list', () => {
  assert.ok(policy.STEALTH_EXCLUDED_WINDOW_NAMES.includes('meetingToastWindow'))
  assert.equal(
    policy.STEALTH_MANAGED_WINDOW_NAMES.includes('meetingToastWindow'),
    false,
  )
})
