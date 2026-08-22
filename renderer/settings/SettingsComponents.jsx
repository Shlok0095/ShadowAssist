// Copyright (c) 2026 VeilAssist. All rights reserved.
// Shared settings UI — aligned with Natively SettingsOverlay patterns.

import React, { memo, useId, useMemo, useState } from 'react'
import { polishCopy } from './settingsCopy'

export const SettingsPage = memo(function SettingsPage({ title, description, children, wide }) {
  return (
    <div className={`settings-page animate-fade-in space-y-5 ${wide ? 'w-full max-w-none' : 'mx-auto max-w-3xl'}`}>
      {(title || description) && (
        <header className="settings-page-header">
          {title ? <h2 className="settings-page-title">{title}</h2> : null}
          {description ? <p className="settings-page-desc">{polishCopy(description)}</p> : null}
        </header>
      )}
      {children}
    </div>
  )
})

/** When embedded inside Advance collapsibles, skip duplicate page chrome. */
export function SettingsPanelShell({ embedded = false, title, description, wide, children }) {
  if (embedded) return <div className="space-y-5">{children}</div>
  return (
    <SettingsPage title={title} description={description} wide={wide}>
      {children}
    </SettingsPage>
  )
}

export function SettingsSection({ title, description, children, className = '' }) {
  return (
    <section className={`glass-panel ${className}`}>
      {(title || description) && (
        <div className="nat-section-head">
          {title ? <h3 className="nat-section-head-title">{title}</h3> : null}
          {description ? <p className="nat-section-head-desc">{polishCopy(description)}</p> : null}
        </div>
      )}
      <div className="nat-section-body space-y-0">{children}</div>
    </section>
  )
}

export function SettingsRow({ label, hint, children, htmlFor }) {
  return (
    <div className="nat-row">
      <div className="min-w-0 flex-1 pr-2">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="settings-row-label">
            {label}
          </label>
        ) : (
          <span className="settings-row-label">
            {label}
          </span>
        )}
        {hint ? (
          <p className="settings-row-hint">
            {polishCopy(hint)}
          </p>
        ) : null}
      </div>
      <div className="w-full shrink-0 sm:w-auto">{children}</div>
    </div>
  )
}

export function SettingsFieldLabel({ children, className = '' }) {
  return <label className={`settings-field-label ${className}`}>{children}</label>
}

export function SettingsFieldHint({ children, className = '' }) {
  return <p className={`settings-field-hint ${className}`.trim()}>{polishCopy(children)}</p>
}

export function SettingsBadge({ children, tone = 'neutral' }) {
  const cls =
    tone === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : tone === 'warn'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
        : 'border-white/10 bg-white/[0.06] text-zinc-400'
  return (
    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${cls}`}>{children}</span>
  )
}

export function SectionTitle({ children, as: Tag = 'h2', className = '' }) {
  return (
    <Tag className={`font-semibold ${className}`} style={{ color: 'var(--text-primary)' }}>
      {children}
    </Tag>
  )
}

export const ToggleSwitch = memo(function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className="nat-toggle disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="nat-toggle-knob" />
    </button>
  )
})

export const SettingsSelect = memo(function SettingsSelect({
  value,
  onChange,
  children,
  className = '',
  disabled = false,
  id,
  name,
  'aria-label': ariaLabel,
  fullWidth = false,
  mono = false,
}) {
  return (
    <div className={`settings-select-wrap ${fullWidth ? 'w-full max-w-md' : ''}`}>
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-label={ariaLabel}
        className={`settings-select input-shadow ${mono ? 'settings-select-mono' : ''} ${fullWidth ? 'settings-select-full' : ''} ${className}`.trim()}
      >
        {children}
      </select>
    </div>
  )
})

export const ModelSelect = memo(function ModelSelect({ label, value, models, onChange, listbox }) {
  const [filter, setFilter] = useState('')
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return models
    return models.filter((m) => m.toLowerCase().includes(q))
  }, [models, filter])
  const display = filtered.length ? filtered : models
  const safeVal = display.includes(value) ? value : display[0] || ''
  return (
    <div>
      <SettingsFieldLabel>{label}</SettingsFieldLabel>
      {listbox && models.length > 6 ? (
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter models…"
          className="input-shadow mb-2 w-full px-3 py-2 font-mono text-xs"
          autoComplete="off"
        />
      ) : null}
      <SettingsSelect value={safeVal} onChange={(e) => onChange(e.target.value)} mono fullWidth>
        {display.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </SettingsSelect>
      {filter.trim() && !filtered.length ? (
        <p className="mt-1 text-[11px] text-amber-400">No match — clear filter or type the model ID directly.</p>
      ) : null}
    </div>
  )
})

export const ModelInput = memo(function ModelInput({ label, value, onChange, onCommit, suggestions, hint }) {
  const id = useId()
  const listId = `${id}-models`
  return (
    <div>
      <SettingsFieldLabel>{label}</SettingsFieldLabel>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onCommit(e.target.value)}
        list={listId}
        className="input-shadow w-full px-3 py-2.5 font-mono text-xs"
        placeholder="Paste model id from vendor docs"
        autoComplete="off"
      />
      <datalist id={listId}>
        {(suggestions || []).map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      {hint ? <p className="mt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{hint}</p> : null}
    </div>
  )
})

export function SegmentedControl({ options, value, onChange, className = '' }) {
  return (
    <div className={`settings-segmented ${className}`} role="group">
      {options.map((opt) => {
        const id = typeof opt === 'string' ? opt : opt.id
        const label = typeof opt === 'string' ? opt : opt.label
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={value === id}
            onClick={() => onChange(id)}
            className={`settings-chip settings-chip-sm !normal-case ${value === id ? 'settings-chip-active' : ''}`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

/** @typedef {import('lucide-react').LucideIcon} LucideIcon */

export function SettingsCollapsible({
  title,
  description,
  badge = null,
  defaultOpen = false,
  icon: HeaderIcon = null,
  className = '',
  children,
}) {
  return (
    <details className={`glass-panel group overflow-hidden ${className}`.trim()} open={defaultOpen || undefined}>
      <summary className="flex cursor-pointer list-none items-start gap-3 px-5 py-4 transition-colors [&::-webkit-details-marker]:hidden">
        {HeaderIcon ? (
          <span
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
          >
            <HeaderIcon size={16} strokeWidth={1.75} aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {title}
            </span>
            {badge ? (
              <span
                className="rounded-md border px-2 py-0.5 text-[10px] font-medium"
                style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
              >
                {badge}
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="settings-collapsible-desc">
              {polishCopy(description)}
            </p>
          ) : null}
        </div>
        <svg
          className="mt-1 h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
          style={{ color: 'var(--text-tertiary)' }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="border-t px-5 pb-5 pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
        {children}
      </div>
    </details>
  )
}
