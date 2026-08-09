import { type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

type Props = {
  id?: string
  className?: string
  children: ReactNode
  eyebrow?: string
  title?: string
  subtitle?: string
}

export function VaSection({ id, className = '', children, eyebrow, title, subtitle }: Props) {
  const reduceMotion = useReducedMotion()
  return (
    <section id={id} className={`va-section scroll-mt-nav ${className}`.trim()}>
      <div className="lm-container">
        {(eyebrow || title || subtitle) && (
          <motion.header
            className="va-section__head"
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            {eyebrow ? <p className="va-eyebrow">{eyebrow}</p> : null}
            {title ? <h2 className="va-section__title">{title}</h2> : null}
            {subtitle ? <p className="va-section__sub">{subtitle}</p> : null}
          </motion.header>
        )}
        {children}
      </div>
    </section>
  )
}

export function VaReveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
