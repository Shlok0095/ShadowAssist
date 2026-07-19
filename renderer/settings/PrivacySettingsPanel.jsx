// Copyright (c) 2026 VeilAssist. All rights reserved.

import React from 'react'
import { createIpcShim } from '../shared/ipcShim'
import { SettingsPage, SettingsSection } from './SettingsComponents'

const ipc = createIpcShim()

export default function PrivacySettingsPanel({ onSelectIntelligenceTab }) {
  return (
    <SettingsPage title="Privacy" description="What stays on your device and how to export or delete local data.">
      <SettingsSection title="Intelligence & memory">
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Context routing, long-term memory, Hindsight recall, and smart mode suggestions live under{' '}
          <button
            type="button"
            onClick={() => onSelectIntelligenceTab?.()}
            className="text-accent underline underline-offset-2 hover:opacity-90"
          >
            Intelligence
          </button>
          .
        </p>
      </SettingsSection>

      <SettingsSection title="What stays on this device">
        <ul className="space-y-3 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <li className="flex gap-2">
            <span style={{ color: 'var(--text-tertiary)' }}>·</span>
            <span>Profile notes, preferences, and encrypted API keys (Windows DPAPI).</span>
          </li>
          <li className="flex gap-2">
            <span style={{ color: 'var(--text-tertiary)' }}>·</span>
            <span>Session recaps (when you Stop Listen) are saved locally. Live transcript buffers are cleared.</span>
          </li>
          <li className="flex gap-2">
            <span style={{ color: 'var(--text-tertiary)' }}>·</span>
            <span>Audio is never stored. Only text sent to your chosen AI provider when you ask.</span>
          </li>
        </ul>
      </SettingsSection>

      <SettingsSection title="Your data">
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Export includes profile text, consent record, and preferences — not API keys, raw audio, or live buffers.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={async () => {
              if (!ipc) return
              const r = await ipc.invoke('export-user-data')
              if (r?.ok && r.path) {
                window.alert(`Exported to ${r.path}`)
              }
            }}
            className="nat-btn-primary px-5 py-2.5 text-[13px]"
          >
            Export my data
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!ipc) return
              if (!window.confirm('Delete all local VeilAssist data and restart? This cannot be undone.')) return
              await ipc.invoke('delete-all-data-relaunch')
            }}
            className="nat-btn-secondary border-rose-500/30 px-5 py-2.5 text-[13px] text-rose-300 hover:bg-rose-500/10"
          >
            Delete all my data
          </button>
        </div>
      </SettingsSection>
    </SettingsPage>
  )
}
