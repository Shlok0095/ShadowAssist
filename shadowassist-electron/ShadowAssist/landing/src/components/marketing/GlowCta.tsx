import type { ReactNode } from 'react'
import { cn } from '@/components/ui/cn'

type GlowCtaProps = {
  href: string
  children: ReactNode
  className?: string
  size?: 'md' | 'lg'
  external?: boolean
  onClick?: () => void
}

export function GlowCta({ href, children, className, size = 'md', external = true, onClick }: GlowCtaProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={cn(
        'futura-cta group relative inline-flex items-center justify-center overflow-hidden rounded-2xl font-display font-semibold tracking-wide text-white no-underline transition-transform duration-300 hover:scale-[1.03] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400/60',
        size === 'lg' ? 'px-10 py-4 text-lg' : 'px-8 py-3.5 text-base',
        className,
      )}
    >
      <span className="futura-cta__glow absolute inset-0 rounded-2xl opacity-80" aria-hidden />
      <span className="futura-cta__ring absolute inset-0 rounded-2xl" aria-hidden />
      <span className="relative z-[1] flex items-center gap-2">{children}</span>
    </a>
  )
}
