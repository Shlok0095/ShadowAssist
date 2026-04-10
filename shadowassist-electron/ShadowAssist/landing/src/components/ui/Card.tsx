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
        'transition-[transform,box-shadow,border-color] duration-200 ease-out will-change-transform',
        interactive &&
          'hover:scale-[1.02] hover:border-white/[0.12] hover:shadow-glass md:hover:scale-[1.03]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
