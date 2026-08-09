import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'

/** Hero headline with anime.js word stagger + gradient shimmer loops. */
export function VaAnimeHero() {
  const rootRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const words = root.querySelectorAll('.va-word')
    const gradients = root.querySelectorAll('.va-gradient')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion) {
      root.querySelectorAll('.va-word, .va-gradient').forEach((el) => {
        ;(el as HTMLElement).style.opacity = '1'
        ;(el as HTMLElement).style.transform = 'none'
      })
      return
    }

    animate(words, {
      opacity: [0, 1],
      translateY: [48, 0],
      rotateX: [-28, 0],
      delay: stagger(70, { start: 120 }),
      duration: 900,
      ease: 'outExpo',
    })

    animate(gradients, {
      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      delay: stagger(200, { start: 520 }),
      duration: 5200,
      ease: 'inOutSine',
      loop: true,
    })

    const sub = root.parentElement?.querySelector('.va-hero-sub')
    if (sub) {
      animate(sub, {
        opacity: [0, 1],
        translateY: [20, 0],
        delay: 680,
        duration: 700,
        ease: 'outCubic',
      })
    }
  }, [])

  return (
    <h1 ref={rootRef} className="va-hero-title va-hero-title--animated">
      <span className="va-word">Your</span>{' '}
      <span className="va-word">AI</span>{' '}
      <span className="va-word">copilot,</span>
      <br />
      <span className="va-word va-gradient">invisible</span>{' '}
      <span className="va-word">on</span>{' '}
      <span className="va-word">screen,</span>
      <br />
      <span className="va-word va-gradient va-gradient--cyan">instant</span>{' '}
      <span className="va-word">in</span>{' '}
      <span className="va-word">the</span>{' '}
      <span className="va-word">call.</span>
    </h1>
  )
}
