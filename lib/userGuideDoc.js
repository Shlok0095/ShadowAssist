// Copyright (c) 2026 VeilAssist. All rights reserved.
// Loads concatenated user guide for in-app Help panel.

const fs = require('fs')
const path = require('path')

const GUIDE_FILES = [
  '01-overview.md',
  '02-install-and-first-launch.md',
  '03-overlay.md',
  '04-listen-and-transcription.md',
  '05-asking-ai.md',
  '06-profile-and-skills.md',
  '07-ai-providers.md',
  '08-intelligence-and-memory.md',
  '09-calendar-and-recaps.md',
  '10-phone.md',
  '11-global-chat-and-launcher.md',
  '12-keybinds.md',
  '13-privacy-and-data.md',
  '14-troubleshooting.md',
]

function resolveGuideDir() {
  const candidates = [
    path.join(__dirname, '..', 'docs', 'user-guide'),
    path.join(__dirname, '..', '..', 'docs', 'user-guide'),
  ]
  for (const dir of candidates) {
    try {
      if (fs.existsSync(path.join(dir, GUIDE_FILES[0]))) return dir
    } catch (_) {}
  }
  return null
}

function loadUserGuideMarkdown() {
  const guideDir = resolveGuideDir()
  if (!guideDir) return null
  const parts = []
  for (const name of GUIDE_FILES) {
    const filePath = path.join(guideDir, name)
    try {
      if (fs.existsSync(filePath)) parts.push(fs.readFileSync(filePath, 'utf8').trim())
    } catch (_) {}
  }
  if (!parts.length) return null
  return parts.join('\n\n---\n\n')
}

module.exports = { GUIDE_FILES, loadUserGuideMarkdown, resolveGuideDir }
