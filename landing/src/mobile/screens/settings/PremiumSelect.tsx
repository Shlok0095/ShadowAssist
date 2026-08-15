import type { ReactNode, SelectHTMLAttributes } from 'react'

export function PremiumSelect({
  label,
  hint,
  value,
  onChange,
  children,
}: {
  label: string
  hint?: string
  value: string
  onChange: SelectHTMLAttributes<HTMLSelectElement>['onChange']
  children: ReactNode
}) {
  return (
    <div className="mobile-premium-select-wrap">
      <span className="mobile-premium-select-label">{label}</span>
      <div className="mobile-premium-select-shell">
        <select className="mobile-premium-select" value={value} onChange={onChange}>
          {children}
        </select>
        <span className="mobile-premium-select-chevron" aria-hidden>▾</span>
      </div>
      {hint ? <p className="mobile-field-hint">{hint}</p> : null}
    </div>
  )
}
