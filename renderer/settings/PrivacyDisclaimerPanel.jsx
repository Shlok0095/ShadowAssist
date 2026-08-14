// Copyright (c) 2026 VeilAssist. All rights reserved.

import React from 'react'
import { SettingsSection } from './SettingsComponents'

const BULLETS = [
  'Invisible mode uses Microsoft’s documented capture-exclusion APIs on VeilAssist’s own windows (best-effort on Windows 10 2004+).',
  'Does not hide from a physical camera, someone viewing your screen, or all capture software.',
  'macOS 15+ ScreenCaptureKit often ignores this — treat macOS as limited.',
  'On some builds the protected area may appear black instead of invisible.',
  'VeilAssist is not designed to defeat proctoring, employer monitoring, or security tools.',
  'Recording meeting audio may require consent under your local laws.',
]

export default function PrivacyDisclaimerPanel() {
  return (
    <SettingsSection title="Capture privacy (honest limits)">
      <div
        className="rounded-lg border px-4 py-3 text-[11px] leading-relaxed"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
      >
        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
          Best-effort software capture exclusion — not guaranteed invisibility
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-4">
          {BULLETS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </SettingsSection>
  )
}
