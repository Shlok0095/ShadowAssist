import type { HTMLAttributes } from 'react'
import { cn } from '@/components/ui/cn'

export type BadgeProps = HTMLAttributes<HTMLSpanElement>

export function Badge({ className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-400 backdrop-blur-sm',
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
