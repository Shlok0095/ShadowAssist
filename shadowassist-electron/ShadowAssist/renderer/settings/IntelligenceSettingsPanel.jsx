// Copyright (c) 2026 VeilAssist. All rights reserved.
// Phase 2 — Natively IntelligenceSettings.tsx lite (core master + customize + Hindsight card).

import React, { useMemo } from 'react'
import { createIpcShim } from '../shared/ipcShim'
import {
  SettingsBadge,
  SettingsCollapsible,
  SettingsFieldLabel,
  SettingsPage,
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

  const setSmartFeatures = (on) => {
    for (const key of coreFlagKeys) {
      onPatchSnap(key, !!on)
      onSave(key, !!on)
    }
  }

  return (
    <SettingsPage
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
        title="External recall (Hindsight)"
        description="Optional vector recall service — falls back to local keyword memory when empty or offline."
      >
        <div className="space-y-3">
          <div>
            <SettingsFieldLabel className="!mb-1">Recall API base URL</SettingsFieldLabel>
            <input
              type="url"
              value={hindsightApiUrl}
              onChange={(e) => onHindsightApiUrlChange?.(e.target.value)}
              onBlur={() => onHindsightApiUrlBlur?.()}
              placeholder="https://your-service.example"
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
          hint="Starts a local POST /recall service on 127.0.0.1:8888 (vector + keyword memory). Sets Recall URL if empty."
        >
          <ToggleSwitch
            checked={snap?.hindsightAutoStartEnabled === true}
            onChange={(v) => onHindsightAutoStartChange?.(!!v)}
          />
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
              await ipc.invoke('long-term-memory:clear')
              window.alert('Long-term memory cleared.')
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
    </SettingsPage>
  )
}
