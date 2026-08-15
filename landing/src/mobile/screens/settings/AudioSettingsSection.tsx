import { useState } from 'react'
import type { AppSettings } from '../../profileTypes'
import { Toggle, Segmented } from './SettingsPrimitives'
import { ModelSelect } from './ModelSelect'
import { STT_PROVIDER_META, sttKeyConfigured, sttModelOptions } from '../../sttRegistry'

export function AudioSettingsSection({
  settings,
  onChange,
}: {
  settings: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const cloudStt = settings.sttMode === 'cloud'

  return (
    <section className="mobile-settings-group">
      <p className="mobile-settings-group-label">AUDIO</p>
      <p className="mobile-section-hint mobile-settings-intro">
        Microphone capture and cloud speech-to-text (NVIDIA Parakeet, Deepgram, Whisper).
      </p>

      <div className="mobile-info-card mobile-audio-note">
        <p className="mobile-info-card-title">Android mic tip</p>
        <ul className="mobile-info-card-list">
          <li>Use another device for the video call — only one app can use the mic.</li>
          <li>Hold the phone near you; this uses the device mic, not call audio.</li>
        </ul>
      </div>

      <div className="mobile-settings-card space-y-3">
        <div className="mobile-settings-row">
          <div className="mobile-settings-row-text">
            <span className="mobile-settings-row-label">Microphone</span>
            <span className="mobile-settings-row-hint">Pause listening without ending the session.</span>
          </div>
          <Toggle on={settings.audioEnabled} onChange={(v) => onChange({ audioEnabled: v })} />
        </div>

        <label className="mobile-field">
          <span>Listen language</span>
          <select
            className="mobile-select"
            value={settings.micListenLanguage}
            onChange={(e) =>
              onChange({ micListenLanguage: e.target.value as AppSettings['micListenLanguage'] })
            }
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="en_hi_hinglish">English + Hindi (Hinglish)</option>
          </select>
        </label>

        <div className="mobile-field">
          <span>Mic sensitivity</span>
          <Segmented
            value={settings.micSensitivity}
            options={[
              { value: 'standard', label: 'Standard' },
              { value: 'boost', label: 'Boost' },
            ]}
            onChange={(v) => onChange({ micSensitivity: v })}
          />
        </div>

        <div className="mobile-field">
          <span>Transcription engine</span>
          <Segmented
            value={settings.sttMode}
            options={[
              { value: 'device', label: 'On-device' },
              { value: 'cloud', label: 'Cloud API' },
            ]}
            onChange={(v) => onChange({ sttMode: v })}
          />
          <span className="mobile-field-hint">
            On-device is free (phone speech engine). Cloud uses NVIDIA Parakeet, Deepgram, or Whisper.
          </span>
        </div>

        <div className="mobile-settings-row">
          <div className="mobile-settings-row-text">
            <span className="mobile-settings-row-label">Show live transcription</span>
          </div>
          <Toggle
            on={settings.showTranscription}
            onChange={(v) => onChange({ showTranscription: v })}
          />
        </div>
      </div>

      {cloudStt ? (
        <>
          <div className="mobile-settings-card mt-3">
            <label className="mobile-field">
              <span>Active cloud STT provider</span>
              <select
                className="mobile-select"
                value={settings.sttProvider}
                onChange={(e) =>
                  onChange({ sttProvider: e.target.value as AppSettings['sttProvider'] })
                }
              >
                {STT_PROVIDER_META.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                    {sttKeyConfigured(settings, p.id) ? ' ✓' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mobile-vendor-list">
            {STT_PROVIDER_META.map((meta) => {
              const isActive = settings.sttProvider === meta.id
              const isOpen = expanded[meta.id] ?? isActive
              const keySaved = sttKeyConfigured(settings, meta.id)
              const modelField =
                meta.id === 'nvidia'
                  ? 'nvidiaWhisperModel'
                  : meta.id === 'deepgram'
                    ? 'deepgramModel'
                    : meta.id === 'groq'
                      ? 'groqWhisperModel'
                      : 'selectedModel'
              const modelValue = String(settings[modelField as keyof AppSettings] || '')
              const keyField = meta.keyField
              const keyValue = String(settings[keyField] || '')

              return (
                <div key={meta.id} className={`mobile-vendor-card ${isActive ? 'active' : ''}`}>
                  <button
                    type="button"
                    className="mobile-vendor-card-head"
                    onClick={() => setExpanded((prev) => ({ ...prev, [meta.id]: !isOpen }))}
                  >
                    <div className="mobile-vendor-card-title">
                      <span className="mobile-vendor-badge">{meta.badge}</span>
                      <strong>{meta.label}</strong>
                      {isActive ? <span className="mobile-vendor-active-tag">Active</span> : null}
                      {keySaved ? <span className="mobile-vendor-saved">Key saved</span> : null}
                    </div>
                    <span className="mobile-vendor-chevron">{isOpen ? '⌃' : '⌄'}</span>
                  </button>

                  {isOpen ? (
                    <div className="mobile-vendor-card-body">
                      <p className="mobile-vendor-desc">{meta.desc}</p>
                      {meta.docs ? (
                        <a className="mobile-vendor-docs" href={meta.docs} target="_blank" rel="noreferrer">
                          Get API key ↗
                        </a>
                      ) : null}

                      <label className="mobile-field">
                        <span>API key</span>
                        <input
                          className="mobile-input"
                          type="password"
                          value={keyValue}
                          onChange={(e) =>
                            onChange({ [keyField]: e.target.value } as Partial<AppSettings>)
                          }
                          placeholder={keySaved ? '••••••••' : 'Paste API key'}
                        />
                      </label>

                      {meta.id !== 'openai' ? (
                        <label className="mobile-field">
                          <span>Model</span>
                          <ModelSelect
                            value={modelValue}
                            options={sttModelOptions(meta.id)}
                            placeholder={sttModelOptions(meta.id)[0]}
                            onChange={(m) =>
                              onChange({ [modelField]: m } as Partial<AppSettings>)
                            }
                          />
                        </label>
                      ) : (
                        <p className="mobile-field-hint">Uses fixed model: whisper-1</p>
                      )}

                      {!isActive ? (
                        <button
                          type="button"
                          className="mobile-vendor-use-btn"
                          onClick={() => onChange({ sttProvider: meta.id })}
                        >
                          Use {meta.label} for transcription
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </>
      ) : null}
    </section>
  )
}
