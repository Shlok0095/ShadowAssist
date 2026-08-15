import type { AppSettings } from '../../profileTypes'
import { Toggle, Segmented } from './SettingsPrimitives'
import { ModelSelect } from './ModelSelect'
import { PremiumSelect } from './PremiumSelect'
import { STT_PROVIDER_META, sttKeyConfigured, sttModelOptions } from '../../sttRegistry'

function sttModelField(id: AppSettings['sttProvider']): keyof AppSettings {
  if (id === 'nvidia') return 'nvidiaWhisperModel'
  if (id === 'deepgram') return 'deepgramModel'
  if (id === 'groq') return 'groqWhisperModel'
  return 'selectedModel'
}

export function AudioSettingsSection({
  settings,
  onChange,
}: {
  settings: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
}) {
  const cloudStt = settings.sttMode === 'cloud'
  const meta = STT_PROVIDER_META.find((p) => p.id === settings.sttProvider)!
  const keySaved = sttKeyConfigured(settings, meta.id)
  const modelField = sttModelField(meta.id)
  const modelValue = String(settings[modelField] || '')
  const keyValue = String(settings[meta.keyField] || '')

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
        <div className="mobile-settings-card mobile-provider-card mt-3">
          <PremiumSelect
            label="Active cloud STT provider"
            value={settings.sttProvider}
            onChange={(e) =>
              onChange({ sttProvider: e.target.value as AppSettings['sttProvider'] })
            }
          >
            {STT_PROVIDER_META.map((p) => (
              <option key={p.id} value={p.id}>
                {p.badge} · {p.label}
                {sttKeyConfigured(settings, p.id) ? ' ✓' : ''}
              </option>
            ))}
          </PremiumSelect>

          <div className="mobile-provider-detail">
            <div className="mobile-provider-detail-head">
              <span className="mobile-vendor-badge">{meta.badge}</span>
              <strong>{meta.label}</strong>
              {keySaved ? <span className="mobile-vendor-saved">Key saved</span> : null}
            </div>
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
                onChange={(e) => onChange({ [meta.keyField]: e.target.value } as Partial<AppSettings>)}
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
                  onChange={(m) => onChange({ [modelField]: m } as Partial<AppSettings>)}
                />
              </label>
            ) : (
              <p className="mobile-field-hint">Uses fixed model: whisper-1</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
