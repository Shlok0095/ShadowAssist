import type { ReactNode } from 'react'
import ParticleButton from '@/components/kokonutui/particle-button'
import { cn } from '@/lib/utils'

type Props = {
  href: string
  children: ReactNode
  className?: string
}

/** Kokonut particle-button styled as the primary marketing CTA. */
export function VaParticleCta({ href, children, className }: Props) {
  return (
    <ParticleButton
      type="button"
      size="lg"
      className={cn('va-btn va-btn--primary va-particle-cta', className)}
      onClick={() => {
        window.location.href = href
      }}
    >
      {children}
    </ParticleButton>
  )
}
