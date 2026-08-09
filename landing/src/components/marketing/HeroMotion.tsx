import { useEffect, useRef, type ReactNode } from 'react'
import { animate } from 'animejs'
import { motion, useReducedMotion } from 'motion/react'

/** Manus/Bklit-inspired ambient hero motion — mesh drift + staggered headline. */
export function HeroMotion({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion()
  const meshRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reduceMotion || !meshRef.current) return
    animate(meshRef.current, {
      rotate: [0, 6, -4, 0],
      scale: [1, 1.06, 1.02, 1],
      duration: 18000,
      ease: 'inOutSine',
      loop: true,
    })
  }, [reduceMotion])

  return (
    <div className="lm-hero-motion">
      <div ref={meshRef} className="lm-hero-mesh" aria-hidden />
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  )
}
