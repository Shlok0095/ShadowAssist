import { useRef, useState, type ReactNode } from 'react'

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
  const dragIndex = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const move = (from: number, to: number) => {
    onReorder(reorderList(items, from, to))
  }

  return (
    <div className="mobile-draggable-list">
      {items.map((item, index) => {
        const controls: ReorderControls = {
          onMoveUp: index > 0 ? () => move(index, index - 1) : undefined,
          onMoveDown: index < items.length - 1 ? () => move(index, index + 1) : undefined,
          dragHandleProps: {
            draggable: true,
            onDragStart: (e) => {
              dragIndex.current = index
              e.dataTransfer.effectAllowed = 'move'
            },
            onDragEnd: () => {
              dragIndex.current = null
              setDragOverIndex(null)
            },
          },
          cardProps: {
            onDragOver: (e) => {
              e.preventDefault()
              setDragOverIndex(index)
            },
            onDrop: (e) => {
              e.preventDefault()
              const from = dragIndex.current
              if (from != null && from !== index) move(from, index)
              dragIndex.current = null
              setDragOverIndex(null)
            },
            className: dragOverIndex === index ? 'mobile-list-card drag-over' : 'mobile-list-card',
          },
        }
        return children(item, index, controls)
      })}
    </div>
  )
}

export type ReorderControls = {
  onMoveUp?: () => void
  onMoveDown?: () => void
  dragHandleProps: {
    draggable: boolean
    onDragStart: (e: React.DragEvent) => void
    onDragEnd: () => void
  }
  cardProps: {
    onDragOver: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
    className: string
  }
}

export function DragHandle({
  controls,
}: {
  controls: ReorderControls
}) {
  return (
    <div className="mobile-drag-handle-wrap">
      <span
        className="mobile-drag"
        title="Drag to reorder"
        {...controls.dragHandleProps}
      >
        ⋮⋮
      </span>
      <div className="mobile-reorder-arrows">
        {controls.onMoveUp ? (
          <button type="button" className="mobile-reorder-btn" aria-label="Move up" onClick={controls.onMoveUp}>
            ↑
          </button>
        ) : null}
        {controls.onMoveDown ? (
          <button type="button" className="mobile-reorder-btn" aria-label="Move down" onClick={controls.onMoveDown}>
            ↓
          </button>
        ) : null}
      </div>
    </div>
  )
}
