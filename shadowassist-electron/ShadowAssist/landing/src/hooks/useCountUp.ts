import { useEffect, useRef, useState } from 'react'

type CountSpec = {
  value: number
  suffix?: string
  prefix?: string
  decimals?: number
}

function parseStat(raw: string): CountSpec | null {
  const m = raw.match(/^(\D*)([\d.]+)(\D*)$/)
  if (!m) return null
  const num = parseFloat(m[2])
  if (Number.isNaN(num)) return null
  return { prefix: m[1], value: num, suffix: m[3], decimals: m[2].includes('.') ? 1 : 0 }
}

export function useCountUp(display: string, duration = 1400) {
  const ref = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(display)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const spec = parseStat(display)
    if (!spec) {
      setShown(display)
      return
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return
        started.current = true
        const start = performance.now()
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration)
          const eased = 1 - (1 - t) ** 3
          const cur = spec.value * eased
          const fixed = spec.decimals ? cur.toFixed(spec.decimals) : Math.round(cur).toString()
          setShown(`${spec.prefix ?? ''}${fixed}${spec.suffix ?? ''}`)
          if (t < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
        obs.disconnect()
      },
      { threshold: 0.4 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [display, duration])

  return { ref, shown }
}
