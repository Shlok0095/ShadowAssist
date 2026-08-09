import { useEffect, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { LiveLineChart, type LiveLinePoint } from '@/components/charts/live-line-chart'
import { LiveLine } from '@/components/charts/live-line'
import { LiveXAxis } from '@/components/charts/live-x-axis'
import { LiveYAxis } from '@/components/charts/live-y-axis'
import { chartCssVars } from '@/components/charts/chart-context'

const STAT_TILES = [
  { v: '12+', l: 'Supported languages' },
  { v: '95%', l: 'Speech-to-text accuracy' },
  { v: '0', l: 'Meeting bots required' },
] as const

function seedLatency(): LiveLinePoint[] {
  const now = Date.now() / 1000
  return Array.from({ length: 24 }, (_, i) => ({
    time: now - (24 - i) * 0.45,
    value: 280 + Math.sin(i * 0.35) * 40 + Math.random() * 25,
  }))
}

/** Bklit live chart + anime.js stat counters for the performance section. */
export function VaStatsLive() {
  const [data, setData] = useState<LiveLinePoint[]>(() => seedLatency())
  const [value, setValue] = useState(300)
  const tilesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tick = window.setInterval(() => {
      const now = Date.now() / 1000
      const next = 260 + Math.random() * 90
      setValue(next)
      setData((prev) => [...prev.slice(-80), { time: now, value: next }])
    }, 420)
    return () => window.clearInterval(tick)
  }, [])

  useEffect(() => {
    if (!tilesRef.current) return
    const tiles = tilesRef.current.querySelectorAll('.va-stat-tile')
    animate(tiles, {
      opacity: [0, 1],
      translateY: [24, 0],
      scale: [0.92, 1],
      delay: stagger(90, { start: 200 }),
      duration: 650,
      ease: 'outExpo',
    })
  }, [])

  return (
    <div className="va-stats-live">
      <div className="va-stats-live__chart">
        <p className="va-stats-live__label">Response latency (live)</p>
        <LiveLineChart
          className="va-stats-live__bklit"
          data={data}
          value={value}
          window={28}
          exaggerate
          style={{ height: 260 }}
        >
          <LiveLine
            dataKey="value"
            stroke={chartCssVars.linePrimary}
            formatValue={(v) => `${Math.round(v)}ms`}
          />
          <LiveXAxis />
          <LiveYAxis position="left" formatValue={(v) => `${Math.round(v)}ms`} />
        </LiveLineChart>
      </div>

      <div ref={tilesRef} className="va-stats-live__tiles">
        {STAT_TILES.map((s) => (
          <div key={s.l} className="va-stat-tile">
            <span className="va-stat-tile__v">{s.v}</span>
            <span className="va-stat-tile__l">{s.l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
