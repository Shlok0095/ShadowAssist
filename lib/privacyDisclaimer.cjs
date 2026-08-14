// Copyright (c) 2026 VeilAssist. All rights reserved.
// Honest capture-privacy wording (cue-style threat model). Not legal advice.

const CAPTURE_PRIVACY_SHORT =
  'Hide from software screen capture (Windows, best-effort). Not invisible to cameras, people, or all capture tools.'

const CAPTURE_PRIVACY_BULLETS = [
  'When Invisible (stealth) is ON, VeilAssist uses Microsoft’s documented SetWindowDisplayAffinity / Electron setContentProtection on your own app windows — the same class of API used by recording-control UIs and PowerToys-style tooling.',
  'Best-effort on Windows 10 (2004+) and later for standard screen-share and recording pipelines (e.g. Teams, Zoom, OBS using default capture).',
  'Does not hide from a physical camera pointed at your monitor, someone looking at your screen, or OCR on visible UI.',
  'macOS 15+ ScreenCaptureKit often ignores legacy capture exclusion — treat macOS as limited.',
  'On some Chromium builds the protected region may appear black instead of invisible (Electron #45990).',
  'VeilAssist is not designed to defeat proctoring, employer monitoring, or third-party security products.',
  'Recording meeting audio may require consent under local law (two-party recording rules).',
]

const ABOUT_FEATURE_CARDS = [
  { label: 'Capture privacy', desc: 'Optional hide from software screen capture (Windows, best-effort)' },
  { label: 'AI-powered', desc: 'Answers from your chosen LLM provider' },
  { label: 'Private', desc: 'Audio & screenshots never stored on disk by default' },
]

module.exports = {
  CAPTURE_PRIVACY_SHORT,
  CAPTURE_PRIVACY_BULLETS,
  ABOUT_FEATURE_CARDS,
}
