import { useRef, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { animate } from 'animejs'

type Props = {
  href: string
  variant?: 'primary' | 'ghost'
  children: ReactNode
  className?: string
}

export function VaButton({ href, variant = 'primary', children, className = '' }: Props) {
  const reduceMotion = useReducedMotion()
  const sparkRef = useRef<HTMLSpanElement>(null)

  const burst = () => {
    if (reduceMotion || !sparkRef.current) return
    const sparks = sparkRef.current.querySelectorAll('.va-btn-spark')
    animate(sparks, {
      translateX: () => animeRand(-40, 40),
      translateY: () => animeRand(-30, 30),
      opacity: [0.9, 0],
      scale: [0.5, 1.2],
      duration: 600,
      ease: 'outExpo',
    })
  }

  return (
    <motion.a
      href={href}
      className={`va-btn va-btn--${variant} ${className}`.trim()}
      onMouseEnter={burst}
      whileHover={reduceMotion ? undefined : { scale: 1.03, y: -2 }}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
    >
      <span ref={sparkRef} className="va-btn__sparks" aria-hidden>
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="va-btn-spark" />
        ))}
      </span>
      <span className="va-btn__label">{children}</span>
    </motion.a>
  )
}

function animeRand(min: number, max: number) {
  return min + Math.random() * (max - min)
}
