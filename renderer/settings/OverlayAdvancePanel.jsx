// Copyright (c) 2026 VeilAssist. Overlay fine-tuning under Advance.

import React from 'react'
import { Monitor } from 'lucide-react'
import AppIcon from '../shared/AppIcon'
import {
  SettingsFieldHint,
  SettingsFieldLabel,
  SettingsRow,
  SettingsSection,
  ToggleSwitch,
} from './SettingsComponents'

export default function OverlayAdvancePanel({
  overlayTeleprompterUi,
  onTeleprompterChange,
  overlayFocusModeUi,
  onFocusModeChange,
  overlayW,
  overlayH,
  onOverlayWChange,
  onOverlayHChange,
  onApplyOverlaySize,
}) {
  return (
    <div className="space-y-5">
      <SettingsSection title="Reading modes" description="How answers appear during live calls.">
        <SettingsRow label="Teleprompter" hint="Larger type, minimal chrome during live calls.">
          <ToggleSwitch checked={overlayTeleprompterUi} onChange={onTeleprompterChange} />
        </SettingsRow>
        <SettingsRow label="Focus mode" hint="Hide input until tapped for more answer space.">
          <ToggleSwitch checked={overlayFocusModeUi} onChange={onFocusModeChange} />
        </SettingsRow>
        <SettingsFieldHint>Newest answers appear at the top. Scroll down for earlier exchanges.</SettingsFieldHint>
      </SettingsSection>

      <SettingsSection title="Panel size" description="Expanded overlay dimensions.">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[100px] flex-1">
            <SettingsFieldLabel className="mb-1 block">Width (280–860)</SettingsFieldLabel>
            <input
              type="number"
              min={280}
              max={860}
              value={overlayW}
              onChange={(e) => onOverlayWChange(Number(e.target.value) || 280)}
              className="input-shadow w-full px-3 py-2.5 font-mono text-xs"
            />
          </div>
          <div className="min-w-[100px] flex-1">
            <SettingsFieldLabel className="mb-1 block">Height (180–940)</SettingsFieldLabel>
            <input
              type="number"
              min={180}
              max={940}
              value={overlayH}
              onChange={(e) => onOverlayHChange(Number(e.target.value) || 180)}
              className="input-shadow w-full px-3 py-2.5 font-mono text-xs"
            />
          </div>
          <button type="button" onClick={onApplyOverlaySize} className="nat-btn-primary shrink-0 px-5 py-2.5 text-sm">
            Apply
          </button>
        </div>
        <p className="mt-3 flex items-center gap-2 text-[11px] text-zinc-500">
          <AppIcon icon={Monitor} size={14} />
          Applies on next expand or window resize.
        </p>
      </SettingsSection>
    </div>
  )
}
