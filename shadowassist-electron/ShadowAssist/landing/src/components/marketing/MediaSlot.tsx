import { cn } from '@/components/ui/cn'

type MediaKind = 'hero' | 'feature' | 'mini' | 'wide'

type MediaSlotProps = {
  /** Reserved label — shown in empty state so you know what to upload later */
  label: string
  kind?: MediaKind
  /** When set: hero/mini autoplay muted loop; feature/wide shows img or video */
  src?: string
  poster?: string
  className?: string
}

const kindClass: Record<MediaKind, string> = {
  hero: 'va-media--hero aspect-[16/10] max-h-[min(72vh,640px)]',
  feature: 'va-media--feature aspect-[4/3]',
  mini: 'va-media--mini aspect-video max-h-[220px]',
  wide: 'va-media--wide aspect-[21/9]',
}

/**
 * Empty slot for future media. Hero/mini videos autoplay (muted, loop) once `src` is provided.
 */
export function MediaSlot({ label, kind = 'feature', src, poster, className }: MediaSlotProps) {
  const hasMedia = Boolean(src?.trim())

  if (hasMedia && src) {
    const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(src) || src.startsWith('/videos/')
    if (isVideo && (kind === 'hero' || kind === 'mini')) {
      return (
        <div className={cn('va-media va-media--filled overflow-hidden rounded-2xl', kindClass[kind], className)}>
          <video
            className="h-full w-full object-cover object-top"
            src={src}
            poster={poster}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-label={label}
          />
        </div>
      )
    }
    return (
      <div className={cn('va-media va-media--filled overflow-hidden rounded-2xl', kindClass[kind], className)}>
        <img src={src} alt={label} className="h-full w-full object-cover object-top" loading="lazy" />
      </div>
    )
  }

  return (
    <div
      className={cn('va-media va-media--empty', kindClass[kind], className)}
      aria-label={`Media placeholder: ${label}`}
      data-media-label={label}
    >
      <div className="va-media__inner">
        <span className="va-media__tag">{kind === 'hero' ? 'Hero video' : kind === 'mini' ? 'Clip' : 'Image / 3D'}</span>
        <p className="va-media__label">{label}</p>
      </div>
    </div>
  )
}
