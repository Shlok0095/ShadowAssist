// Copyright (c) 2026 VeilAssist. All rights reserved.

import React from 'react'
import { Keyboard } from 'lucide-react'
import AppIcon from '../shared/AppIcon'
import { DEFAULT_HOTKEYS_MAP, HOTKEY_DEFS } from './settingsConstants'
import { SettingsPage, SettingsSection } from './SettingsComponents'

export default function KeybindsSettingsPanel({
  hotkeysMap,
  onHotkeyChange,
  onHotkeyCommit,
  onResetOneHotkey,
  onResetAllHotkeys,
}) {
  return (
    <SettingsPage
      title="Keyboard shortcuts"
      description="Global hotkeys work while VeilAssist runs in the tray. CommandOrControl = ⌘ on Mac, Ctrl on Windows."
    >
      <SettingsSection title="Shortcuts">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
            <AppIcon icon={Keyboard} size={14} />
            <span>Click a field, press your combo, then blur or Enter to save.</span>
          </div>
          <button type="button" onClick={onResetAllHotkeys} className="btn-ghost shrink-0 px-3 py-1.5 text-[11px]">
            Restore defaults
          </button>
        </div>
        <div className="space-y-1.5">
          {HOTKEY_DEFS.map(({ action, label }) => (
            <div
              key={action}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-2"
            >
              <span className="min-w-0 flex-1 text-[12px] text-zinc-400">{label}</span>
              <input
                type="text"
                spellCheck={false}
                autoComplete="off"
                value={hotkeysMap[action] ?? DEFAULT_HOTKEYS_MAP[action] ?? ''}
                onChange={(e) => onHotkeyChange(action, e.target.value)}
                onBlur={(e) => onHotkeyCommit(action, e.target.value)}
                className="input-shadow w-[min(100%,220px)] min-w-[160px] px-2 py-1.5 font-mono text-[11px]"
              />
              <button
                type="button"
                onClick={() => onResetOneHotkey(action)}
                className="rounded-md border border-white/[0.08] px-2 py-1 text-[10px] text-zinc-500 transition-colors hover:border-white/15 hover:text-zinc-300"
              >
                Reset
              </button>
            </div>
          ))}
        </div>
      </SettingsSection>
    </SettingsPage>
  )
}
