import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { motion, useReducedMotion } from 'motion/react'
import { LightButton } from '@/components/marketing/LightButton'
import { sortPlatformsForUser } from '@/config/platforms'
import { SITE } from '@/config/site'
import { useDetectedPlatform } from '@/hooks/useDetectedPlatform'

export function PlatformDownloads() {
  const { preferred, isDetected } = useDetectedPlatform()
  const reduceMotion = useReducedMotion()
  const gridRef = useRef<HTMLDivElement>(null)
  const platforms = sortPlatformsForUser(preferred)

  useEffect(() => {
    if (reduceMotion || !gridRef.current) return
    const cards = gridRef.current.querySelectorAll('.download-card')
    if (!cards.length) return
    animate(cards, {
      opacity: [0, 1],
      translateY: [28, 0],
      delay: stagger(90, { start: 120 }),
      duration: 680,
      ease: 'outExpo',
    })
  }, [reduceMotion, preferred])

  return (
    <>
      {isDetected ? (
        <motion.p
          className="download-detect-banner"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          Showing downloads for <strong>{platforms[0].name}</strong> first — all platforms available below.
        </motion.p>
      ) : null}
      <div ref={gridRef} className="download-pair">
        {platforms.map((p, index) => {
          const Icon = p.icon
          const isPreferred = index === 0
          return (
            <motion.article
              key={p.id}
              className={`download-card va-download-card${isPreferred ? ' download-card--preferred' : ''}`}
              initial={reduceMotion ? false : { opacity: 0 }}
              whileHover={reduceMotion ? undefined : { y: -4, transition: { duration: 0.2 } }}
            >
              {isPreferred ? <span className="download-card__glow" aria-hidden /> : null}
              <div className="download-card__head">
                <Icon />
                <h3>{p.name}</h3>
                {isPreferred ? <span className="download-card__rec">Recommended for you</span> : null}
              </div>
              <p className="download-card__desc">{p.desc}</p>
              <div className="download-card__actions">
                <LightButton href={p.primary.href} variant="primary" size="sm">
                  {p.primary.label}
                </LightButton>
                <LightButton href={p.secondary.href} variant="secondary" size="sm">
                  {p.secondary.label}
                </LightButton>
              </div>
            </motion.article>
          )
        })}
      </div>
      <p className="download-meta-line download-meta-line__muted">
        macOS builds are unsigned — use right-click → Open the first time.{' '}
        <a href={SITE.checksumsTxtUrl}>SHA256 checksums</a>
      </p>
    </>
  )
}
