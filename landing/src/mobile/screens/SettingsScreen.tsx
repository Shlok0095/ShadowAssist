import type { AppSettings } from '../profileTypes'
import { AiProvidersSection } from './settings/AiProvidersSection'
import { AudioSettingsSection } from './settings/AudioSettingsSection'
import { Segmented, Toggle } from './settings/SettingsPrimitives'

export function HomeScreen({
  onStart,
  onOpenSettings,
  profileReady,
  hasApiKey,
}: {
  onStart: () => void
  onOpenSettings: () => void
  profileReady: boolean
  hasApiKey: boolean
}) {
  return (
    <div className="mobile-home">
      <header className="mobile-home-header">
        <div className="flex items-center gap-2">
          <img src="./logo.png" alt="VeilAssist" className="mobile-interview-logo" />
          <span className="text-sm font-semibold text-white/85">VeilAssist</span>
        </div>
        <button type="button" className="mobile-interview-icon-btn" aria-label="Settings" onClick={onOpenSettings}>
          ⚙
        </button>
      </header>

      <div className="mobile-info-card">
        <p className="mobile-info-card-title">Use a different device for your interview call</p>
        <ul className="mobile-info-card-list">
          <li>Android only allows one app to use the mic at a time.</li>
          <li>Don&apos;t use headphones — the app uses the device mic, not system audio.</li>
        </ul>
      </div>

      <div className="mobile-home-center">
        <h2 className="mobile-home-ready">Ready when you are</h2>
        <button
          type="button"
          className="mobile-start-btn"
          onClick={onStart}
          disabled={!profileReady || !hasApiKey}
        >
          <span className="mobile-start-icon">▶</span>
          Start Interview
        </button>
        {!profileReady ? (
          <p className="mobile-home-hint">Add your resume in Settings → Personal Info first.</p>
        ) : null}
        {!hasApiKey ? (
          <p className="mobile-home-hint">Add your API key in Settings → AI Providers.</p>
        ) : null}
      </div>
    </div>
  )
}

export function SettingsScreen({
  settings,
  onChange,
  onBack,
  onOpenPersonalInfo,
}: {
  settings: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
  onBack: () => void
  onOpenPersonalInfo: () => void
}) {
  return (
    <div className="mobile-screen">
      <header className="mobile-screen-header">
        <button type="button" className="mobile-interview-icon-btn" onClick={onBack}>←</button>
        <h1 className="mobile-screen-title">Settings</h1>
        <span className="w-9" />
      </header>

      <div className="mobile-screen-body">
        <section className="mobile-settings-group">
          <p className="mobile-settings-group-label">INTERVIEW</p>
          <div className="mobile-settings-card">
            <label className="mobile-field">
              <span>Interview Topic</span>
              <input
                value={settings.interviewTopic}
                onChange={(e) => onChange({ interviewTopic: e.target.value })}
                placeholder="AI/ML Engineer focusing on LLMs, NLP…"
              />
            </label>
            <label className="mobile-field">
              <span>Custom Instructions</span>
              <textarea
                rows={3}
                value={settings.customInstructions}
                onChange={(e) => onChange({ customInstructions: e.target.value })}
                placeholder="How should the AI craft your answers?"
              />
            </label>
          </div>
        </section>

        <section className="mobile-settings-group">
          <p className="mobile-settings-group-label">PERSONALIZATION</p>
          <div className="mobile-settings-card">
            <button type="button" className="mobile-settings-link" onClick={onOpenPersonalInfo}>
              <div>
                <span className="mobile-settings-row-label">Personal Info</span>
                <span className="mobile-settings-row-hint">Your background for personalized answers.</span>
              </div>
              <span>›</span>
            </button>
          </div>
        </section>

        <AiProvidersSection settings={settings} onChange={onChange} />
        <AudioSettingsSection settings={settings} onChange={onChange} />

        <section className="mobile-settings-group">
          <p className="mobile-settings-group-label">AI RESPONSES</p>
          <div className="mobile-settings-card space-y-3">
            <div className="mobile-settings-row">
              <div className="mobile-settings-row-text">
                <span className="mobile-settings-row-label">Auto-answer questions</span>
                <span className="mobile-settings-row-hint">
                  Generate answers automatically when questions are detected.
                </span>
              </div>
              <Toggle on={settings.autoAnswer} onChange={(v) => onChange({ autoAnswer: v })} />
            </div>
            <label className="mobile-field">
              <span>Answer Structure</span>
              <select
                value={settings.answerStructure}
                onChange={(e) =>
                  onChange({ answerStructure: e.target.value as AppSettings['answerStructure'] })
                }
              >
                <option value="star">STAR: Situation, Task, Action, Result</option>
                <option value="direct">Direct answer</option>
                <option value="concise">Concise</option>
              </select>
            </label>
            <label className="mobile-field">
              <span>Response Format</span>
              <select
                value={settings.responseFormat}
                onChange={(e) =>
                  onChange({ responseFormat: e.target.value as AppSettings['responseFormat'] })
                }
              >
                <option value="bullets">Bullet points</option>
                <option value="paragraph">Paragraph</option>
              </select>
            </label>
            <div className="mobile-field">
              <span>Answer Length</span>
              <Segmented
                value={settings.answerLength}
                options={[
                  { value: 'short', label: 'Short' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'long', label: 'Long' },
                ]}
                onChange={(v) => onChange({ answerLength: v })}
              />
            </div>
            <div className="mobile-field">
              <span>Question Detection</span>
              <Segmented
                value={settings.questionDetection}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                ]}
                onChange={(v) => onChange({ questionDetection: v })}
              />
            </div>
          </div>
        </section>

        <section className="mobile-settings-group">
          <p className="mobile-settings-group-label">DISPLAY</p>
          <div className="mobile-settings-card">
            <label className="mobile-field">
              <span>Font Size</span>
              <select
                value={settings.fontSize}
                onChange={(e) => onChange({ fontSize: e.target.value as AppSettings['fontSize'] })}
              >
                <option value="small">Small</option>
                <option value="standard">Standard</option>
                <option value="large">Large</option>
              </select>
            </label>
            <div className="mobile-settings-row">
              <span className="mobile-settings-row-label">Auto-scroll answers</span>
              <Toggle on={settings.autoScroll} onChange={(v) => onChange({ autoScroll: v })} />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
