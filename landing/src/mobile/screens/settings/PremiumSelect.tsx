import type { ReactNode, SelectHTMLAttributes } from 'react'
import { OutlinedSelect } from './SettingsPrimitives'

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
      <OutlinedSelect value={value} onChange={onChange}>
        {children}
      </OutlinedSelect>
      {hint ? <p className="mobile-field-hint">{hint}</p> : null}
    </div>
  )
}
