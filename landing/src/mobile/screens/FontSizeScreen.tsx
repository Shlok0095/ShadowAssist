import ReactMarkdown from 'react-markdown'
import type { AppSettings, FontSize } from '../profileTypes'
import { ScreenHeader } from '../components/MobileUi'
import { SettingToggleRow } from './settings/SettingsPrimitives'
import { FONT_SIZES } from '../settingsCatalog'

const STEPS: Exclude<FontSize, 'system'>[] = ['small', 'standard', 'large', 'xlarge']

const PREVIEW_ANSWER = `My key strengths include:

- Strong problem-solving abilities
- Experience leading cross-functional teams
- Technical expertise in system optimization`

export function FontSizeScreen({
  settings,
  onChange,
  onBack,
}: {
  settings: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
  onBack: () => void
}) {
  const followSystem = settings.fontSize === 'system'
  const active: Exclude<FontSize, 'system'> = followSystem
    ? 'standard'
    : settings.fontSize === 'small' || settings.fontSize === 'large' || settings.fontSize === 'xlarge'
      ? settings.fontSize
      : 'standard'
  const step = STEPS.indexOf(active)

  return (
    <div className="mobile-screen">
      <ScreenHeader title="Font Size" onBack={onBack} />
      <div className="mobile-screen-body mobile-font-size-body">
        <div className="mobile-font-preview">
          <article className="mobile-interview-turn">
            <p className="mobile-interview-turn-q">What are your greatest strengths?</p>
            <div className="mobile-interview-turn-a">
              <ReactMarkdown>{PREVIEW_ANSWER}</ReactMarkdown>
            </div>
          </article>
        </div>
      </div>
      <div className="mobile-font-size-panel">
        <div className="mobile-settings-card">
          <SettingToggleRow
            label="Follow System"
            hint="Use device font size settings"
            on={followSystem}
            onChange={(on) => onChange({ fontSize: on ? 'system' : 'standard' })}
          />
        </div>
        <div className={`mobile-font-slider-wrap ${followSystem ? 'is-disabled' : ''}`}>
          <div className="mobile-font-slider-labels">
            {FONT_SIZES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`mobile-font-slider-label ${!followSystem && active === opt.value ? 'is-active' : ''}`}
                disabled={followSystem}
                onClick={() => onChange({ fontSize: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <input
            type="range"
            min={0}
            max={3}
            step={1}
            value={step < 0 ? 1 : step}
            disabled={followSystem}
            aria-label="Answer text size"
            onChange={(e) => onChange({ fontSize: STEPS[Number(e.target.value)] || 'standard' })}
          />
        </div>
      </div>
    </div>
  )
}
