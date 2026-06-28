import { useEffect, useState, type ReactNode } from 'react'
import { useTilt } from '@/hooks/useTilt'

type Props = {
  children: ReactNode
  className?: string
}

export function TiltCard({ children, className = '' }: Props) {
  const { ref, onMove, onLeave } = useTilt()
  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </div>
  )
}

export function useNavScroll() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return scrolled
}

export function useHeroCursor(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(max-width: 1023px)').matches) return
    const onMove = (e: globalThis.MouseEvent) => {
      const r = el.getBoundingClientRect()
      el.style.setProperty('--cursor-x', `${e.clientX - r.left}px`)
      el.style.setProperty('--cursor-y', `${e.clientY - r.top}px`)
    }
    el.addEventListener('mousemove', onMove)
    return () => el.removeEventListener('mousemove', onMove)
  }, [ref])
}
