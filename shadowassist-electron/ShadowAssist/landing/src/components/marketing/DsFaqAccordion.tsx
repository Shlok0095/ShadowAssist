import { useState } from 'react'

type Item = { q: string; a: string }

export function DsFaqAccordion({ items }: { items: Item[] }) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="ds-faq">
      {items.map((item, i) => {
        const isOpen = open === i
        return (
          <div key={item.q} className="ds-faq__item reveal">
            <button
              type="button"
              className="ds-faq__btn"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <span>{item.q}</span>
              <span className={`ds-faq__chev${isOpen ? ' open' : ''}`} aria-hidden>
                ▼
              </span>
            </button>
            <div
              className="ds-faq__answer"
              style={{ maxHeight: isOpen ? '240px' : '0', opacity: isOpen ? 1 : 0 }}
            >
              <div className="ds-faq__answer-inner">{item.a}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
