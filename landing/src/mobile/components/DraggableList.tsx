import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'

export function reorderList<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return items
  if (fromIndex >= items.length || toIndex >= items.length) return items
  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

export function DraggableList<T extends { id: string }>({
  items,
  onReorder,
  children,
}: {
  items: T[]
  onReorder: (next: T[]) => void
  children: (item: T, index: number, controls: ReorderControls) => ReactNode
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const fromRef = useRef<number | null>(null)
  const overRef = useRef<number | null>(null)
  const ghostRef = useRef<HTMLElement | null>(null)
  const startPtr = useRef({ x: 0, y: 0 })
  const heightsRef = useRef<number[]>([])
  const gapRef = useRef(8)

  useEffect(() => {
    return () => {
      ghostRef.current?.remove()
      ghostRef.current = null
    }
  }, [])

  const cards = () =>
    listRef.current
      ? Array.from(listRef.current.querySelectorAll<HTMLElement>(':scope > .mobile-list-card'))
      : []

  const indexFromPoint = (clientY: number) => {
    const els = cards()
    if (!els.length) return 0
    let best = 0
    let bestDist = Number.POSITIVE_INFINITY
    els.forEach((el, i) => {
      const r = el.getBoundingClientRect()
      const mid = r.top + r.height / 2
      const d = Math.abs(clientY - mid)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    })
    return best
  }

  const clearShifts = () => {
    cards().forEach((el) => {
      el.style.transform = ''
      el.style.transition = ''
    })
  }

  const applyShifts = (from: number, over: number) => {
    const h = heightsRef.current[from] || 0
    const step = h + gapRef.current
    cards().forEach((el, i) => {
      el.style.transition = 'transform 0.16s cubic-bezier(0.2, 0, 0, 1)'
      let y = 0
      if (i !== from) {
        if (from < over && i > from && i <= over) y = -step
        if (from > over && i >= over && i < from) y = step
      }
      el.style.transform = y ? `translateY(${y}px)` : ''
    })
  }

  const removeGhost = () => {
    ghostRef.current?.remove()
    ghostRef.current = null
  }

  const onPointerDown = (index: number) => (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const card = e.currentTarget.closest('.mobile-list-card') as HTMLElement | null
    if (!card || !listRef.current) return
    e.stopPropagation()
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)

    const rect = card.getBoundingClientRect()
    const styles = getComputedStyle(listRef.current)
    gapRef.current = Number.parseFloat(styles.rowGap || styles.gap || '8') || 8
    heightsRef.current = cards().map((el) => el.getBoundingClientRect().height)

    const ghost = card.cloneNode(true) as HTMLElement
    ghost.classList.add('mobile-drag-ghost')
    ghost.style.position = 'fixed'
    ghost.style.left = `${rect.left}px`
    ghost.style.top = `${rect.top}px`
    ghost.style.width = `${rect.width}px`
    ghost.style.height = `${rect.height}px`
    ghost.style.margin = '0'
    ghost.style.zIndex = '500'
    ghost.style.pointerEvents = 'none'
    ghost.style.transform = 'none'
    document.body.appendChild(ghost)
    ghostRef.current = ghost

    startPtr.current = { x: e.clientX, y: e.clientY }
    fromRef.current = index
    overRef.current = index
    card.classList.add('is-placeholder')
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (fromRef.current == null) return
    e.preventDefault()
    const dx = e.clientX - startPtr.current.x
    const dy = e.clientY - startPtr.current.y
    const ghost = ghostRef.current
    if (ghost) {
      ghost.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(2deg) scale(1.03)`
    }
    const next = indexFromPoint(e.clientY)
    if (overRef.current !== next) {
      overRef.current = next
      applyShifts(fromRef.current, next)
    }
  }

  const finishDrag = (e: ReactPointerEvent<HTMLElement>) => {
    if (fromRef.current == null) return
    e.stopPropagation()
    const from = fromRef.current
    const to = overRef.current ?? indexFromPoint(e.clientY)
    cards()[from]?.classList.remove('is-placeholder')
    removeGhost()
    clearShifts()
    fromRef.current = null
    overRef.current = null
    if (from !== to) onReorder(reorderList(items, from, to))
  }

  return (
    <div className="mobile-draggable-list" ref={listRef}>
      {items.map((item, index) => {
        const controls: ReorderControls = {
          dragHandleProps: {
            onPointerDown: onPointerDown(index),
            onPointerMove,
            onPointerUp: finishDrag,
            onPointerCancel: finishDrag,
          },
          cardProps: {
            className: 'mobile-list-card',
          },
        }
        return children(item, index, controls)
      })}
    </div>
  )
}

export type ReorderControls = {
  dragHandleProps: {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void
    onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void
  }
  cardProps: {
    className: string
  }
}

function GripIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  )
}

export function DragHandle({ controls }: { controls: ReorderControls }) {
  return (
    <button
      type="button"
      className="mobile-drag"
      aria-label="Drag to reorder"
      onClick={(e) => e.stopPropagation()}
      {...controls.dragHandleProps}
    >
      <GripIcon />
    </button>
  )
}
