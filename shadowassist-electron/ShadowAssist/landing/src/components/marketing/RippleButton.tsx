import { useCallback, type MouseEvent, type ReactNode } from 'react'
import { cn } from '@/components/ui/cn'

type Props = {
  href?: string
  onClick?: () => void
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'lg'
  className?: string
  children: ReactNode
}

export function RippleButton({ href, onClick, variant = 'primary', size = 'lg', className, children }: Props) {
  const handleClick = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      const el = e.currentTarget
      const rect = el.getBoundingClientRect()
      const ripple = document.createElement('span')
      ripple.className = 'ds-btn__ripple'
      const sizePx = Math.max(rect.width, rect.height)
      ripple.style.width = ripple.style.height = `${sizePx}px`
      ripple.style.left = `${e.clientX - rect.left - sizePx / 2}px`
      ripple.style.top = `${e.clientY - rect.top - sizePx / 2}px`
      el.appendChild(ripple)
      ripple.addEventListener('animationend', () => ripple.remove())
      onClick?.()
    },
    [onClick],
  )

  const cls = cn(
    'ds-btn',
    variant === 'primary' ? 'ds-btn--primary' : 'ds-btn--secondary',
    size === 'sm' ? 'ds-btn--sm' : 'ds-btn--lg',
    className,
  )

  if (href) {
    return (
      <a href={href} className={cls} onClick={handleClick}>
        {children}
      </a>
    )
  }

  return (
    <button type="button" className={cls} onClick={handleClick}>
      {children}
    </button>
  )
}

export function WindowsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 5.5L10.5 4.5V11H3V5.5zm0 13L10.5 19.5V13H3v5.5zM12 4.2L21 3v8.8H12V4.2zm0 15.6V12H21v9l-9-1.2z" />
    </svg>
  )
}
