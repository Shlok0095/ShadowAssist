// Copyright (c) 2026 VeilAssist. All rights reserved.

import React, { useState, useEffect } from 'react'
import { SettingsPage, SettingsSection } from './SettingsComponents'
import { useBrand } from '../shared/branding'

function getApi() {
  return typeof window !== 'undefined' ? window.shadowAPI : null
}

/**
 * Branding manager — app display name, app logo, overlay logo.
 * Applies instantly everywhere (tray, dock, windows, renderer chrome) and
 * persists across restarts. OS-level names (executable/installer) are fixed.
 */
export default function AboutSettingsPanel({ logoSrc, appVersion }) {
  const api = getApi()
  const brand = useBrand()
  const [nameDraft, setNameDraft] = useState(brand.name)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setNameDraft(brand.name)
  }, [brand.name])

  const saveName = async () => {
    if (!api || saving) return
    setSaving(true)
    setMessage('')
    try {
      const next = await api.invoke('branding:set-name', nameDraft)
      if (next?.error) setMessage(next.error)
      else setMessage('Display name saved — applied instantly.')
    } catch (e) {
      setMessage(e?.message || 'Failed to save name.')
    } finally {
      setSaving(false)
    }
  }

  const pickLogo = async (kind) => {
    if (!api) return
    setMessage('')
    try {
      const next = await api.invoke('branding:pick-logo', kind)
      if (next?.error) setMessage(next.error)
      else setMessage(`Logo applied — used everywhere (tray, dock, windows).`)
    } catch (e) {
      setMessage(e?.message || 'Failed to apply logo.')
    }
  }

  const resetBranding = async () => {
    if (!api) return
    if (!window.confirm('Reset display name and logos back to default VeilAssist branding?')) return
    setMessage('')
    try {
      await api.invoke('branding:reset')
      setMessage('Branding reset to default.')
    } catch (e) {
      setMessage(e?.message || 'Failed to reset branding.')
    }
  }

  const appLogo = brand.hasCustomLogo && brand.logoDataUrl ? brand.logoDataUrl : logoSrc
  const overlayLogo = brand.hasOverlayLogo && brand.overlayLogoDataUrl ? brand.overlayLogoDataUrl : logoSrc

  return (
    <SettingsPage title="About" description={`${brand.name} — private AI overlay for meetings and interviews.`}>
      <SettingsSection>
        <div className="flex flex-col items-center py-6 text-center">
          <img
            src={appLogo}
            alt={brand.name}
            className="mb-4 h-16 w-16 rounded-xl object-contain"
            draggable={false}
          />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {brand.name}
          </h3>
          {appVersion ? (
            <p
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border px-3 py-1 font-mono text-[11px]"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#22c55e' }} aria-hidden="true" />
              v{appVersion}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 border-t pt-5 sm:grid-cols-3" style={{ borderColor: 'var(--border-subtle)' }}>
          {[
            { label: 'Undetectable', desc: 'Hidden from screen capture & shares' },
            { label: 'AI-powered', desc: 'Answers from your chosen LLM provider' },
            { label: 'Private', desc: 'Audio & screenshots never stored on disk' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border px-4 py-3 text-center"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-input)' }}
            >
              <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {item.label}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Branding">
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Customize the display name and logos. Changes apply instantly to the tray, dock, windows, and
          notifications, and persist across restarts. The OS-level name (executable / installer / app
          bundle) is fixed at build time.
        </p>

        <div className="mt-4 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Display name
              </span>
              <input
                type="text"
                value={nameDraft}
                maxLength={40}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void saveName()
                }}
                className="rounded-lg border px-3 py-2 text-[13px] outline-none transition-colors focus:border-violet-500/60"
                style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                placeholder="VeilAssist"
              />
            </label>
            <button
              type="button"
              onClick={() => void saveName()}
              disabled={saving}
              className="rounded-lg bg-violet-600 px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save name'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-input)' }}>
              <img src={appLogo} alt="" className="h-10 w-10 rounded-lg object-contain" draggable={false} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>App logo</p>
                <p className="truncate text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  {brand.hasCustomLogo ? 'Custom logo active' : 'Using bundled logo'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void pickLogo('app')}
                className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.06]"
              >
                Choose…
              </button>
            </div>

            <div className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-input)' }}>
              <img src={overlayLogo} alt="" className="h-10 w-10 rounded-lg object-contain" draggable={false} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>Overlay logo</p>
                <p className="truncate text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  {brand.hasOverlayLogo ? 'Custom overlay logo active' : 'Using bundled logo'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void pickLogo('overlay')}
                className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.06]"
              >
                Choose…
              </button>
            </div>
          </div>

          {message ? (
            <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{message}</p>
          ) : null}

          <button
            type="button"
            onClick={() => void resetBranding()}
            className="rounded-lg border border-red-500/25 px-3 py-1.5 text-[11px] font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            Reset to default branding
          </button>
        </div>
      </SettingsSection>
    </SettingsPage>
  )
}
