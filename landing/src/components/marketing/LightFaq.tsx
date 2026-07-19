import { useState } from 'react'

type Item = { q: string; a: string }

export function LightFaq({ items }: { items: Item[] }) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="lm-faq">
      {items.map((item, i) => {
        const isOpen = open === i
        return (
          <div key={item.q} className="lm-faq__item reveal">
            <button
              type="button"
              className="lm-faq__btn"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <span>{item.q}</span>
              <span className={`lm-faq__chev${isOpen ? ' open' : ''}`} aria-hidden>
                ▼
              </span>
            </button>
            <div
              className="lm-faq__answer"
              style={{ maxHeight: isOpen ? '400px' : '0', paddingTop: isOpen ? undefined : 0 }}
            >
              <div className="lm-faq__answer-inner">{item.a}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
