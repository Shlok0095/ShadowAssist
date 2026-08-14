// Copyright (c) 2026 VeilAssist. All rights reserved.
// Deterministic policy helpers for capture-protection verification scripts.

/** Stealth toggle maps directly to setContentProtection on managed windows. */
function contentProtectionEnabledForStealth(stealthMode) {
  return stealthMode === true
}

/** Windows documents WDA_EXCLUDEFROMCAPTURE via Electron on win32. */
function platformSupportsDocumentedCaptureExclusion(platform) {
  return platform === 'win32'
}

/** All app windows that must follow the stealth content-protection flag. */
const STEALTH_MANAGED_WINDOW_NAMES = [
  'overlayWindow',
  'settingsWindow',
  'consentWindow',
  'onboardingWindow',
  'globalChatWindow',
  'launcherWindow',
]

/** Windows excluded from stealth protection (e.g. meeting toast chip). */
const STEALTH_EXCLUDED_WINDOW_NAMES = ['meetingToastWindow']

module.exports = {
  contentProtectionEnabledForStealth,
  platformSupportsDocumentedCaptureExclusion,
  STEALTH_MANAGED_WINDOW_NAMES,
  STEALTH_EXCLUDED_WINDOW_NAMES,
}
