import type { ReactNode } from 'react'
import { cn } from '@/components/ui/cn'

type GradientTextProps = {
  as?: 'span' | 'h1' | 'h2' | 'h3'
  className?: string
  children: ReactNode
}

export function GradientText({ as: Tag = 'span', className, children }: GradientTextProps) {
  return (
    <Tag
      className={cn(
        'bg-gradient-text bg-clip-text text-transparent [background-size:120%_auto]',
        className
      )}
    >
      {children}
    </Tag>
  )
}
