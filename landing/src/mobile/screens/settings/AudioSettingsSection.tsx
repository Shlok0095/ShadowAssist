import type { AppSettings } from '../../profileTypes'
import { OutlinedSelect, Segmented, SettingToggleRow, SettingsIcons } from './SettingsPrimitives'
import { ModelSelect } from './ModelSelect'
import { STT_PROVIDER_META, sttKeyConfigured, sttModelOptions } from '../../sttRegistry'
import { ProviderConfigSection } from './ProviderConfigSection'

function sttModelField(id: AppSettings['sttProvider']): keyof AppSettings {
  if (id === 'nvidia') return 'nvidiaWhisperModel'
  return 'groqWhisperModel'
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

  const sttOptions = STT_PROVIDER_META.map((p) => ({
    value: p.id,
    label: `${p.badge} · ${p.label}${sttKeyConfigured(settings, p.id) ? ' ✓' : ''}`,
  }))

  return (
    <>
      <section className="mobile-settings-group">
        <p className="mobile-settings-group-label">Audio</p>

        <div className="mobile-settings-card mobile-settings-stack">
          <SettingToggleRow
            icon={SettingsIcons.awake}
            label="Keep screen awake"
            on={settings.keepScreenAwake}
            onChange={(v) => onChange({ keepScreenAwake: v })}
          />

          <SettingToggleRow
            icon={SettingsIcons.mic}
            label="Microphone"
            on={settings.audioEnabled}
            onChange={(v) => onChange({ audioEnabled: v })}
          />

          <label className="mobile-field">
            <span>Listen language</span>
            <OutlinedSelect
              value={settings.micListenLanguage}
              onChange={(e) =>
                onChange({ micListenLanguage: e.target.value as AppSettings['micListenLanguage'] })
              }
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="en_hi_hinglish">English + Hindi (Hinglish)</option>
            </OutlinedSelect>
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
          </div>

          <SettingToggleRow
            icon={SettingsIcons.wave}
            label="Show live transcription"
            on={settings.showTranscription}
            onChange={(v) => onChange({ showTranscription: v })}
          />
        </div>
      </section>

      {cloudStt ? (
        <ProviderConfigSection
          groupLabel="Cloud speech"
          selectLabel="Provider"
          value={settings.sttProvider}
          onChange={(e) =>
            onChange({ sttProvider: e.target.value as AppSettings['sttProvider'] })
          }
          options={sttOptions}
          badge={meta.badge}
          title={meta.label}
          keySaved={keySaved}
          docs={meta.docs}
        >
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

          <label className="mobile-field">
            <span>Model</span>
            <ModelSelect
              value={modelValue}
              options={sttModelOptions(meta.id)}
              placeholder={sttModelOptions(meta.id)[0]}
              onChange={(m) => onChange({ [modelField]: m } as Partial<AppSettings>)}
            />
          </label>
        </ProviderConfigSection>
      ) : null}
    </>
  )
}
