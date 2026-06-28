import { cn } from '@/components/ui/cn'

type VideoPlaceholderProps = {
  label: string
  caption?: string
  aspect?: 'video' | 'square' | 'wide'
  className?: string
}

const aspectClass = {
  video: 'aspect-video',
  square: 'aspect-square max-w-md mx-auto',
  wide: 'aspect-[21/9]',
} as const

/** Reserved slot for a future feature demo video — intentionally empty. */
export function VideoPlaceholder({ label, caption, aspect = 'video', className }: VideoPlaceholderProps) {
  return (
    <figure className={cn('w-full', className)}>
      <div
        className={cn(
          'va-video-slot relative w-full overflow-hidden rounded-2xl border border-white/[0.08]',
          aspectClass[aspect],
        )}
        aria-label={`Video placeholder: ${label}`}
      >
        <div className="absolute inset-0 bg-[#121216]" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              'linear-gradient(145deg, rgba(59,130,246,0.12) 0%, transparent 45%, rgba(34,211,238,0.08) 100%)',
          }}
          aria-hidden
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
            <svg className="h-6 w-6 text-blue-400/70" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">Demo video coming soon</p>
          <p className="max-w-xs text-sm font-medium text-zinc-400">{label}</p>
        </div>
      </div>
      {caption ? (
        <figcaption className="mt-3 text-center text-sm leading-relaxed text-zinc-500">{caption}</figcaption>
      ) : null}
    </figure>
  )
}
