// Copyright (c) 2026 VeilAssist. All rights reserved.

import React from 'react'
import { Monitor, SlidersHorizontal, Terminal } from 'lucide-react'
import AppIcon from '../shared/AppIcon'
import { OVERLAY_POSITION_PRESETS } from './settingsConstants'
import { UI_ACCENT_THEMES, normalizeUiAccentId } from '../shared/uiAccentThemes'
import {
  SegmentedControl,
  SettingsCollapsible,
  SettingsFieldLabel,
  SettingsPage,
  SettingsRow,
  SettingsSection,
  ToggleSwitch,
} from './SettingsComponents'
import { useBrand } from '../shared/branding'

export default function DisplaySettingsPanel({
  overlayOpacityUi,
  onOverlayOpacityChange,
  onOpacityPreset,
  overlayFontUi,
  onOverlayFontChange,
  overlayTeleprompterUi,
  onTeleprompterChange,
  overlayFocusModeUi,
  onFocusModeChange,
  overlayLiveTranscriptUi,
  onLiveTranscriptChange,
  overlayTranscriptAutoScrollUi,
  onTranscriptAutoScrollChange,
  overlayAnswerPinToTopUi,
  onAnswerPinToTopChange,
  openAtLoginUi,
  onOpenAtLoginChange,
  overlayMousePassthroughUi,
  onOverlayMousePassthroughChange,
  hideFromTaskbarUi,
  onHideFromTaskbarChange,
  uiAccentThemeUi,
  onUiAccentThemeChange,
  doNotSaveMeetingsEnabled,
  onDoNotSaveMeetingsChange,
  verboseDebugLogging,
  onVerboseDebugLoggingChange,
  onOpenLogFile,
  stealthModeUi,
  onStealthModeChange,
  overlayW,
  overlayH,
  onOverlayWChange,
  onOverlayHChange,
  onApplyOverlaySize,
  onSnapOverlayPreset,
}) {
  const { name } = useBrand()
  return (
    <SettingsPage
      title="General"
      description="Startup, overlay, privacy, and diagnostics — aligned with Natively General settings."
    >
      <SettingsSection title="Startup">
        <SettingsRow
          label="Open at login"
          hint={`Start ${name} in the tray when you sign in to Windows (same as disabling “auto launch” off in Natively).`}
        >
          <ToggleSwitch checked={openAtLoginUi} onChange={onOpenAtLoginChange} />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Privacy & retention">
        <SettingsRow
          label="Do not save meetings"
          hint="When on, Stop Listen will not write session recaps or long-term memory entries."
        >
          <ToggleSwitch checked={doNotSaveMeetingsEnabled} onChange={onDoNotSaveMeetingsChange} />
        </SettingsRow>
        <SettingsRow
          label="Hide from screen capture"
          hint="Content protection — harder to capture in screen shares and recordings."
        >
          <ToggleSwitch checked={stealthModeUi} onChange={onStealthModeChange} />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Diagnostics">
        <SettingsRow
          label="Verbose debug logging"
          hint="Captures main-process and overlay/settings console output to veilassist.log. A toast with the file path appears when enabled."
        >
          <div className="flex items-center gap-2">
            <AppIcon icon={Terminal} size={15} className="text-zinc-500" aria-hidden />
            <ToggleSwitch checked={verboseDebugLogging} onChange={onVerboseDebugLoggingChange} />
          </div>
        </SettingsRow>
        <button type="button" onClick={onOpenLogFile} className="nat-btn-secondary mt-1 px-4 py-2 text-[12px]">
          Open log file
        </button>
      </SettingsSection>

      <SettingsSection title="Overlay appearance">
        <div>
          <SettingsFieldLabel>Accent color (overlay &amp; global chat)</SettingsFieldLabel>
          <p className="mb-3 text-[11px] leading-relaxed text-zinc-600">
            Settings UI stays neutral zinc — accent applies to the floating overlay and Global Chat window only.
          </p>
          <div className="flex flex-wrap gap-2">
            {UI_ACCENT_THEMES.map((t) => {
              const active = normalizeUiAccentId(uiAccentThemeUi) === t.id
              const rgb = `rgb(${t.main.join(',')})`
              return (
                <button
                  key={t.id}
                  type="button"
                  title={t.label}
                  aria-label={t.label}
                  onClick={() => onUiAccentThemeChange?.(t.id)}
                  className={`h-8 w-8 rounded-full border-2 transition ${
                    active ? 'border-white scale-110' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ background: rgb }}
                />
              )
            })}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Overlay behavior">
        <SettingsRow
          label="Mouse passthrough"
          hint="When on, clicks pass through only when the cursor is outside the overlay window. Move over the notch or panel to click buttons again."
        >
          <ToggleSwitch checked={overlayMousePassthroughUi} onChange={onOverlayMousePassthroughChange} />
        </SettingsRow>
        <SettingsRow
          label="Hide from taskbar"
          hint="Force-hide the app from the Windows taskbar even in Visible mode. Invisible mode always hides it. Only one taskbar icon (overlay) is used when shown."
        >
          <ToggleSwitch checked={hideFromTaskbarUi} onChange={onHideFromTaskbarChange} />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Overlay">
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <SettingsFieldLabel>Window opacity</SettingsFieldLabel>
            <span className="font-mono text-xs text-zinc-400">{Math.round(overlayOpacityUi * 100)}%</span>
          </div>
          <p className="mb-3 text-[11px] leading-relaxed text-zinc-600">
            The floating overlay updates live as you drag — no separate preview needed.
          </p>

          <div className="mb-2 flex flex-wrap gap-2">
            {[
              { label: 'Subtle', pct: 65 },
              { label: 'Balanced', pct: 85 },
              { label: 'Clear', pct: 92 },
            ].map((p) => (
              <button
                key={p.pct}
                type="button"
                onClick={() => onOpacityPreset(p.pct)}
                className={`settings-chip settings-chip-sm !normal-case ${
                  Math.round(overlayOpacityUi * 100) === p.pct ? 'settings-chip-active' : ''
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <input
            type="range"
            min={35}
            max={100}
            value={Math.round(overlayOpacityUi * 100)}
            onChange={(e) => onOverlayOpacityChange(Number(e.target.value) / 100)}
            className="h-2 w-full cursor-pointer"
            style={{ accentColor: '#fafafa' }}
          />
        </div>

        <div>
          <SettingsFieldLabel>Answer text size</SettingsFieldLabel>
          <SegmentedControl
            value={overlayFontUi}
            onChange={onOverlayFontChange}
            options={['small', 'medium', 'large'].map((sz) => ({ id: sz, label: sz }))}
          />
        </div>

        <SettingsRow
          label="Live transcript panel"
          hint="Show Me / Participant columns during Listen (Natively interviewer transcript view)."
        >
          <ToggleSwitch checked={overlayLiveTranscriptUi} onChange={onLiveTranscriptChange} />
        </SettingsRow>

        <SettingsRow
          label="Auto-scroll transcript"
          hint="Follow new speech in the live transcript columns."
        >
          <ToggleSwitch checked={overlayTranscriptAutoScrollUi} onChange={onTranscriptAutoScrollChange} />
        </SettingsRow>

        <SettingsRow
          label="Pin answers to top"
          hint="While the AI streams, keep the latest answer at the top unless you scroll away."
        >
          <ToggleSwitch checked={overlayAnswerPinToTopUi} onChange={onAnswerPinToTopChange} />
        </SettingsRow>

        <div>
          <SettingsFieldLabel>Snap position</SettingsFieldLabel>
          <p className="mb-2 text-[11px] text-zinc-600">Primary monitor — expanded panel placement.</p>
          <div className="flex flex-wrap gap-2">
            {OVERLAY_POSITION_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onSnapOverlayPreset(p)}
                className="settings-chip settings-chip-sm !normal-case"
              >
                {p.replace(/-/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </SettingsSection>

      <SettingsCollapsible
        title="Advanced"
        description="Reading modes and custom panel dimensions — rarely needed day to day."
        icon={SlidersHorizontal}
      >
        <div className="space-y-4">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Reading modes</p>
            <SettingsRow label="Teleprompter" hint="Larger type, minimal chrome during live calls.">
              <ToggleSwitch checked={overlayTeleprompterUi} onChange={onTeleprompterChange} />
            </SettingsRow>
            <SettingsRow label="Focus mode" hint="Hide input until tapped — more room for answers.">
              <ToggleSwitch checked={overlayFocusModeUi} onChange={onFocusModeChange} />
            </SettingsRow>

            <p className="text-[11px] leading-relaxed text-zinc-600">
              Answers scroll in one session feed (newest at top) — scroll down for earlier exchanges.
            </p>
          </div>

          <div className="border-t border-white/[0.06] pt-4">
            <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              <AppIcon icon={Monitor} size={14} />
              Panel size (expanded)
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[100px] flex-1">
                <span className="mb-1 block text-[10px] text-gray-600">Width (280–860)</span>
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
                <span className="mb-1 block text-[10px] text-gray-600">Height (180–940)</span>
                <input
                  type="number"
                  min={180}
                  max={940}
                  value={overlayH}
                  onChange={(e) => onOverlayHChange(Number(e.target.value) || 180)}
                  className="input-shadow w-full px-3 py-2.5 font-mono text-xs"
                />
              </div>
              <button type="button" onClick={onApplyOverlaySize} className="btn-glow shrink-0 px-5 py-2.5 text-sm">
                Apply
              </button>
            </div>
          </div>
        </div>
      </SettingsCollapsible>
    </SettingsPage>
  )
}
