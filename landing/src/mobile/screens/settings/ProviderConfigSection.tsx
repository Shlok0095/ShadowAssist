import { useState, type ReactNode, type SelectHTMLAttributes } from 'react'
import { PremiumSelect } from './PremiumSelect'

export function ProviderConfigSection({
  groupLabel,
  intro,
  selectLabel,
  value,
  onChange,
  options,
  badge,
  title,
  keySaved,
  description,
  docs,
  children,
}: {
  groupLabel: string
  intro?: string
  selectLabel: string
  value: string
  onChange: SelectHTMLAttributes<HTMLSelectElement>['onChange']
  options: { value: string; label: string }[]
  badge: string
  title: string
  keySaved: boolean
  description?: string
  docs?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <section className="mobile-settings-group">
      <p className="mobile-settings-group-label">{groupLabel}</p>
      {intro ? <p className="mobile-section-hint mobile-settings-intro">{intro}</p> : null}

      <div className="mobile-provider-shell">
        <PremiumSelect label={selectLabel} value={value} onChange={onChange}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </PremiumSelect>

        <button
          type="button"
          className="mobile-provider-collapse-btn"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <div className="mobile-provider-collapse-main">
            <span className="mobile-vendor-badge">{badge}</span>
            <span className="mobile-provider-collapse-title">{title}</span>
            {keySaved ? <span className="mobile-vendor-saved">Key saved</span> : null}
          </div>
          <span className="mobile-provider-collapse-chevron" aria-hidden>{open ? '▾' : '▸'}</span>
        </button>

        {open ? (
          <div className="mobile-provider-detail">
            {description ? <p className="mobile-vendor-desc">{description}</p> : null}
            {docs ? (
              <a className="mobile-vendor-docs" href={docs} target="_blank" rel="noreferrer">
                Get API key ↗
              </a>
            ) : null}
            {children}
          </div>
        ) : null}
      </div>
    </section>
  )
}
