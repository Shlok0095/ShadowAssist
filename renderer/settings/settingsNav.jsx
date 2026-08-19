// Copyright (c) 2026 VeilAssist. All rights reserved.
// Sidebar — mirrors Natively SettingsOverlay.tsx navigation rail.

import React from 'react'
import {
  CircleHelp,
  Info,
  Keyboard,
  LayoutTemplate,
  LogOut,
  Monitor,
  Shield,
  SlidersHorizontal,
  Video,
} from 'lucide-react'
import { createIpcShim } from '../shared/ipcShim'
import AppIcon from '../shared/AppIcon'
import { useBrand } from '../shared/branding'

const ipc = createIpcShim()

/** @typedef {{ id: string, label: string, icon: import('lucide-react').LucideIcon }} SettingsTab */

/** @type {SettingsTab[]} */
export const SETTINGS_TABS = [
  { id: 'display', label: 'General', icon: Monitor },
  { id: 'profile', label: 'Profile', icon: LayoutTemplate },
  { id: 'advance', label: 'Advance', icon: SlidersHorizontal },
  { id: 'keybinds', label: 'Keybinds', icon: Keyboard },
  { id: 'meetings', label: 'Meeting', icon: Video },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'help', label: 'Help', icon: CircleHelp },
  { id: 'about', label: 'About', icon: Info },
]

/** Legacy tab ids — profile/skills → Profile; ai/speech/phone/intelligence → Advance. */
export const LEGACY_PROFILE_TAB_IDS = new Set(['skills'])
export const LEGACY_ADVANCE_TAB_IDS = new Set(['ai', 'speech', 'phone', 'intelligence'])

export function normalizeSettingsTabId(tabId) {
  const id = String(tabId || '').trim()
  if (id === 'profile' || LEGACY_PROFILE_TAB_IDS.has(id)) return 'profile'
  if (LEGACY_ADVANCE_TAB_IDS.has(id)) return 'advance'
  return SETTINGS_TABS.some((t) => t.id === id) ? id : 'display'
}

export function SettingsNav({ activeTab, onSelectTab }) {
  const { name } = useBrand()
  const quit = () => {
    ipc?.send('app-quit')
  }

  const normalizedActive = normalizeSettingsTabId(activeTab)

  return (
    <nav className="settings-nav">
      <p className="settings-nav-title">Settings</p>

      <div className="settings-nav-list">
        {SETTINGS_TABS.map((t) => {
          const active = normalizedActive === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTab(t.id)}
              className={`settings-nav-btn ${active ? 'settings-nav-btn-active' : ''}`}
            >
              <AppIcon icon={t.icon} size={16} strokeWidth={1.75} className="text-current opacity-90" />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      <div className="settings-nav-footer">
        <button type="button" onClick={quit} className="settings-nav-quit">
          <AppIcon icon={LogOut} size={16} strokeWidth={1.75} />
          <span>Quit {name}</span>
        </button>
      </div>
    </nav>
  )
}
