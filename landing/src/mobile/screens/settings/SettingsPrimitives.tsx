import type { ReactNode, SelectHTMLAttributes } from 'react'

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
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

export function SettingsLeading({ children }: { children: ReactNode }) {
  return (
    <span className="mobile-settings-leading" aria-hidden>
      {children}
    </span>
  )
}

export function OutlinedSelect({
  value,
  onChange,
  children,
  className = '',
}: {
  value: string
  onChange: SelectHTMLAttributes<HTMLSelectElement>['onChange']
  children: ReactNode
  className?: string
}) {
  return (
    <div className="mobile-outlined-select">
      <select className={`mobile-select ${className}`.trim()} value={value} onChange={onChange}>
        {children}
      </select>
      <span className="mobile-select-chevron" aria-hidden>
        <ChevronDownIcon />
      </span>
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="mobile-segmented" role="radiogroup">
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`mobile-segmented-btn ${active ? 'active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function icon(d: string) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronDownIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export const SettingsIcons = {
  topic: icon('M4 6h16M4 12h10M4 18h16'),
  person: icon('M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 8a7 7 0 0 1 14 0'),
  spark: icon('M12 3v4M12 17v4M4.9 6.5l2.8 2.8M16.3 14.7l2.8 2.8M3 12h4M17 12h4M4.9 17.5l2.8-2.8M16.3 9.3l2.8-2.8'),
  awake: icon('M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4l1.4-1.4M17 7l1.4-1.4M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z'),
  mic: icon('M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Zm7 9a7 7 0 0 1-14 0M12 19v2'),
  language: icon('M4 5h9M8.5 5c0 8-4.5 12-4.5 12M13 5c-1 5-4 9-7 11M10 19l8-14h2l-8 14h-2Zm4.5-3h5'),
  tune: icon('M4 7h16M4 12h10M4 17h16M18 10v4'),
  wave: icon('M3 12h2l2-6 4 12 3-8 2 4h5'),
  palette: icon('M12 4a8 8 0 1 0 0 16h2a2 2 0 0 0 0-4h-1a3 3 0 0 1 0-6h5A8 8 0 0 0 12 4Z'),
  text: icon('M5 6h14M12 6v12M8 18h8'),
  scroll: icon('M12 5v14M7 14l5 5 5-5'),
  chevron: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

export const SESSION_SETTING_ICONS = {
  transcription: SettingsIcons.wave,
  autoScroll: SettingsIcons.scroll,
  autoAnswer: SettingsIcons.spark,
}

export function SettingToggleRow({
  icon,
  label,
  on,
  onChange,
}: {
  icon?: ReactNode
  label: string
  on: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="mobile-settings-row">
      {icon ? <SettingsLeading>{icon}</SettingsLeading> : null}
      <span className="mobile-settings-row-label">{label}</span>
      <Toggle on={on} onChange={onChange} />
    </div>
  )
}
