import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { useState } from 'react'
import { cn } from '@/components/ui/cn'

const base =
  'inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-full px-7 text-[0.9375rem] font-semibold tracking-tight no-underline transition-[transform,box-shadow,opacity,background-color,border-color] duration-220 ease-out will-change-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/35 focus-visible:ring-offset-2 focus-visible:ring-offset-night-950 motion-reduce:animate-none'

const styles = {
  primary: cn(
    base,
    'relative overflow-hidden',
    'bg-gradient-to-br from-blue-500 via-violet-500 to-cyan-500 text-white',
    'shadow-btn-primary',
    'before:pointer-events-none before:absolute before:inset-0 before:-translate-x-full before:skew-x-[-18deg] before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:transition-transform before:duration-700 before:ease-out',
    'hover:scale-[1.04] hover:shadow-btn-primary-hover hover:before:translate-x-full',
    'active:scale-[0.99]'
  ),
  secondary: cn(
    base,
    'relative overflow-hidden border border-white/15 bg-white/[0.06] text-zinc-100 backdrop-blur-sm',
    'shadow-[0_0_0_1px_rgba(255,255,255,0.06)]',
    'before:pointer-events-none before:absolute before:inset-0 before:-translate-x-full before:skew-x-[-18deg] before:bg-gradient-to-r before:from-transparent before:via-white/12 before:to-transparent before:transition-transform before:duration-700 before:ease-out',
    'hover:scale-[1.03] hover:border-cyan-400/25 hover:bg-white/[0.1] hover:shadow-[0_0_28px_rgba(6,182,212,0.18)] hover:before:translate-x-full',
    'active:scale-[0.99]'
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
  /** Subtle periodic scale pulse (primary only; transform-only). */
  subtlePulse?: boolean
  /** Brief “Starting download…” label after click; still native `<a href>` navigation. */
  downloadFeedback?: boolean
  /** Shown while `downloadFeedback` is active (must be text-friendly). */
  busyLabel?: ReactNode
}

const FEEDBACK_MS = 2400

/** Plain `<a href>` — no preventDefault, no JS redirects. */
export function Button({
  variant = 'primary',
  className,
  children,
  subtlePulse,
  downloadFeedback,
  busyLabel = 'Starting download…',
  onClick,
  ...props
}: ButtonProps) {
  const [busy, setBusy] = useState(false)

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (downloadFeedback && !e.defaultPrevented) {
      setBusy(true)
      window.setTimeout(() => setBusy(false), FEEDBACK_MS)
    }
  }

  return (
    <a
      className={cn(
        buttonClass(variant, className),
        subtlePulse && variant === 'primary' && 'motion-safe:animate-cta-pulse'
      )}
      onClick={handleClick}
      {...props}
    >
      {downloadFeedback && busy ? busyLabel : children}
    </a>
  )
}
