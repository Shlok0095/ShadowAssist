import type { AppSettings } from '../../profileTypes'
import { Toggle, Segmented } from './SettingsPrimitives'

export function AudioSettingsSection({
  settings,
  onChange,
}: {
  settings: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
}) {
  const cloudStt = settings.sttMode === 'cloud'
  const sttKeyReady =
    settings.sttProvider === 'groq' ? settings.groqKey.trim().length > 0 : settings.apiKey.trim().length > 0

  return (
    <section className="mobile-settings-group">
      <p className="mobile-settings-group-label">AUDIO</p>
      <p className="mobile-section-hint mobile-settings-intro">
        Microphone and speech-to-text for live interview transcription on your phone.
      </p>

      <div className="mobile-info-card mobile-audio-note">
        <p className="mobile-info-card-title">Android mic tip</p>
        <ul className="mobile-info-card-list">
          <li>Only one app can use the mic at a time — use another device for the video call.</li>
          <li>Hold the phone near you; this app uses the device mic, not call audio.</li>
        </ul>
      </div>

      <div className="mobile-settings-card space-y-3">
        <div className="mobile-settings-row">
          <div className="mobile-settings-row-text">
            <span className="mobile-settings-row-label">Microphone</span>
            <span className="mobile-settings-row-hint">Turn off to pause listening without ending the session.</span>
          </div>
          <Toggle on={settings.audioEnabled} onChange={(v) => onChange({ audioEnabled: v })} />
        </div>

        <label className="mobile-field">
          <span>Listen language</span>
          <select
            value={settings.micListenLanguage}
            onChange={(e) =>
              onChange({ micListenLanguage: e.target.value as AppSettings['micListenLanguage'] })
            }
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="en_hi_hinglish">English + Hindi (Hinglish)</option>
          </select>
          <span className="mobile-field-hint">Used for on-device and cloud speech recognition.</span>
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
          <span className="mobile-field-hint">Boost picks up softer speech from farther away.</span>
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
            On-device uses your phone&apos;s speech engine (free, no key). Cloud uses Groq/OpenAI Whisper (more accurate).
          </span>
        </div>

        {cloudStt ? (
          <>
            <label className="mobile-field">
              <span>Cloud STT provider</span>
              <select
                value={settings.sttProvider}
                onChange={(e) => onChange({ sttProvider: e.target.value as AppSettings['sttProvider'] })}
              >
                <option value="groq">Groq Whisper</option>
                <option value="openai">OpenAI Whisper</option>
              </select>
            </label>
            {settings.sttProvider === 'groq' ? (
              <label className="mobile-field">
                <span>Whisper model</span>
                <select
                  value={settings.groqWhisperModel}
                  onChange={(e) => onChange({ groqWhisperModel: e.target.value })}
                >
                  <option value="whisper-large-v3-turbo">Whisper Large v3 Turbo</option>
                  <option value="whisper-large-v3">Whisper Large v3</option>
                </select>
              </label>
            ) : null}
            <p className="mobile-field-hint">
              {sttKeyReady
                ? `Uses your saved ${settings.sttProvider === 'groq' ? 'Groq' : 'OpenAI'} API key from AI Providers.`
                : `Add a ${settings.sttProvider === 'groq' ? 'Groq' : 'OpenAI'} key in AI Providers below.`}
            </p>
          </>
        ) : null}

        <div className="mobile-settings-row">
          <div className="mobile-settings-row-text">
            <span className="mobile-settings-row-label">Show live transcription</span>
            <span className="mobile-settings-row-hint">Display the transcript panel during interviews.</span>
          </div>
          <Toggle
            on={settings.showTranscription}
            onChange={(v) => onChange({ showTranscription: v })}
          />
        </div>
      </div>
    </section>
  )
}
