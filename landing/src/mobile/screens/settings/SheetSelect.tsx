import { ChevronDownIcon } from './SettingsPrimitives'
import { ChoiceRow, SettingsSheet } from '../../components/SettingsSheet'
import { useState } from 'react'

export function SheetSelect({
  label,
  value,
  options,
  title,
  subtitle,
  onChange,
}: {
  label?: string
  value: string
  options: { value: string; label: string }[]
  title: string
  subtitle?: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((opt) => opt.value === value)
  const display = selected?.label || value || 'Select'

  return (
    <>
      <button type="button" className="mobile-chooser-row" onClick={() => setOpen(true)}>
        <span className="mobile-chooser-copy">
          {label ? <span className="mobile-chooser-label">{label}</span> : null}
          <span className="mobile-chooser-value">{display}</span>
        </span>
        <ChevronDownIcon />
      </button>
      {open ? (
        <SettingsSheet title={title} subtitle={subtitle} onClose={() => setOpen(false)}>
          {options.map((opt) => (
            <ChoiceRow
              key={opt.value}
              selected={opt.value === value}
              title={opt.label}
              onSelect={() => {
                onChange(opt.value)
                setOpen(false)
              }}
            />
          ))}
        </SettingsSheet>
      ) : null}
    </>
  )
}
