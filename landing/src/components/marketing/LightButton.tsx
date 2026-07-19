import type { ReactNode } from 'react'

type Props = {
  href: string
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'lg'
  className?: string
  children: ReactNode
}

export function WindowsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 5.5L10.5 4.5V11H3V5.5zm0 13L10.5 19.5V13H3v5.5zM12 4.2L21 3v8.8H12V4.2zm0 15.6V12H21v9l-9-1.2z" />
    </svg>
  )
}

export function LightButton({ href, variant = 'primary', size = 'lg', className = '', children }: Props) {
  return (
    <a
      href={href}
      className={`lm-btn lm-btn--${variant}${size === 'lg' ? ' lm-btn--lg' : ''} ${className}`.trim()}
    >
      {children}
    </a>
  )
}
