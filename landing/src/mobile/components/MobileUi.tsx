import type { ReactNode } from 'react'

export function ScreenHeader({
  title,
  onBack,
  right,
}: {
  title: string
  onBack?: () => void
  right?: ReactNode
}) {
  return (
    <header className="mobile-screen-header">
      {onBack ? (
        <button type="button" className="mobile-interview-icon-btn" aria-label="Back" onClick={onBack}>
          ←
        </button>
      ) : (
        <span className="w-9" />
      )}
      <h1 className="mobile-screen-title">{title}</h1>
      <div className="mobile-screen-header-right">{right || <span className="w-9" />}</div>
    </header>
  )
}

export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mobile-settings-group">
      <p className="mobile-settings-group-label">{title}</p>
      <div className="mobile-settings-card">{children}</div>
    </section>
  )
}

export function SettingsRow({
  label,
  hint,
  children,
  onClick,
}: {
  label: string
  hint?: string
  children?: ReactNode
  onClick?: () => void
}) {
  const rowClass = onClick ? 'mobile-settings-row clickable' : 'mobile-settings-row'
  return (
    <div className={rowClass} onClick={onClick} role={onClick ? 'button' : undefined}>
      <div className="mobile-settings-row-text">
        <span className="mobile-settings-row-label">{label}</span>
        {hint ? <span className="mobile-settings-row-hint">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

export function SegmentedControl<T extends string>({
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
