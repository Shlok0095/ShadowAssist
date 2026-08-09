import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'

/** Hero headline — line stagger with subtle 3D depth. */
export function VaAnimeHero() {
  const rootRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const lines = root.querySelectorAll('.va-line')
    const accents = root.querySelectorAll('.va-gradient')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion) {
      root.querySelectorAll('.va-line, .va-gradient').forEach((el) => {
        ;(el as HTMLElement).style.opacity = '1'
        ;(el as HTMLElement).style.transform = 'none'
      })
      return
    }

    animate(lines, {
      opacity: [0, 1],
      translateY: [28, 0],
      rotateX: [-12, 0],
      delay: stagger(120, { start: 80 }),
      duration: 800,
      ease: 'outCubic',
    })

    animate(accents, {
      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      delay: 400,
      duration: 7000,
      ease: 'inOutSine',
      loop: true,
    })

    const sub = root.parentElement?.querySelector('.va-hero-sub')
    if (sub) {
      animate(sub, {
        opacity: [0, 1],
        translateY: [16, 0],
        delay: 520,
        duration: 650,
        ease: 'outCubic',
      })
    }
  }, [])

  return (
    <h1 ref={rootRef} className="va-hero-title va-hero-title--animated">
      <span className="va-line">Real-time AI assistance</span>
      <span className="va-line">
        for <span className="va-gradient">live meetings</span>
      </span>
      <span className="va-line va-line--muted">on your desktop.</span>
    </h1>
  )
}
