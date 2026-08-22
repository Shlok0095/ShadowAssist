import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'

export function SettingsSheet({
  title,
  subtitle,
  onClose,
  children,
  search,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  search?: { value: string; onChange: (v: string) => void; placeholder?: string }
}) {
  const startY = useRef(0)
  const dragging = useRef(false)
  const [dy, setDy] = useState(0)
  const dyRef = useRef(0)
  dyRef.current = dy

  const close = useCallback(() => {
    setDy(0)
    onClose()
  }, [onClose])

  useEffect(() => {
    const onBack = (event: Event) => {
      event.preventDefault()
      close()
    }
    window.addEventListener('veilassist:settings-back', onBack)
    return () => window.removeEventListener('veilassist:settings-back', onBack)
  }, [close])

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true
    startY.current = e.clientY
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    setDy(Math.max(0, e.clientY - startY.current))
  }

  const onPointerUp = () => {
    if (!dragging.current) return
    dragging.current = false
    if (dyRef.current > 88) {
      close()
      return
    }
    setDy(0)
  }

  return (
    <div className="mobile-choice-root" role="dialog" aria-modal="true" aria-labelledby="choice-sheet-title">
      <button type="button" className="mobile-choice-backdrop" aria-label="Dismiss" onClick={close} />
      <div
        className="mobile-choice-sheet"
        style={{ transform: `translateY(${dy}px)` }}
      >
        <div
          className="mobile-choice-grab"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="mobile-sheet-handle" aria-hidden />
          <h2 id="choice-sheet-title" className="mobile-choice-title">
            {title}
          </h2>
          {subtitle ? <p className="mobile-choice-sub">{subtitle}</p> : null}
        </div>
        {search ? (
          <label className="mobile-choice-search">
            <span className="mobile-choice-search-icon" aria-hidden>
              ⌕
            </span>
            <input
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder || 'Search…'}
            />
          </label>
        ) : null}
        <div className="mobile-choice-body">{children}</div>
      </div>
    </div>
  )
}

export function ChoiceRow({
  selected,
  title,
  detail,
  leading,
  onSelect,
}: {
  selected: boolean
  title: string
  detail?: string
  leading?: ReactNode
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={`mobile-choice-row ${selected ? 'is-selected' : ''}`}
      onClick={onSelect}
    >
      {leading ? <span className="mobile-choice-leading">{leading}</span> : null}
      <span className="mobile-choice-row-text">
        <span className="mobile-choice-row-title">
          {title}
          {detail ? `: ${detail}` : ''}
        </span>
      </span>
      {selected ? (
        <span className="mobile-choice-check" aria-hidden>
          ✓
        </span>
      ) : null}
    </button>
  )
}
