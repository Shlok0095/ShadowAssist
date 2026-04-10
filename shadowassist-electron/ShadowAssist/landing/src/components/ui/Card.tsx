import type { HTMLAttributes } from 'react'
import { cn } from '@/components/ui/cn'

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean
}

export function Card({ className, interactive = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 shadow-glass-sm backdrop-blur-md',
        'transition-[transform,box-shadow,border-color] duration-220 ease-out will-change-transform',
        interactive &&
          cn(
            'hover:-translate-y-1.5 hover:scale-[1.02]',
            'hover:border-cyan-400/25 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.55),0_0_0_1px_rgba(6,182,212,0.12),0_0_40px_-8px_rgba(139,92,246,0.2)]',
            'md:hover:-translate-y-1.5 md:hover:scale-[1.02]'
          ),
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
