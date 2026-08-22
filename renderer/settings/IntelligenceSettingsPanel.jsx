// Copyright (c) 2026 VeilAssist. All rights reserved.
// Phase 2 — Natively IntelligenceSettings.tsx lite (core master + customize + Hindsight card).

import React, { useEffect, useMemo, useState } from 'react'
import { createIpcShim } from '../shared/ipcShim'
import {
  SettingsBadge,
  SettingsCollapsible,
  SettingsFieldLabel,
  SettingsPage,
  SettingsPanelShell,
  SettingsRow,
  SettingsSection,
  ToggleSwitch,
} from './SettingsComponents'

const ipc = createIpcShim()

/** @typedef {{ id: string, storeKey: string, label: string, description: string, group: string, tier: string, defaultOn: boolean, implemented: boolean, phase?: number }} IntelFlag */

function FlagToggleRow({ flag, snap, onPatchSnap, onSave, disabled = false }) {
  const effectiveChecked = flag.implemented ? snap?.[flag.storeKey] !== false && (snap?.[flag.storeKey] ?? flag.defaultOn) : false

  return (
    <SettingsRow label={flag.label} hint={flag.description}>
      <div className="flex items-center gap-2">
        {!flag.implemented ? (
          <SettingsBadge tone="warn">Phase {flag.phase || '?'}</SettingsBadge>
        ) : null}
        <ToggleSwitch
          checked={effectiveChecked}
          disabled={disabled || !flag.implemented}
          onChange={(v) => {
            if (!flag.implemented) return
            onPatchSnap(flag.storeKey, !!v)
            onSave(flag.storeKey, !!v)
          }}
        />
      </div>
    </SettingsRow>
  )
}

export default function IntelligenceSettingsPanel({
  embedded = false,
  snap,
  onPatchSnap,
  onSave,
  intelligenceFlags = [],
  coreFlagKeys = [],
  advancedGroupOrder = [],
  hindsightApiUrl,
  onHindsightApiUrlChange,
  onHindsightApiUrlBlur,
  hindsightApiKey,
  onHindsightApiKeyChange,
  onSaveHindsightApiKey,
  hindsightKeySaved,
  onHindsightAutoStartChange,
}) {
  const [recallStatus, setRecallStatus] = useState(null)
  const hindsightProvider = ['gateway', 'hindsight'].includes(snap?.hindsightProvider)
    ? snap.hindsightProvider
    : 'off'
  const coreFlags = useMemo(
    () => intelligenceFlags.filter((f) => f.tier === 'core' && f.implemented),
    [intelligenceFlags],
  )

  const advancedByGroup = useMemo(() => {
    const advanced = intelligenceFlags.filter((f) => f.tier === 'advanced')
    const map = new Map()
    for (const f of advanced) {
      const g = f.group || 'Other'
      if (!map.has(g)) map.set(g, [])
      map.get(g).push(f)
    }
    return advancedGroupOrder.filter((g) => map.has(g)).map((g) => ({ group: g, flags: map.get(g) }))
  }, [intelligenceFlags, advancedGroupOrder])

  const smartFeaturesOn = useMemo(() => {
    if (!snap || !coreFlagKeys.length) return true
    return coreFlagKeys.every((key) => snap[key] !== false)
  }, [snap, coreFlagKeys])

  useEffect(() => {
    if (!ipc) return undefined
    let active = true
    const refresh = () => {
      ipc.invoke('hindsight-local:status').then((status) => {
        if (active) setRecallStatus(status)
      }).catch(() => {})
    }
    refresh()
    const timer = window.setInterval(refresh, 5000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [hindsightProvider, snap?.hindsightAutoStartEnabled])

  const setSmartFeatures = (on) => {
    for (const key of coreFlagKeys) {
      onPatchSnap(key, !!on)
      onSave(key, !!on)
    }
  }

  return (
    <SettingsPanelShell
      embedded={embedded}
      title="Intelligence"
      description="Smart routing, memory, and meeting-aware features — aligned with Natively Intelligence OS (lite)."
    >
      <SettingsSection
        title="Smart features"
        description="Core on-device intelligence wired today. Turn off to use a plain prompt + transcript on every ask."
      >
        <SettingsRow
          label="Enable smart features"
          hint="Controls context routing, long-term memory, and meeting mode suggestions together."
        >
          <ToggleSwitch checked={smartFeaturesOn} onChange={setSmartFeatures} />
        </SettingsRow>
        <div className="border-t pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
          {coreFlags.map((flag) => (
            <FlagToggleRow key={flag.id} flag={flag} snap={snap} onPatchSnap={onPatchSnap} onSave={onSave} />
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Persistent recall"
        description="Past-meeting memory only. Same-session follow-ups use the faster in-memory conversation service."
      >
        <div className="space-y-3">
          <div>
            <SettingsFieldLabel className="!mb-1">Recall provider</SettingsFieldLabel>
            <select
              value={hindsightProvider}
              onChange={(event) => {
                const value = event.target.value
                onPatchSnap('hindsightProvider', value)
                onSave('hindsightProvider', value)
              }}
              className="input-shadow w-full px-3 py-2.5 text-sm"
            >
              <option value="off" className="bg-void-900">Local app memory only</option>
              <option value="gateway" className="bg-void-900">Local recall gateway</option>
              <option value="hindsight" className="bg-void-900">Genuine Hindsight service</option>
            </select>
            <p className="mt-1 text-[11px] text-zinc-500">
              {hindsightProvider === 'hindsight'
                ? 'Scoped retain/recall through a genuine Hindsight service.'
                : hindsightProvider === 'gateway'
                  ? 'Thin HTTP gateway over this app’s SQLite vector and keyword stores.'
                  : 'No external service. Enabled local memory features continue to work.'}
            </p>
          </div>
          <div>
            <SettingsFieldLabel className="!mb-1">Recall API base URL</SettingsFieldLabel>
            <input
              type="url"
              value={hindsightApiUrl}
              onChange={(e) => onHindsightApiUrlChange?.(e.target.value)}
              onBlur={() => onHindsightApiUrlBlur?.()}
              placeholder="https://your-service.example"
              disabled={hindsightProvider === 'off'}
              className="input-shadow w-full px-3 py-2.5 font-mono text-xs"
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <SettingsFieldLabel className="!mb-0">API key</SettingsFieldLabel>
              {hindsightKeySaved ? <SettingsBadge tone="success">Saved</SettingsBadge> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="password"
                value={hindsightApiKey}
                onChange={(e) => onHindsightApiKeyChange?.(e.target.value)}
                placeholder={hindsightKeySaved ? '••••••••' : 'Optional bearer token'}
                disabled={hindsightProvider !== 'hindsight'}
                className="input-shadow min-w-[200px] flex-1 px-3 py-2 text-sm"
              />
              <button type="button" onClick={() => onSaveHindsightApiKey?.()} className="nat-btn-secondary px-4 py-2 text-[12px]">
                Save key
              </button>
            </div>
          </div>
        </div>
        <SettingsRow
          label="Auto-start local recall server"
          hint="Starts the lightweight local gateway on 127.0.0.1:8888. This is not the genuine Hindsight sidecar."
        >
          <div className="flex items-center gap-2">
            {recallStatus?.running ? <SettingsBadge tone="success">Running</SettingsBadge> : null}
            {hindsightProvider === 'hindsight' && recallStatus?.hindsight?.healthy
              ? <SettingsBadge tone="success">Healthy</SettingsBadge>
              : null}
            <ToggleSwitch
              checked={snap?.hindsightAutoStartEnabled === true}
              disabled={hindsightProvider === 'hindsight'}
              onChange={(v) => onHindsightAutoStartChange?.(!!v)}
            />
          </div>
        </SettingsRow>
        <div className="nat-row mt-4 border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="min-w-0 flex-1">
            <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
              Clear long-term memory
            </span>
            <p className="mt-1 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
              Removes saved recall entries on this device. Does not delete meeting recaps or profile text.
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!ipc) return
              if (!window.confirm('Clear all long-term memory entries?')) return
              const result = await ipc.invoke('long-term-memory:clear')
              const keyword = result?.keyword?.removed ?? 'all'
              const vector = result?.vector?.removed ?? 'all'
              const remote = result?.remote?.ok ? 'cleared' : result?.remote?.skipped ? 'not configured' : 'failed'
              window.alert(`Memory cleared. Keyword: ${keyword}; vector chunks: ${vector}; Hindsight: ${remote}.`)
            }}
            className="nat-btn-secondary shrink-0 px-4 py-2 text-[12px]"
          >
            Clear memory
          </button>
        </div>
      </SettingsSection>

      <SettingsCollapsible
        title="Customize"
        description="Opt-in features — enable individually under Customize."
        badge={`${advancedByGroup.reduce((n, g) => n + g.flags.length, 0)} flags`}
      >
        <div className="space-y-5">
          <p className="rounded-lg border border-amber-500/15 bg-amber-500/[0.06] px-3 py-2 text-[11px] leading-relaxed text-amber-100/80">
            Opt-in features below. Vector memory and past-meeting search are available when enabled; keyword recall
            always remains as fallback.
          </p>
          {advancedByGroup.map(({ group, flags }) => (
            <div key={group}>
              <SettingsFieldLabel className="!mb-2">{group}</SettingsFieldLabel>
              <div className="space-y-0">
                {flags.map((flag) => (
                  <FlagToggleRow key={flag.id} flag={flag} snap={snap} onPatchSnap={onPatchSnap} onSave={onSave} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </SettingsCollapsible>
    </SettingsPanelShell>
  )
}
