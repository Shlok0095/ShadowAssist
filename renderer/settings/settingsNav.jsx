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

/** @typedef {{ id: string, label: string, icon: import('lucide-react').LucideIcon, group: string }} SettingsTab */

/** @type {SettingsTab[]} */
export const SETTINGS_TABS = [
  { id: 'profile', label: 'Profile', icon: LayoutTemplate, group: 'Setup' },
  { id: 'display', label: 'General', icon: Monitor, group: 'General' },
  { id: 'keybinds', label: 'Keybinds', icon: Keyboard, group: 'General' },
  { id: 'meetings', label: 'Meeting', icon: Video, group: 'General' },
  { id: 'advance', label: 'Advance', icon: SlidersHorizontal, group: 'Advanced' },
  { id: 'privacy', label: 'Privacy', icon: Shield, group: 'Advanced' },
  { id: 'help', label: 'Help', icon: CircleHelp, group: 'Support' },
  { id: 'about', label: 'About', icon: Info, group: 'Support' },
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

/** @returns {{ tab: string, section: string, firstRun: boolean }} */
export function parseSettingsQuery(search = '') {
  try {
    const raw = String(search || '')
    const q = raw.startsWith('?') ? raw.slice(1) : raw
    const p = new URLSearchParams(q)
    return {
      tab: normalizeSettingsTabId(p.get('tab') || 'display'),
      section: String(p.get('section') || '').trim().toLowerCase(),
      firstRun: p.get('firstRun') === '1',
    }
  } catch {
    return { tab: 'display', section: '', firstRun: false }
  }
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
        {SETTINGS_TABS.map((t, i) => {
          const active = normalizedActive === t.id
          const showGroup = t.group && t.group !== SETTINGS_TABS[i - 1]?.group
          return (
            <React.Fragment key={t.id}>
              {showGroup ? <p className="settings-nav-group">{t.group}</p> : null}
              <button
                type="button"
                onClick={() => onSelectTab(t.id)}
                className={`settings-nav-btn ${active ? 'settings-nav-btn-active' : ''}`}
              >
                <AppIcon icon={t.icon} size={16} strokeWidth={1.75} className="text-current opacity-90" />
                <span>{t.label}</span>
              </button>
            </React.Fragment>
          )
        })}
      </div>

      <div className="settings-nav-footer">
        <p className="settings-nav-autosave">Changes save automatically</p>
        <button type="button" onClick={quit} className="settings-nav-quit">
          <AppIcon icon={LogOut} size={16} strokeWidth={1.75} />
          <span>Quit {name}</span>
        </button>
      </div>
    </nav>
  )
}
