// Copyright (c) 2026 VeilAssist. All rights reserved.

import React, { useState } from 'react'
import { Keyboard } from 'lucide-react'
import AppIcon from '../shared/AppIcon'
import { DEFAULT_HOTKEYS_MAP, HOTKEY_DEFS } from './settingsConstants'
import { ConfirmDialog, SettingsCollapsible, SettingsPage, SettingsSection } from './SettingsComponents'
import { useBrand } from '../shared/branding'

/** Nudge + scroll shortcuts are power-user extras — tucked under a collapsed section. */
const MORE_SHORTCUT_ACTIONS = new Set(['moveUp', 'moveDown', 'moveLeft', 'moveRight', 'scrollUp', 'scrollDown'])

function HotkeyRow({ action, label, hotkeysMap, onHotkeyChange, onHotkeyCommit, onResetOneHotkey }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-2">
      <span className="settings-row-label min-w-0 flex-1 !text-[12px]">{label}</span>
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
  )
}

export default function KeybindsSettingsPanel({
  hotkeysMap,
  onHotkeyChange,
  onHotkeyCommit,
  onResetOneHotkey,
  onResetAllHotkeys,
}) {
  const { name } = useBrand()
  const [confirmResetAll, setConfirmResetAll] = useState(false)
  const primaryDefs = HOTKEY_DEFS.filter((d) => !MORE_SHORTCUT_ACTIONS.has(d.action))
  const moreDefs = HOTKEY_DEFS.filter((d) => MORE_SHORTCUT_ACTIONS.has(d.action))
  return (
    <SettingsPage
      title="Keyboard shortcuts"
      description={`Global hotkeys work while ${name} runs in the tray. CommandOrControl = ⌘ on Mac, Ctrl on Windows.`}
    >
      <SettingsSection title="Shortcuts">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
            <AppIcon icon={Keyboard} size={14} />
            <span>Click a field, press your combo, then blur or Enter to save.</span>
          </div>
          <button
            type="button"
            onClick={() => setConfirmResetAll(true)}
            className="btn-ghost shrink-0 px-3 py-1.5 text-[11px]"
          >
            Restore defaults
          </button>
        </div>
        <div className="space-y-1.5">
          {primaryDefs.map(({ action, label }) => (
            <HotkeyRow
              key={action}
              action={action}
              label={label}
              hotkeysMap={hotkeysMap}
              onHotkeyChange={onHotkeyChange}
              onHotkeyCommit={onHotkeyCommit}
              onResetOneHotkey={onResetOneHotkey}
            />
          ))}
        </div>
      </SettingsSection>

      <SettingsCollapsible
        title="More shortcuts"
        description="Nudge the overlay position and scroll answers without a mouse."
        badge={`${moreDefs.length} shortcuts`}
      >
        <div className="space-y-1.5">
          {moreDefs.map(({ action, label }) => (
            <HotkeyRow
              key={action}
              action={action}
              label={label}
              hotkeysMap={hotkeysMap}
              onHotkeyChange={onHotkeyChange}
              onHotkeyCommit={onHotkeyCommit}
              onResetOneHotkey={onResetOneHotkey}
            />
          ))}
        </div>
      </SettingsCollapsible>

      <ConfirmDialog
        open={confirmResetAll}
        title="Restore default shortcuts?"
        description="This resets every keyboard shortcut back to its default combination."
        confirmLabel="Restore defaults"
        onCancel={() => setConfirmResetAll(false)}
        onConfirm={() => {
          onResetAllHotkeys()
          setConfirmResetAll(false)
        }}
      />
    </SettingsPage>
  )
}
