// Copyright (c) 2026 VeilAssist. All rights reserved.

import React, { useCallback, useEffect, useState } from 'react'
import { GROQ_WHISPER } from './settingsConstants'
import { createIpcShim } from '../shared/ipcShim'
import {
  ModelSelect,
  SegmentedControl,
  SettingsBadge,
  SettingsCollapsible,
  SettingsFieldLabel,
  SettingsPage,
  SettingsPanelShell,
  SettingsRow,
  SettingsSection,
  ToggleSwitch,
} from './SettingsComponents'
import { MEETING_LANGUAGES } from '../shared/interviewSettings'

const ipc = createIpcShim()

const LOCAL_STT_MODEL_OPTIONS = [
  { id: 'auto', label: 'Auto (language-based)' },
  { id: 'moonshine-base', label: 'Moonshine Base' },
  { id: 'moonshine-tiny', label: 'Moonshine Tiny (fastest)' },
]

function AdvancedSttKeyRow({ label, saved, placeholder, onSave, extra }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <SettingsFieldLabel className="!mb-0">{label}</SettingsFieldLabel>
        {saved ? <SettingsBadge>Saved</SettingsBadge> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          type="password"
          placeholder={saved ? '••••••••' : placeholder}
          className="input-shadow min-w-[200px] flex-1 px-3 py-2 text-sm"
          onBlur={(e) => {
            if (e.target.value.trim()) {
              onSave(e.target.value.trim())
              e.target.value = ''
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              onSave(e.target.value.trim())
              e.target.value = ''
            }
          }}
        />
        {extra}
      </div>
    </div>
  )
}

export default function SpeechSettingsPanel({
  embedded = false,
  snap,
  audioEnabled,
  onAudioEnabledChange,
  micSensitivity,
  onMicSensitivityChange,
  sttModeUi,
  onSttModeChange,
  sttCapableMeta,
  sttProvider,
  onSttProviderChange,
  currentSttMeta,
  sttKeyField,
  sttKeySaved,
  sttSecretInput,
  onSttSecretInputChange,
  onSaveSttKey,
  keySetMap,
  onSaveKey,
  onPatchSnap,
  onSave,
  meetingListenLanguageUi = 'en',
  onMeetingListenLanguageChange,
}) {
  const [audioInputs, setAudioInputs] = useState([])
  const [localModelInfo, setLocalModelInfo] = useState(null)

  const refreshAudioDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    try {
      const probe = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      probe.getTracks().forEach((t) => t.stop())
    } catch {
      /* labels may stay blank without permission */
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      setAudioInputs(devices.filter((d) => d.kind === 'audioinput'))
    } catch {
      setAudioInputs([])
    }
  }, [])

  useEffect(() => {
    refreshAudioDevices()
    navigator.mediaDevices?.addEventListener?.('devicechange', refreshAudioDevices)
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', refreshAudioDevices)
  }, [refreshAudioDevices])

  useEffect(() => {
    if (sttModeUi !== 'local' || !ipc) return
    ipc
      .invoke('local-stt:model-info')
      .then((info) => setLocalModelInfo(info || null))
      .catch(() => setLocalModelInfo(null))
  }, [sttModeUi, snap?.localSttModelPreference, snap?.micListenLanguage])

  const sttProviderOptions = sttCapableMeta.map((p) => ({ id: p.id, label: p.label }))

  return (
    <SettingsPanelShell
      embedded={embedded}
      title="Audio"
      description="Microphone capture and speech-to-text while Listen is active."
    >
      <SettingsSection title="Capture" description="Microphone is transcribed in chunks while Listen is active.">
        <SettingsRow label="Microphone / audio" hint="Turn off if you only want screen-based Ask AI.">
          <ToggleSwitch checked={audioEnabled} onChange={onAudioEnabledChange} />
        </SettingsRow>

        <SettingsRow
          label="Mic sensitivity"
          hint="Boost helps quiet microphones — restart Listen after changing."
        >
          <select
            value={micSensitivity}
            onChange={(e) => onMicSensitivityChange(e.target.value === 'boost' ? 'boost' : 'standard')}
            className="input-shadow w-full px-3 py-2 text-sm sm:w-52"
          >
            <option value="standard" className="bg-void-900">
              Standard
            </option>
            <option value="boost" className="bg-void-900">
              Boost (quiet mic)
            </option>
          </select>
        </SettingsRow>

        <SettingsRow
          label="Meeting / listen language"
          hint="STT accent hint — use English (India) or Hinglish for Indian interviews. Restart Listen after changing."
        >
          <select
            value={meetingListenLanguageUi}
            onChange={(e) => onMeetingListenLanguageChange?.(e.target.value)}
            className="input-shadow w-full px-3 py-2 text-sm sm:w-64"
          >
            {MEETING_LANGUAGES.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-void-900">
                {opt.label}
              </option>
            ))}
          </select>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Audio devices"
        description="Optional mic preference for Listen capture. Restart Listen after changing."
      >
        <SettingsRow label="Microphone" hint="Default uses the system default input device.">
          <select
            value={snap?.preferredMicId || ''}
            onChange={(e) => {
              const v = e.target.value
              onPatchSnap('preferredMicId', v)
              onSave('preferredMicId', v)
            }}
            className="input-shadow w-full px-3 py-2 text-sm sm:max-w-md"
          >
            <option value="" className="bg-void-900">
              System default
            </option>
            {audioInputs.map((d) => (
              <option key={d.deviceId} value={d.deviceId} className="bg-void-900">
                {d.label || `Microphone ${d.deviceId.slice(0, 8)}…`}
              </option>
            ))}
          </select>
        </SettingsRow>
        <p className="text-[11px] leading-relaxed text-zinc-500">
          Device labels appear after microphone permission is granted once.
          <button type="button" onClick={refreshAudioDevices} className="ml-1 text-accent underline">
            Refresh list
          </button>
        </p>
      </SettingsSection>

      <SettingsSection
        title="Transcription engine"
        description="Local: Moonshine streams live with Natively-style hallucination filters (no second-model gate by default). Cloud: Groq Whisper uses verbose_json gate; NVIDIA Parakeet does not."
      >
        {snap && (
          <>
            <div className="settings-row-tile flex flex-col gap-3">
              <div>
                <span className="text-[13px] font-medium text-gray-200">Processing mode</span>
              </div>
              <SegmentedControl
                value={sttModeUi}
                onChange={onSttModeChange}
                options={[
                  { id: 'local', label: 'Local (on-device)' },
                  { id: 'cloud', label: 'Cloud (API key)' },
                ]}
              />
            </div>

            {sttModeUi === 'local' && (
              <>
                <SettingsRow
                  label="Local STT model"
                  hint="Auto picks Moonshine for English and Whisper Tiny for Hindi/Hinglish."
                >
                  <select
                    value={snap?.localSttModelPreference || 'auto'}
                    onChange={(e) => {
                      const v = e.target.value
                      onPatchSnap('localSttModelPreference', v)
                      onSave('localSttModelPreference', v)
                    }}
                    className="input-shadow w-full px-3 py-2 text-sm sm:w-64"
                  >
                    {LOCAL_STT_MODEL_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id} className="bg-void-900">
                        {o.label}
                      </option>
                    ))}
                  </select>
                </SettingsRow>
                {localModelInfo?.spec && (
                  <div className="rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3 text-[11px] leading-relaxed text-zinc-400">
                    <p>
                      Active model:{' '}
                      <span className="font-mono text-zinc-300">{localModelInfo.spec.modelId}</span>
                      {' · '}
                      {localModelInfo.status?.state || 'idle'}
                    </p>
                  </div>
                )}
              </>
            )}

            <div>
              <SettingsFieldLabel>Active STT provider</SettingsFieldLabel>
              <select
                value={sttProvider}
                onChange={(e) => onSttProviderChange(e.target.value)}
                className="input-shadow w-full px-3 py-2 text-sm sm:max-w-md"
              >
                {sttProviderOptions.map((o) => (
                  <option key={o.id} value={o.id} className="bg-void-900">
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {sttKeyField && (
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <SettingsFieldLabel className="!mb-0">
                    {currentSttMeta?.label || 'STT'} API key
                  </SettingsFieldLabel>
                  {sttKeySaved ? <SettingsBadge>Key saved</SettingsBadge> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="password"
                    value={sttSecretInput}
                    onChange={(e) => onSttSecretInputChange(e.target.value)}
                    placeholder={sttKeySaved ? '••••••••' : `Paste ${currentSttMeta?.label || 'STT'} API key`}
                    className="input-shadow min-w-[200px] flex-1 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={onSaveSttKey}
                    className="btn-ghost px-4 py-2 text-xs"
                  >
                    Save key
                  </button>
                </div>
              </div>
            )}

            {sttProvider === 'groq' && (
              <>
                <ModelSelect
                  label="STT model"
                  value={snap.groqWhisperModel || 'whisper-large-v3'}
                  models={GROQ_WHISPER}
                  onChange={(v) => {
                    onPatchSnap('groqWhisperModel', v)
                    onSave('groqWhisperModel', v)
                  }}
                />
                <p className="text-[11px] leading-relaxed text-zinc-500">
                  Recommended: <span className="font-mono text-zinc-400">whisper-large-v3</span> for Hindi, Hinglish, and
                  fewer silence hallucinations. Turbo is faster but less accurate on quiet audio.
                </p>
              </>
            )}

            {sttProvider === 'elevenlabs' && (
              <div>
                <SettingsFieldLabel>STT model</SettingsFieldLabel>
                <input
                  type="text"
                  value={snap?.elevenLabsModel || 'scribe_v2_realtime'}
                  onChange={(e) => onPatchSnap('elevenLabsModel', e.target.value)}
                  onBlur={(e) => onSave('elevenLabsModel', e.target.value.trim() || 'scribe_v2_realtime')}
                  className="input-shadow w-full px-3 py-2 font-mono text-xs sm:w-72"
                />
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                  ElevenLabs Scribe v2 Realtime — live streaming via main process (~150ms latency).
                </p>
              </div>
            )}

            {sttProvider === 'deepgram' && (
              <div>
                <SettingsFieldLabel>STT model</SettingsFieldLabel>
                <select
                  value={snap?.deepgramModel || 'nova-3-general'}
                  onChange={(e) => {
                    onPatchSnap('deepgramModel', e.target.value)
                    onSave('deepgramModel', e.target.value)
                  }}
                  className="input-shadow w-full px-3 py-2 text-sm sm:w-52"
                >
                  {['nova-3-general', 'nova-3', 'nova-2', 'enhanced', 'base'].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                  Deepgram uses live streaming in the overlay — lower latency than Whisper batch.
                </p>
              </div>
            )}

            {sttProvider === 'openai' && (
              <div className="rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3">
                <SettingsFieldLabel className="!mb-1">STT model</SettingsFieldLabel>
                <p className="font-mono text-sm text-gray-300">whisper-1</p>
              </div>
            )}

            {sttProvider === 'nvidia' && (
              <div className="rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3">
                <SettingsFieldLabel className="!mb-1">STT model</SettingsFieldLabel>
                <p className="font-mono text-sm text-gray-300">Parakeet 1.1b RNNT (multilingual)</p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                  Routed via NVIDIA API catalog on{' '}
                  <span className="font-mono text-zinc-400">grpc.nvcf.nvidia.com</span> — gRPC with your API key; no
                  model name is sent in the request.
                </p>
              </div>
            )}

            {sttProvider === 'azure' && (
              <div className="space-y-3">
                <div>
                  <SettingsFieldLabel>Azure region</SettingsFieldLabel>
                  <input
                    type="text"
                    value={snap?.azureSpeechRegion || 'eastus'}
                    onChange={(e) => onPatchSnap('azureSpeechRegion', e.target.value)}
                    onBlur={(e) => onSave('azureSpeechRegion', e.target.value.trim() || 'eastus')}
                    placeholder="eastus"
                    className="input-shadow w-full px-3 py-2 text-sm sm:w-52"
                  />
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-500">
                  Azure Speech streams via main process (REST per utterance). Locale follows Mic listen language.
                </p>
              </div>
            )}

            {sttProvider === 'google' && (
              <div>
                <SettingsFieldLabel>BCP-47 language</SettingsFieldLabel>
                <input
                  type="text"
                  value={snap?.googleSttLanguage || 'en-US'}
                  onChange={(e) => onPatchSnap('googleSttLanguage', e.target.value)}
                  onBlur={(e) => onSave('googleSttLanguage', e.target.value.trim() || 'en-US')}
                  className="input-shadow w-full px-3 py-2 font-mono text-xs sm:w-52"
                />
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                  Google Cloud Speech-to-Text REST — requires a Google Cloud API key with Speech API enabled.
                </p>
              </div>
            )}

            {sttProvider === 'soniox' && (
              <div>
                <SettingsFieldLabel>STT model</SettingsFieldLabel>
                <input
                  type="text"
                  value={snap?.sonioxModel || 'stt-rt-v5'}
                  onChange={(e) => onPatchSnap('sonioxModel', e.target.value)}
                  onBlur={(e) => onSave('sonioxModel', e.target.value.trim() || 'stt-rt-v5')}
                  className="input-shadow w-full px-3 py-2 font-mono text-xs sm:w-72"
                />
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                  Soniox real-time WebSocket — low-latency multilingual streaming in the main process.
                </p>
              </div>
            )}
          </>
        )}
      </SettingsSection>

      <SettingsCollapsible
        title="Advanced STT providers"
        description="Optional keys for Deepgram, ElevenLabs, Azure, Google, and Soniox — active when selected above."
        badge="Keys"
      >
        <div className="space-y-5">
          <p className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-2 text-[11px] leading-relaxed text-emerald-100/80">
            Deepgram, ElevenLabs, Azure, Google, and Soniox use the same PCM capture path — select the provider above and save its API key.
          </p>

          <AdvancedSttKeyRow
            label="Deepgram API key"
            saved={keySetMap.deepgramKey}
            placeholder="Paste Deepgram API key"
            onSave={(v) => onSaveKey('deepgramKey', v)}
            extra={
              <select
                value={snap?.deepgramModel || 'nova-3-general'}
                onChange={(e) => {
                  onPatchSnap('deepgramModel', e.target.value)
                  onSave('deepgramModel', e.target.value)
                }}
                className="input-shadow px-2 py-1 text-xs"
              >
                {['nova-3-general', 'nova-3', 'nova-2', 'enhanced', 'base'].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            }
          />
          <p className="-mt-3 text-[10px] text-zinc-600">
            Get key:{' '}
            <a href="https://console.deepgram.com/" target="_blank" rel="noreferrer" className="text-accent underline">
              console.deepgram.com
            </a>
          </p>

          <AdvancedSttKeyRow
            label="ElevenLabs API key (Scribe STT)"
            saved={keySetMap.elevenLabsKey}
            placeholder="Paste ElevenLabs API key"
            onSave={(v) => onSaveKey('elevenLabsKey', v)}
          />
          <p className="-mt-3 text-[10px] text-zinc-600">
            Get key:{' '}
            <a
              href="https://elevenlabs.io/app/speech-to-text"
              target="_blank"
              rel="noreferrer"
              className="text-accent underline"
            >
              elevenlabs.io
            </a>
          </p>

          <AdvancedSttKeyRow
            label="Azure Speech key"
            saved={keySetMap.azureSpeechKey}
            placeholder="Paste Azure Speech key"
            onSave={(v) => onSaveKey('azureSpeechKey', v)}
            extra={
              <input
                type="text"
                value={snap?.azureSpeechRegion || 'eastus'}
                onChange={(e) => {
                  onPatchSnap('azureSpeechRegion', e.target.value)
                  onSave('azureSpeechRegion', e.target.value)
                }}
                placeholder="Region (e.g. eastus)"
                className="input-shadow w-[130px] px-3 py-2 text-sm"
              />
            }
          />
          <p className="-mt-3 text-[10px] text-zinc-600">
            Get key:{' '}
            <a href="https://portal.azure.com/" target="_blank" rel="noreferrer" className="text-accent underline">
              portal.azure.com → Cognitive Services → Speech
            </a>
          </p>

          <AdvancedSttKeyRow
            label="Google Cloud STT key"
            saved={keySetMap.googleSttKey}
            placeholder="Paste Google Cloud API key"
            onSave={(v) => onSaveKey('googleSttKey', v)}
          />
          <p className="-mt-3 text-[10px] text-zinc-600">
            Get key:{' '}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
              className="text-accent underline"
            >
              console.cloud.google.com
            </a>
          </p>

          <AdvancedSttKeyRow
            label="Soniox API key"
            saved={keySetMap.sonioxKey}
            placeholder="Paste Soniox API key"
            onSave={(v) => onSaveKey('sonioxKey', v)}
            extra={
              <input
                type="text"
                value={snap?.sonioxModel || 'stt-rt-v5'}
                onChange={(e) => {
                  onPatchSnap('sonioxModel', e.target.value)
                  onSave('sonioxModel', e.target.value)
                }}
                placeholder="Model"
                className="input-shadow w-[130px] px-3 py-2 font-mono text-xs"
              />
            }
          />
          <p className="-mt-3 text-[10px] text-zinc-600">
            Get key:{' '}
            <a href="https://soniox.com/" target="_blank" rel="noreferrer" className="text-accent underline">
              soniox.com
            </a>
          </p>
        </div>
      </SettingsCollapsible>
    </SettingsPanelShell>
  )
}
