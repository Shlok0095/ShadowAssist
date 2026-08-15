import type { ReactNode } from 'react'

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

export function SettingToggleRow({
  icon,
  label,
  on,
  onChange,
}: {
  icon: ReactNode
  label: string
  on: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="mobile-interview-setting-row">
      <div className="mobile-interview-setting-row-label">
        <span className="mobile-interview-setting-icon" aria-hidden>
          {icon}
        </span>
        <span>{label}</span>
      </div>
      <Toggle on={on} onChange={onChange} />
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

function MonitorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  )
}

function ScrollIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 5v14M7 14l5 5 5-5" />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.4 4.3L18 8l-4.6 1.7L12 14l-1.4-4.3L6 8l4.6-1.7L12 2zm6 10l.9 2.7L22 16l-3.1 1.1L18 20l-.9-2.9L14 16l3.1-1.3L18 12zm-12 0l.9 2.7L10 16l-3.1 1.1L6 20l-.9-2.9L2 16l3.1-1.3L6 12z" />
    </svg>
  )
}

export const SESSION_SETTING_ICONS = {
  transcription: <MonitorIcon />,
  autoScroll: <ScrollIcon />,
  autoAnswer: <SparkleIcon />,
}
