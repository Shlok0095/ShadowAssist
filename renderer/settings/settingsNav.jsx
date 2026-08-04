// Copyright (c) 2026 VeilAssist. All rights reserved.
// Sidebar — mirrors Natively SettingsOverlay.tsx navigation rail.

import React from 'react'
import {
  Bot,
  Brain,
  CalendarDays,
  CircleHelp,
  Info,
  Keyboard,
  LayoutTemplate,
  LogOut,
  Mic,
  Monitor,
  Shield,
  Smartphone,
  Sparkles,
} from 'lucide-react'
import { createIpcShim } from '../shared/ipcShim'
import AppIcon from '../shared/AppIcon'
import { useBrand } from '../shared/branding'

const ipc = createIpcShim()

/** @typedef {{ id: string, label: string, icon: import('lucide-react').LucideIcon }} SettingsTab */

/** @type {SettingsTab[]} */
export const SETTINGS_TABS = [
  { id: 'profile', label: 'Profile', icon: LayoutTemplate },
  { id: 'skills', label: 'Skills', icon: Sparkles },
  { id: 'ai', label: 'AI Providers', icon: Bot },
  { id: 'speech', label: 'Audio', icon: Mic },
  { id: 'display', label: 'General', icon: Monitor },
  { id: 'phone', label: 'Phone', icon: Smartphone },
  { id: 'intelligence', label: 'Intelligence', icon: Brain },
  { id: 'keybinds', label: 'Keybinds', icon: Keyboard },
  { id: 'meetings', label: 'Calendar', icon: CalendarDays },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'help', label: 'Help', icon: CircleHelp },
  { id: 'about', label: 'About', icon: Info },
]

export function SettingsNav({ activeTab, onSelectTab }) {
  const { name } = useBrand()
  const quit = () => {
    ipc?.send('app-quit')
  }

  return (
    <nav className="settings-nav">
      <p className="settings-nav-title">Settings</p>

      <div className="settings-nav-list">
        {SETTINGS_TABS.map((t) => {
          const active = activeTab === t.id
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
