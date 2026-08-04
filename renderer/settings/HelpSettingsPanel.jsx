// Copyright (c) 2026 VeilAssist. All rights reserved.

import React, { useEffect, useState } from 'react'
import { BookOpen, ExternalLink, RefreshCw } from 'lucide-react'
import { createIpcShim } from '../shared/ipcShim'
import AppIcon from '../shared/AppIcon'
import { SettingsPage, SettingsSection } from './SettingsComponents'
import { useBrand } from '../shared/branding'

const ipc = createIpcShim()

const FAQ = [
  {
    q: 'Does closing the overlay quit the app?',
    a: 'No. VeilAssist stays in the system tray. Use tray → Quit or the Quit control in settings to fully exit.',
  },
  {
    q: 'How does screen context work?',
    a: 'When you ask (or auto-trigger fires), the app captures your display and sends it to a vision-capable model together with live transcript text. No manual crop step.',
  },
  {
    q: 'Where are API keys stored?',
    a: 'On this device only, encrypted when Windows DPAPI is available. Nothing is uploaded to VeilAssist servers.',
  },
  {
    q: 'What happens when I Stop Listen?',
    a: 'Unless “Do not save meetings” is on in General, a session recap is generated and stored locally under Calendar → Session recaps.',
  },
  {
    q: 'Where is debug logging?',
    a: 'General → Verbose debug logging. When enabled, a toast shows the log file path with an Open button.',
  },
  {
    q: 'Stealth / content protection?',
    a: 'When enabled in General, the overlay is harder to capture in screen shares. Test with your meeting app before relying on it.',
  },
]

export default function HelpSettingsPanel({ appVersion, onSelectTab }) {
  const { name } = useBrand()
  const [doc, setDoc] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const loadDoc = async () => {
    setLoading(true)
    setErr('')
    try {
      const text = await ipc?.invoke('help:get-doc')
      setDoc(typeof text === 'string' ? text : '')
    } catch (e) {
      setErr(e?.message || 'Could not load documentation')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDoc()
  }, [])

  const openLogs = () => {
    void ipc?.invoke('logs:open-folder')
  }

  return (
    <SettingsPage
      title="Help"
      description="Quick answers, full guide, and troubleshooting."
    >
      <SettingsSection title="FAQ">
        <ul className="space-y-4">
          {FAQ.map((item) => (
            <li key={item.q}>
              <p className="text-[13px] font-medium text-zinc-200">{item.q}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">{item.a.replaceAll('VeilAssist', name)}</p>
            </li>
          ))}
        </ul>
      </SettingsSection>

      <SettingsSection title="Full guide">
        <div className="mb-3 flex justify-end">
          <button type="button" onClick={() => void loadDoc()} className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-[11px]">
            <AppIcon icon={RefreshCw} size={12} />
            Reload
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : err ? (
          <p className="text-sm text-rose-300">{err}</p>
        ) : (
          <pre className="max-h-[420px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-white/[0.06] bg-black/20 p-4 font-sans text-[12px] leading-relaxed text-zinc-400">
            {doc || 'Documentation file not found.'}
          </pre>
        )}
      </SettingsSection>

      <SettingsSection title="Troubleshooting">
        <div className="space-y-3 text-[12px] text-zinc-500">
          <p>
            Enable <strong className="font-medium text-zinc-300">Verbose debug logging</strong> in{' '}
            <button type="button" className="text-zinc-300 underline hover:text-white" onClick={() => onSelectTab?.('display')}>
              General
            </button>
            , reproduce the issue, then open the log file from the toast or button below.
          </p>
          <p>Version: {appVersion || '—'}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={openLogs} className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-xs">
              <AppIcon icon={ExternalLink} size={13} />
              Open log folder
            </button>
            <button type="button" onClick={() => void ipc?.invoke('debug-log:open-file')} className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-xs">
              Open log file
            </button>
            <button
              type="button"
              onClick={() => onSelectTab?.('display')}
              className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-xs"
            >
              <AppIcon icon={BookOpen} size={13} />
              General settings
            </button>
          </div>
        </div>
      </SettingsSection>
    </SettingsPage>
  )
}
