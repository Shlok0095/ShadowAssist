import type { ReactNode } from 'react'
import { DragHandle, type ReorderControls } from './DraggableList'

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={open ? 'M6 14l6-6 6 6' : 'M6 10l6 6 6-6'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M9 7V5h6v2M8 7l1 13h6l1-13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function FilledField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
  rows?: number
}) {
  return (
    <label className="mobile-filled-field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  )
}

export function ExpandableProfileCard({
  title,
  meta,
  secondary,
  preview,
  open,
  onToggle,
  controls,
  onDelete,
  children,
}: {
  title: string
  meta?: string
  secondary?: string
  preview?: string
  open: boolean
  onToggle: () => void
  controls: ReorderControls
  onDelete: () => void
  children: ReactNode
}) {
  return (
    <div {...controls.cardProps} className={`mobile-list-card${open ? ' is-open' : ''}`}>
      <div className="mobile-list-card-head">
        <DragHandle controls={controls} />
        <button type="button" className="mobile-list-card-head-main" onClick={onToggle}>
          <div className="mobile-list-card-title">
            <strong>
              {title}
              {meta ? <em> ({meta})</em> : null}
            </strong>
            {secondary ? <span>{secondary}</span> : null}
            {!open && preview ? <p className="mobile-list-card-preview">{preview}</p> : null}
          </div>
          <Chevron open={open} />
        </button>
      </div>
      {open ? (
        <div className="mobile-list-card-body">
          {children}
          <button type="button" className="mobile-delete-btn" onClick={onDelete}>
            <TrashIcon />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  )
}
