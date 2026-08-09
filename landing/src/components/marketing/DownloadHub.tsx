import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { animate, stagger } from 'animejs'
import { LinuxIcon, MacIcon, WindowsIcon } from '@/components/marketing/LightButton'
import { PLATFORMS, type PlatformDownload } from '@/config/platforms'
import type { PlatformId } from '@/config/platforms'
import { useDetectedPlatform } from '@/hooks/useDetectedPlatform'

const ICONS = { windows: WindowsIcon, macos: MacIcon, linux: LinuxIcon } as const

const TAB_ORDER: PlatformId[] = ['windows', 'macos', 'linux']

function PlatformPanel({ platform }: { platform: PlatformDownload }) {
  const Icon = platform.icon
  return (
    <div className="dl-hub__panel">
      <div className="dl-hub__panel-head">
        <span className="dl-hub__panel-icon">
          <Icon />
        </span>
        <div>
          <h3>{platform.name}</h3>
          <p>{platform.desc}</p>
        </div>
      </div>
      <div className="dl-hub__actions">
        <a href={platform.download.href} className="dl-hub__btn dl-hub__btn--primary">
          {platform.download.label}
        </a>
      </div>
    </div>
  )
}

/** Interactive download hub — tabbed platforms, glass panel, Motion + anime.js. */
export function DownloadHub() {
  const { preferred, isDetected } = useDetectedPlatform()
  const reduceMotion = useReducedMotion()
  const [active, setActive] = useState<PlatformId>(preferred)
  const hubRef = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setActive(preferred)
  }, [preferred])

  useEffect(() => {
    if (reduceMotion || !particlesRef.current) return
    const dots = particlesRef.current.querySelectorAll('.dl-hub__particle')
    if (!dots.length) return
    animate(dots, {
      translateY: () => animeRandom(-18, 18),
      translateX: () => animeRandom(-12, 12),
      opacity: () => animeRandom(0.15, 0.55),
      delay: stagger(40, { from: 'center' }),
      duration: () => animeRandom(2200, 4200),
      ease: 'inOutSine',
      loop: true,
      alternate: true,
    })
  }, [reduceMotion, active])

  const platform = PLATFORMS.find((p) => p.id === active) ?? PLATFORMS[0]

  return (
    <div ref={hubRef} className="dl-hub">
      <div ref={particlesRef} className="dl-hub__particles" aria-hidden>
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} className="dl-hub__particle" style={{ left: `${(i * 17) % 100}%`, top: `${(i * 23) % 100}%` }} />
        ))}
      </div>

      {isDetected ? (
        <motion.p
          className="dl-hub__detect"
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          Download for <strong>{PLATFORMS.find((p) => p.id === preferred)?.name}</strong>, or choose another platform.
        </motion.p>
      ) : null}

      <div className="dl-hub__tabs" role="tablist" aria-label="Download platform">
        {TAB_ORDER.map((id) => {
          const p = PLATFORMS.find((x) => x.id === id)!
          const Icon = ICONS[id]
          const selected = active === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`dl-hub__tab${selected ? ' is-active' : ''}${id === preferred ? ' is-detected' : ''}`}
              onClick={() => setActive(id)}
            >
              <Icon />
              <span>{p.name}</span>
              {id === preferred ? <span className="dl-hub__tab-badge">You</span> : null}
              {selected ? (
                <motion.span layoutId="dl-hub-tab-indicator" className="dl-hub__tab-indicator" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="dl-hub__stage">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            role="tabpanel"
            initial={reduceMotion ? false : { opacity: 0, y: 16, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -10, filter: 'blur(4px)' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <PlatformPanel platform={platform} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function animeRandom(min: number, max: number) {
  return min + Math.random() * (max - min)
}
