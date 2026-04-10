import type { AnchorHTMLAttributes } from 'react'
import { cn } from '@/components/ui/cn'

const base =
  'inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-full px-7 text-[0.9375rem] font-semibold tracking-tight no-underline transition-[transform,box-shadow,opacity,background-color,border-color] duration-200 ease-out will-change-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-night-950'

const styles = {
  primary: cn(
    base,
    'bg-gradient-to-br from-blue-500 via-violet-500 to-teal-500 text-white shadow-lg shadow-violet-500/20',
    'hover:scale-[1.03] hover:shadow-xl hover:shadow-violet-500/25 active:scale-[0.99]'
  ),
  secondary: cn(
    base,
    'border border-white/15 bg-white/[0.06] text-zinc-100 backdrop-blur-md',
    'hover:scale-[1.02] hover:border-white/25 hover:bg-white/[0.1] active:scale-[0.99]'
  ),
  ghost: cn(
    base,
    'border border-transparent bg-transparent text-zinc-300',
    'hover:scale-[1.02] hover:bg-white/[0.06] hover:text-white active:scale-[0.99]'
  ),
} as const

export type ButtonVariant = keyof typeof styles

export function buttonClass(variant: ButtonVariant = 'primary', className?: string) {
  return cn(styles[variant], className)
}

export type ButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant
}

/** Primary / secondary download-style links (external anchors). */
export function Button({ variant = 'primary', className, children, ...props }: ButtonProps) {
  return (
    <a className={buttonClass(variant, className)} {...props}>
      {children}
    </a>
  )
}
