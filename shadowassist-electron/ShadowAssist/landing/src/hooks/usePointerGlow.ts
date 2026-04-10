import { useCallback, useEffect, useRef, type MouseEvent } from 'react'

const LERP = 0.1
/** Pull highlight toward center so motion isn’t 1:1 with the cursor */
const DAMP = 0.34
const DEFAULT = { x: 50, y: 38 }

/**
 * Smooth pointer-follow glow: damped target + lerp into `--gx` / `--gy` (percent).
 */
export function usePointerGlow() {
  const ref = useRef<HTMLDivElement | null>(null)
  const current = useRef({ ...DEFAULT })
  const target = useRef({ ...DEFAULT })

  useEffect(() => {
    let raf = 0
    let alive = true

    const tick = () => {
      if (!alive) return
      const el = ref.current
      const cur = current.current
      const tgt = target.current
      cur.x += (tgt.x - cur.x) * LERP
      cur.y += (tgt.y - cur.y) * LERP
      if (el) {
        el.style.setProperty('--gx', `${cur.x.toFixed(2)}%`)
        el.style.setProperty('--gy', `${cur.y.toFixed(2)}%`)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [])

  const onMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) return
    const px = ((e.clientX - r.left) / r.width) * 100
    const py = ((e.clientY - r.top) / r.height) * 100
    target.current = {
      x: DEFAULT.x + (px - DEFAULT.x) * DAMP,
      y: DEFAULT.y + (py - DEFAULT.y) * DAMP,
    }
  }, [])

  const onMouseLeave = useCallback(() => {
    target.current = { ...DEFAULT }
  }, [])

  return { ref, onMouseMove, onMouseLeave }
}
