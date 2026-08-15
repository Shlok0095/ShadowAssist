import type { AppSettings } from '../profileTypes'
import { ScreenHeader } from '../components/MobileUi'
import { AiProvidersSection } from './settings/AiProvidersSection'
import { AudioSettingsSection } from './settings/AudioSettingsSection'
import {
  OutlinedSelect,
  Segmented,
  SettingToggleRow,
  SettingsIcons,
  SettingsLeading,
} from './settings/SettingsPrimitives'

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
      <ScreenHeader title="Settings" onBack={onBack} />

      <div className="mobile-screen-body">
        <section className="mobile-settings-group">
          <p className="mobile-settings-group-label">Interview</p>
          <div className="mobile-settings-card">
            <label className="mobile-field">
              <span>Interview topic</span>
              <input
                value={settings.interviewTopic}
                onChange={(e) => onChange({ interviewTopic: e.target.value })}
                placeholder="AI/ML Engineer focusing on LLMs, NLP…"
              />
            </label>
            <label className="mobile-field">
              <span>Custom instructions</span>
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
          <p className="mobile-settings-group-label">Personalization</p>
          <div className="mobile-settings-card">
            <button type="button" className="mobile-settings-link" onClick={onOpenPersonalInfo}>
              <SettingsLeading>{SettingsIcons.person}</SettingsLeading>
              <span className="mobile-settings-row-label">Personal info</span>
              <span className="mobile-settings-chevron">{SettingsIcons.chevron}</span>
            </button>
          </div>
        </section>

        <AiProvidersSection settings={settings} onChange={onChange} />
        <AudioSettingsSection settings={settings} onChange={onChange} />

        <section className="mobile-settings-group">
          <p className="mobile-settings-group-label">AI responses</p>
          <div className="mobile-settings-card mobile-settings-stack">
            <SettingToggleRow
              icon={SettingsIcons.spark}
              label="Auto-answer"
              on={settings.autoAnswer}
              onChange={(v) => onChange({ autoAnswer: v })}
            />
            <label className="mobile-field">
              <span>Answer structure</span>
              <OutlinedSelect
                value={settings.answerStructure}
                onChange={(e) =>
                  onChange({ answerStructure: e.target.value as AppSettings['answerStructure'] })
                }
              >
                <option value="star">STAR: Situation, Task, Action, Result</option>
                <option value="direct">Direct answer</option>
                <option value="concise">Concise</option>
              </OutlinedSelect>
            </label>
            <label className="mobile-field">
              <span>Response format</span>
              <OutlinedSelect
                value={settings.responseFormat}
                onChange={(e) =>
                  onChange({ responseFormat: e.target.value as AppSettings['responseFormat'] })
                }
              >
                <option value="bullets">Bullet points</option>
                <option value="paragraph">Paragraph</option>
              </OutlinedSelect>
            </label>
            <div className="mobile-field">
              <span>Answer length</span>
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
              <span>Question detection</span>
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
          <p className="mobile-settings-group-label">Appearance</p>
          <div className="mobile-settings-card mobile-settings-stack">
            <div className="mobile-field">
              <span>Theme</span>
              <Segmented
                value={settings.colorScheme}
                options={[
                  { value: 'dark', label: 'Dark' },
                  { value: 'light', label: 'Light' },
                ]}
                onChange={(v) => onChange({ colorScheme: v })}
              />
            </div>
            <div className="mobile-field">
              <span>Font size</span>
              <Segmented
                value={settings.fontSize}
                options={[
                  { value: 'small', label: 'Small' },
                  { value: 'standard', label: 'Standard' },
                  { value: 'large', label: 'Large' },
                ]}
                onChange={(v) => onChange({ fontSize: v })}
              />
            </div>
            <SettingToggleRow
              icon={SettingsIcons.scroll}
              label="Auto-scroll answers"
              on={settings.autoScroll}
              onChange={(v) => onChange({ autoScroll: v })}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
