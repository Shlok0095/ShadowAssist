import type { HTMLAttributes } from 'react'
import { cn } from '@/components/ui/cn'

export type SectionProps = HTMLAttributes<HTMLElement> & {
  id?: string
  /** Tighter vertical rhythm for secondary bands */
  compact?: boolean
  /** No default vertical padding — set `className` with explicit `py-*` */
  flush?: boolean
}

export function Section({ id, className, compact, flush, children, ...props }: SectionProps) {
  const yPad = flush ? '' : compact ? 'py-16 sm:py-20' : 'py-24 sm:py-32'
  return (
    <section id={id} className={cn('relative mx-auto max-w-6xl px-5 sm:px-8', yPad, className)} {...props}>
      {children}
    </section>
  )
}
