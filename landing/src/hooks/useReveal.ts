import { useEffect } from 'react'

let observer: IntersectionObserver | null = null

function getObserver() {
  if (typeof window === 'undefined') return null
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer?.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15 },
    )
  }
  return observer
}

export function useRevealObserver() {
  useEffect(() => {
    const obs = getObserver()
    if (!obs) return

    const scan = () => {
      document.querySelectorAll('.reveal:not(.visible)').forEach((n) => obs.observe(n))
    }

    scan()
    const t = window.setTimeout(scan, 150)
    return () => window.clearTimeout(t)
  }, [])
}

export function revealClass(visible = true) {
  return visible ? 'reveal visible' : 'reveal'
}
