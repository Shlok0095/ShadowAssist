// Copyright (c) 2026 VeilAssist. All rights reserved.

import React from 'react'
import { Terminal } from 'lucide-react'
import AppIcon from '../shared/AppIcon'
import { OVERLAY_POSITION_PRESETS } from './settingsConstants'
import { UI_ACCENT_THEMES, normalizeUiAccentId } from '../shared/uiAccentThemes'
import {
  SegmentedControl,
  SettingsCollapsible,
  SettingsFieldHint,
  SettingsFieldLabel,
  SettingsPage,
  SettingsRow,
  SettingsSection,
  SettingsSelect,
  ToggleSwitch,
} from './SettingsComponents'
import { QUESTION_DETECTION_LEVELS, ANSWER_STRUCTURES, RESPONSE_FORMATS, ANSWER_LENGTHS } from '../shared/interviewSettings'
import { listAiResponseLanguages } from '../../lib/aiResponseLanguage.js'
import { useBrand } from '../shared/branding'

export default function DisplaySettingsPanel({
  overlayOpacityUi,
  onOverlayOpacityChange,
  onOpacityPreset,
  overlayFontUi,
  onOverlayFontChange,
  overlayLiveTranscriptUi,
  onLiveTranscriptChange,
  overlayTranscriptAutoScrollUi,
  onTranscriptAutoScrollChange,
  overlayAnswerPinToTopUi,
  onAnswerPinToTopChange,
  answerStructureUi,
  onAnswerStructureChange,
  responseFormatUi,
  onResponseFormatChange,
  answerLengthUi,
  onAnswerLengthChange,
  interviewCustomInstructionsUi,
  onInterviewCustomInstructionsChange,
  onInterviewCustomInstructionsBlur,
  aiResponseLanguageUi,
  onAiResponseLanguageChange,
  conversationFollowUpsEnabled,
  onConversationFollowUpsChange,
  overlayAnswerViewUi,
  onAnswerViewChange,
  assistAutoTriggerUi,
  onAssistAutoTriggerChange,
  questionDetectionUi,
  onQuestionDetectionChange,
  overlayAnswerAutoScrollUi,
  onOverlayAnswerAutoScrollChange,
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
  onSnapOverlayPreset,
}) {
  const { name } = useBrand()
  return (
    <SettingsPage title="General" description="Startup, overlay, privacy, and diagnostics.">
      <SettingsSection title="Startup & privacy">
        <SettingsRow
          label="Open at login"
          hint={`Start ${name} in the tray when you sign in to Windows.`}
        >
          <ToggleSwitch checked={openAtLoginUi} onChange={onOpenAtLoginChange} />
        </SettingsRow>
        <SettingsRow
          label="Do not save meetings"
          hint="When on, Stop Listen will not write session recaps or long-term memory entries."
        >
          <ToggleSwitch checked={doNotSaveMeetingsEnabled} onChange={onDoNotSaveMeetingsChange} />
        </SettingsRow>
        <SettingsRow
          label="Hide from screen capture"
          hint="Harder to capture in screen shares and recordings."
        >
          <ToggleSwitch checked={stealthModeUi} onChange={onStealthModeChange} />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Overlay appearance">
        <div>
          <SettingsFieldLabel>Accent color (overlay &amp; global chat)</SettingsFieldLabel>
          <SettingsFieldHint>Accent applies to the overlay and Global Chat only.</SettingsFieldHint>
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

        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <SettingsFieldLabel>Window opacity</SettingsFieldLabel>
            <span className="font-mono text-xs text-zinc-400">{Math.round(overlayOpacityUi * 100)}%</span>
          </div>
          <SettingsFieldHint>The overlay updates live as you drag the slider.</SettingsFieldHint>

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

        <div className="mt-4">
          <SettingsFieldLabel>Font size</SettingsFieldLabel>
          <SettingsFieldHint>Used when auto-scroll answers is off.</SettingsFieldHint>
          <SettingsSelect value={overlayFontUi} onChange={(e) => onOverlayFontChange(e.target.value)} fullWidth>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </SettingsSelect>
        </div>

        <div className="mt-4 [&>.nat-row]:border-b-0 [&>.nat-row]:p-0">
          <SettingsRow
            label="Live transcript panel"
            hint="Show Me and Participant columns during Listen."
          >
            <ToggleSwitch checked={overlayLiveTranscriptUi} onChange={onLiveTranscriptChange} />
          </SettingsRow>
        </div>

        <div className="mt-3 [&>.nat-row]:border-b-0 [&>.nat-row]:p-0">
          <SettingsRow
            label="Auto-scroll transcript"
            hint="Follow new speech in the live transcript columns."
          >
            <ToggleSwitch checked={overlayTranscriptAutoScrollUi} onChange={onTranscriptAutoScrollChange} />
          </SettingsRow>
        </div>

        <div className="mt-4">
          <SettingsFieldLabel>Snap position</SettingsFieldLabel>
          <SettingsFieldHint>Primary monitor placement for the expanded panel.</SettingsFieldHint>
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

      <SettingsSection title="Answers & screenshots" description="Answer format, language, and screen context for Ask AI.">
        <div>
          <SettingsFieldLabel>Custom instructions</SettingsFieldLabel>
          <SettingsFieldHint>Appended to the system prompt for every answer.</SettingsFieldHint>
          <textarea
            value={interviewCustomInstructionsUi || ''}
            onChange={(e) => onInterviewCustomInstructionsChange?.(e.target.value.slice(0, 2000))}
            onBlur={() => onInterviewCustomInstructionsBlur?.()}
            rows={3}
            placeholder="How should the AI craft your answers? e.g. Add filler words to sound natural"
            className="input-shadow min-h-[72px] w-full max-w-2xl resize-y px-3 py-2.5 text-[13px] leading-relaxed"
          />
        </div>
        <div className="mt-4">
          <SettingsFieldLabel>Answer structure</SettingsFieldLabel>
          <SettingsFieldHint>Behavioral framework for spoken answers.</SettingsFieldHint>
          <SegmentedControl
            value={answerStructureUi}
            onChange={onAnswerStructureChange}
            options={ANSWER_STRUCTURES.map((o) => ({ id: o.value, label: o.label }))}
          />
        </div>
        <div className="mt-4">
          <SettingsFieldLabel>Response format</SettingsFieldLabel>
          <SettingsFieldHint>Bullets use a compact layout. Conversational adds natural fillers.</SettingsFieldHint>
          <SegmentedControl
            value={responseFormatUi}
            onChange={onResponseFormatChange}
            options={RESPONSE_FORMATS.map((o) => ({ id: o.value, label: o.label }))}
          />
        </div>
        <div className="mt-4">
          <SettingsFieldLabel>Answer length</SettingsFieldLabel>
          <SettingsFieldHint>Controls prompt depth. Overlay font size follows this when auto-scroll is on.</SettingsFieldHint>
          <SegmentedControl
            value={answerLengthUi}
            onChange={onAnswerLengthChange}
            options={ANSWER_LENGTHS.map((o) => ({ id: o.value, label: o.label }))}
          />
        </div>
        <div className="mt-4">
          <SettingsFieldLabel>Response language</SettingsFieldLabel>
          <SettingsFieldHint>Optional language instruction for answers. Default follows your question.</SettingsFieldHint>
          <SettingsSelect
            value={aiResponseLanguageUi || ''}
            onChange={(e) => onAiResponseLanguageChange?.(e.target.value)}
            fullWidth
          >
            {listAiResponseLanguages().map((opt) => (
              <option key={opt.id || 'auto'} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </SettingsSelect>
        </div>
        <div className="mt-4 [&>.nat-row]:border-b-0 [&>.nat-row]:p-0">
          <SettingsRow
            label="Conversation follow-ups"
            hint="Resolve short continuations against the most relevant question and answer in this session."
          >
            <ToggleSwitch checked={conversationFollowUpsEnabled} onChange={onConversationFollowUpsChange} />
          </SettingsRow>
        </div>
        <div className="mt-4">
          <SettingsFieldLabel>Answer history</SettingsFieldLabel>
          <SettingsFieldHint>Latest keeps the overlay on the current exchange. History keeps earlier replies.</SettingsFieldHint>
          <SegmentedControl
            value={overlayAnswerViewUi}
            onChange={onAnswerViewChange}
            options={[
              { id: 'latest', label: 'Latest only' },
              { id: 'history', label: 'Full history' },
            ]}
          />
        </div>
        <div className="mt-4 [&>.nat-row]:border-b-0 [&>.nat-row]:p-0">
          <SettingsRow
            label="Auto-scroll answers"
            hint="Keep the streaming answer in view. Text size follows Answer length when on."
          >
            <ToggleSwitch checked={overlayAnswerAutoScrollUi} onChange={onOverlayAnswerAutoScrollChange} />
          </SettingsRow>
        </div>
        <div className="mt-4 [&>.nat-row]:border-b-0 [&>.nat-row]:p-0">
          <SettingsRow
            label="Auto-answer questions"
            hint="After speech silence, automatically Ask AI. With Auto-scroll answers also on, uses phone-style utterance gates, follow-ups, and longer speak-hold while you read the answer."
          >
            <ToggleSwitch checked={assistAutoTriggerUi} onChange={onAssistAutoTriggerChange} />
          </SettingsRow>
        </div>
        <div className="mt-3" aria-disabled={!assistAutoTriggerUi} style={!assistAutoTriggerUi ? { opacity: 0.5 } : undefined}>
          <SettingsFieldLabel>Question detection</SettingsFieldLabel>
          <SettingsFieldHint>High triggers on short questions. Low waits for longer utterances.</SettingsFieldHint>
          <SegmentedControl
            value={questionDetectionUi}
            onChange={onQuestionDetectionChange}
            disabled={!assistAutoTriggerUi}
            options={QUESTION_DETECTION_LEVELS.map((o) => ({ id: o.value, label: o.label }))}
          />
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-zinc-500">
          Screen capture: <strong className="font-semibold text-zinc-300">Ctrl+Enter</strong> attaches a screenshot to Ask.
          Queue extra shots with <strong className="font-semibold text-zinc-300">Ctrl+H</strong> (Keybinds).
        </p>
      </SettingsSection>

      <SettingsSection title="Behavior">
        <SettingsRow
          label="Mouse passthrough"
          hint="When on, clicks pass through the overlay until you hover the notch or panel. When off, only the notch, panel, and footer capture clicks — transparent areas still pass through. Toggle with Ctrl+Shift+P."
        >
          <ToggleSwitch checked={overlayMousePassthroughUi} onChange={onOverlayMousePassthroughChange} />
        </SettingsRow>
      </SettingsSection>

      <SettingsCollapsible
        title="Diagnostics & advanced"
        description="Logging, taskbar visibility, and answer pinning — power-user knobs, tucked out of the way."
        icon={Terminal}
      >
        <div className="space-y-4">
          <SettingsRow
            label="Verbose debug logging"
            hint="Captures main-process and overlay/settings console output to veilassist.log. A toast with the file path appears when enabled."
          >
            <div className="flex items-center gap-2">
              <ToggleSwitch checked={verboseDebugLogging} onChange={onVerboseDebugLoggingChange} />
            </div>
          </SettingsRow>
          <button type="button" onClick={onOpenLogFile} className="nat-btn-secondary mt-1 px-4 py-2 text-[12px]">
            Open log file
          </button>
          <SettingsRow
            label="Hide from taskbar"
            hint="Force-hide the app from the Windows taskbar even in Visible mode. Invisible mode always hides it. Only one taskbar icon (overlay) is used when shown."
          >
            <ToggleSwitch checked={hideFromTaskbarUi} onChange={onHideFromTaskbarChange} />
          </SettingsRow>
          <SettingsRow
            label="Pin answers to top"
            hint="While the AI streams, keep the latest answer at the top unless you scroll away."
          >
            <ToggleSwitch checked={overlayAnswerPinToTopUi} onChange={onAnswerPinToTopChange} />
          </SettingsRow>
        </div>
      </SettingsCollapsible>
    </SettingsPage>
  )
}
