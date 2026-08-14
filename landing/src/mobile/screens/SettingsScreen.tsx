import type { AppSettings } from '../profileTypes'

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
          <p className="mobile-home-hint">Add your API key in Settings → AI Provider.</p>
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

        <section className="mobile-settings-group">
          <p className="mobile-settings-group-label">AI PROVIDER</p>
          <div className="mobile-settings-card">
            <label className="mobile-field">
              <span>Provider</span>
              <select
                value={settings.provider}
                onChange={(e) => onChange({ provider: e.target.value as AppSettings['provider'] })}
              >
                <option value="nvidia">NVIDIA NIM</option>
                <option value="groq">Groq</option>
                <option value="openai">OpenAI</option>
              </select>
            </label>
            {settings.provider === 'nvidia' ? (
              <>
                <label className="mobile-field">
                  <span>NVIDIA API Key</span>
                  <input
                    type="password"
                    value={settings.nvidiaKey}
                    onChange={(e) => onChange({ nvidiaKey: e.target.value })}
                    placeholder="nvapi-…"
                  />
                </label>
                <label className="mobile-field">
                  <span>Model</span>
                  <input
                    value={settings.nvidiaModel}
                    onChange={(e) => onChange({ nvidiaModel: e.target.value })}
                  />
                </label>
              </>
            ) : null}
            {settings.provider === 'groq' ? (
              <>
                <label className="mobile-field">
                  <span>Groq API Key</span>
                  <input
                    type="password"
                    value={settings.groqKey}
                    onChange={(e) => onChange({ groqKey: e.target.value })}
                    placeholder="gsk_…"
                  />
                </label>
                <label className="mobile-field">
                  <span>Model</span>
                  <input value={settings.groqModel} onChange={(e) => onChange({ groqModel: e.target.value })} />
                </label>
              </>
            ) : null}
            {settings.provider === 'openai' ? (
              <>
                <label className="mobile-field">
                  <span>OpenAI API Key</span>
                  <input
                    type="password"
                    value={settings.apiKey}
                    onChange={(e) => onChange({ apiKey: e.target.value })}
                    placeholder="sk-…"
                  />
                </label>
                <label className="mobile-field">
                  <span>Model</span>
                  <input
                    value={settings.selectedModel}
                    onChange={(e) => onChange({ selectedModel: e.target.value })}
                  />
                </label>
              </>
            ) : null}
            <p className="mobile-field-hint">Bring your own key — same as the desktop app. Keys stay on your device.</p>
          </div>
        </section>

        <section className="mobile-settings-group">
          <p className="mobile-settings-group-label">LANGUAGES</p>
          <div className="mobile-settings-card">
            <label className="mobile-field">
              <span>Interview Language</span>
              <select
                value={settings.interviewLanguage}
                onChange={(e) => onChange({ interviewLanguage: e.target.value })}
              >
                <option value="en">English (Default)</option>
              </select>
            </label>
          </div>
        </section>

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
              <span className="mobile-settings-row-label">Show Transcription</span>
              <Toggle
                on={settings.showTranscription}
                onChange={(v) => onChange({ showTranscription: v })}
              />
            </div>
            <div className="mobile-settings-row">
              <span className="mobile-settings-row-label">Auto-scroll</span>
              <Toggle on={settings.autoScroll} onChange={(v) => onChange({ autoScroll: v })} />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      className={`mobile-interview-toggle ${on ? 'on' : ''}`}
      aria-pressed={on}
      onClick={() => onChange(!on)}
    >
      <span className="mobile-interview-toggle-knob" />
    </button>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="mobile-segmented">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`mobile-segmented-btn ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
