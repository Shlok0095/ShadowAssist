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
  const autoId = useId()
  const labelId = `${autoId}-label`
  // Give the control an accessible name for free when it's a single element
  // (the common case: a ToggleSwitch/Select/etc.) that doesn't already declare one.
  const canAutoLabel =
    !htmlFor &&
    React.isValidElement(children) &&
    !children.props['aria-label'] &&
    !children.props['aria-labelledby']
  const control = canAutoLabel ? React.cloneElement(children, { 'aria-labelledby': labelId }) : children

  return (
    <div className="nat-row">
      <div className="min-w-0 flex-1 pr-2">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="settings-row-label">
            {label}
          </label>
        ) : (
          <span id={canAutoLabel ? labelId : undefined} className="settings-row-label">
            {label}
          </span>
        )}
        {hint ? (
          <p className="settings-row-hint">
            {polishCopy(hint)}
          </p>
        ) : null}
      </div>
      <div className="w-full shrink-0 sm:w-auto">{control}</div>
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

export const ToggleSwitch = memo(function ToggleSwitch({ checked, onChange, disabled, ...aria }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className="nat-toggle disabled:cursor-not-allowed disabled:opacity-40"
      {...aria}
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

export function SettingsLoadingSkeleton() {
  return (
    <div className="settings-loading-skeleton mx-auto max-w-3xl space-y-5 animate-pulse" aria-busy="true" aria-label="Loading settings">
      <div className="h-8 w-48 rounded-lg bg-white/[0.06]" />
      <div className="glass-panel space-y-4 p-5">
        <div className="h-4 w-32 rounded bg-white/[0.06]" />
        <div className="h-10 w-full rounded-lg bg-white/[0.04]" />
        <div className="h-10 w-full rounded-lg bg-white/[0.04]" />
      </div>
      <div className="glass-panel space-y-4 p-5">
        <div className="h-4 w-40 rounded bg-white/[0.06]" />
        <div className="h-10 w-full rounded-lg bg-white/[0.04]" />
      </div>
    </div>
  )
}

export function SaveStatusBadge({ status = 'idle' }) {
  if (status === 'saving') {
    return <span className="settings-save-badge settings-save-badge-saving">Saving…</span>
  }
  if (status === 'saved') {
    return <span className="settings-save-badge settings-save-badge-saved">Saved</span>
  }
  return null
}

export function SegmentedControl({ options, value, onChange, disabled = false, className = '' }) {
  return (
    <div
      className={`settings-segmented ${disabled ? 'opacity-45 pointer-events-none' : ''} ${className}`}
      role="radiogroup"
      aria-disabled={disabled || undefined}
    >
      {options.map((opt) => {
        const id = typeof opt === 'string' ? opt : opt.id
        const label = typeof opt === 'string' ? opt : opt.label
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={value === id}
            disabled={disabled}
            tabIndex={disabled ? -1 : undefined}
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

/**
 * Frameless confirmation dialog for destructive settings actions (spec: never a
 * bare native confirm() in this window). Renders nothing when closed.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  onCancel,
}) {
  if (!open) return null
  return (
    <div className="settings-modal-overlay" role="presentation" onMouseDown={onCancel}>
      <div
        className="settings-modal-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="settings-confirm-title"
        aria-describedby={description ? 'settings-confirm-desc' : undefined}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 id="settings-confirm-title" className="settings-modal-title">
          {title}
        </h3>
        {description ? (
          <p id="settings-confirm-desc" className="settings-modal-desc">
            {polishCopy(description)}
          </p>
        ) : null}
        <div className="settings-modal-actions">
          <button type="button" className="btn-ghost" onClick={onCancel} autoFocus>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={destructive ? 'btn-danger' : 'btn-glow'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/** @typedef {import('lucide-react').LucideIcon} LucideIcon */

export function SettingsCollapsible({
  title,
  description,
  badge = null,
  defaultOpen = false,
  forceOpen = false,
  icon: HeaderIcon = null,
  className = '',
  children,
}) {
  return (
    <details className={`glass-panel group overflow-hidden ${className}`.trim()} open={forceOpen || defaultOpen || undefined}>
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
