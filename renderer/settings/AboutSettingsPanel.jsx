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
  const [logoPresets, setLogoPresets] = useState([])

  useEffect(() => {
    setNameDraft(brand.name)
  }, [brand.name])

  useEffect(() => {
    if (!api) return
    api
      .invoke('branding:list-presets')
      .then((list) => {
        if (Array.isArray(list)) setLogoPresets(list)
      })
      .catch(() => {})
  }, [api])

  const showBrandingResult = (next, fallback) => {
    if (next?.error) setMessage(next.error)
    else if (next?.notice) setMessage(next.notice)
    else setMessage(fallback)
  }

  const saveName = async () => {
    if (!api || saving) return
    setSaving(true)
    setMessage('')
    try {
      const next = await api.invoke('branding:set-name', nameDraft)
      showBrandingResult(next, 'Display name saved — applied instantly.')
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
      showBrandingResult(next, 'Logo applied — tray, taskbar/window icons, and in-app chrome updated.')
    } catch (e) {
      setMessage(e?.message || 'Failed to apply logo.')
    }
  }

  const applyLogoPreset = async (presetId) => {
    if (!api) return
    setMessage('')
    try {
      const next = await api.invoke('branding:apply-preset', presetId)
      const fallback =
        presetId === 'default'
          ? 'App logo reset to VeilAssist default.'
          : 'Preset logo applied — tray, taskbar/window icons, and in-app chrome updated.'
      showBrandingResult(next, fallback)
    } catch (e) {
      setMessage(e?.message || 'Failed to apply preset logo.')
    }
  }

  const appLogoPresetValue = brand.appLogoPreset
    || (brand.hasCustomLogo ? 'custom' : 'default')

  const resetBranding = async () => {
    if (!api) return
    if (!window.confirm('Reset display name and logos back to default VeilAssist branding?')) return
    setMessage('')
    try {
      const next = await api.invoke('branding:reset')
      showBrandingResult(next, 'Branding reset to default.')
    } catch (e) {
      setMessage(e?.message || 'Failed to reset branding.')
    }
  }

  const appLogo = brand.hasCustomLogo && brand.logoDataUrl ? brand.logoDataUrl : logoSrc
  const overlayLogo = brand.hasOverlayLogo && brand.overlayLogoDataUrl ? brand.overlayLogoDataUrl : logoSrc

  const hostPresets = logoPresets.filter((p) => p.group === 'host')
  const appPresets = logoPresets.filter((p) => p.group !== 'host')

  const renderPresetButton = (preset) => {
    const selected = appLogoPresetValue === preset.id
    return (
      <button
        key={preset.id}
        type="button"
        title={preset.label}
        onClick={() => void applyLogoPreset(preset.id)}
        className="flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors hover:bg-white/[0.04]"
        style={{
          borderColor: selected ? 'rgba(139,92,246,0.55)' : 'var(--border-subtle)',
          background: selected ? 'rgba(139,92,246,0.12)' : 'var(--bg-surface)',
        }}
      >
        {preset.previewDataUrl ? (
          <img
            src={preset.previewDataUrl}
            alt=""
            className="h-8 w-8 rounded object-contain"
            draggable={false}
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded text-[10px]" style={{ background: 'var(--bg-input)' }}>
            ?
          </span>
        )}
        <span className="text-[9px] leading-tight text-center line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
          {preset.label}
        </span>
      </button>
    )
  }

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
          Customize this app&apos;s display name and logos. The app logo updates the system tray,
          taskbar/window icons (when visible), dock, and in-app chrome. Changes persist across restarts.
          The OS executable / installer name stays fixed at build time.
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
            <div className="rounded-lg border p-3 sm:col-span-2" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-input)' }}>
              <div className="flex items-center gap-3">
                <img src={appLogo} alt="" className="h-10 w-10 rounded-lg object-contain" draggable={false} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>App logo</p>
                  <p className="truncate text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Tray, taskbar &amp; window icons
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void pickLogo('app')}
                  className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.06]"
                >
                  Choose file…
                </button>
              </div>
              <div className="mt-3 space-y-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                    Host process icons
                  </span>
                  <p className="mt-1 text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Generic white-window icons from <code className="text-[10px]">C:\Windows\System32</code> host EXEs
                    (e.g. taskhostw.exe — &quot;Host Process for Windows Tasks&quot;).
                  </p>
                  <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {hostPresets.map(renderPresetButton)}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                    Windows app icons
                  </span>
                  <p className="mt-1 text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Branded icons from local install paths (Calculator, Notepad, Settings, Edge, etc.).
                  </p>
                  <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
                    <button
                      type="button"
                      title="VeilAssist (default)"
                      onClick={() => void applyLogoPreset('default')}
                      className="flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors hover:bg-white/[0.04]"
                      style={{
                        borderColor: appLogoPresetValue === 'default' ? 'rgba(139,92,246,0.55)' : 'var(--border-subtle)',
                        background: appLogoPresetValue === 'default' ? 'rgba(139,92,246,0.12)' : 'var(--bg-surface)',
                      }}
                    >
                      <img src={logoSrc} alt="" className="h-8 w-8 rounded object-contain" draggable={false} />
                      <span className="text-[9px] leading-tight text-center" style={{ color: 'var(--text-secondary)' }}>
                        Default
                      </span>
                    </button>
                    {appPresets.map(renderPresetButton)}
                  </div>
                </div>

                {brand.hasCustomLogo && !brand.appLogoPreset ? (
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Custom file selected — pick a preset above to replace it.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-input)' }}>
              <img src={overlayLogo} alt="" className="h-10 w-10 rounded-lg object-contain" draggable={false} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>Overlay logo</p>
                <p className="truncate text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  {brand.hasOverlayLogo ? 'Custom overlay chrome' : 'Default overlay chrome'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void pickLogo('overlay')}
                className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.06]"
              >
                Change…
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
