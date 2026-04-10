import { AnimatePresence, motion } from 'framer-motion'
import { useState, type ReactNode } from 'react'

type Item = { q: string; a: ReactNode }

export function FaqAccordion({ items }: { items: Item[] }) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="faq-acc">
      {items.map((item, i) => {
        const isOpen = open === i
        return (
          <div key={item.q} className="faq-acc__item glass-panel">
            <button
              type="button"
              className="faq-acc__btn"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <span>{item.q}</span>
              <motion.span
                className="faq-acc__chev"
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                ▼
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  className="faq-acc__panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                >
                  <div className="faq-acc__answer">{item.a}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
