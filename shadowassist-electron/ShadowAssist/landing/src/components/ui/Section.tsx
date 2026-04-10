import type { HTMLAttributes } from 'react'
import { cn } from '@/components/ui/cn'

export type SectionProps = HTMLAttributes<HTMLElement> & {
  id?: string
  /** Tighter vertical rhythm for secondary bands */
  compact?: boolean
  /** No default vertical padding — set `className` with explicit `py-*` */
  flush?: boolean
}

const xPad = 'px-4 sm:px-6 md:px-8'

export function Section({ id, className, compact, flush, children, ...props }: SectionProps) {
  const yPad = flush ? '' : compact ? 'py-12 md:py-16' : 'py-16 md:py-24'
  return (
    <section id={id} className={cn('relative mx-auto max-w-6xl', xPad, yPad, className)} {...props}>
      {children}
    </section>
  )
}
