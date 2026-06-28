import { MEDIA } from '@/config/mediaManifest'

type Props = {
  variant?: 'hero' | 'spotlight'
  src?: string
}

/** Blank media box — no text/icon when empty. Video autoplays when src is set. */
export function MediaPlaceholder({ variant = 'hero', src }: Props) {
  const videoSrc = src?.trim() || MEDIA.heroVideo?.trim()
  const isVideo = videoSrc && (/\.(mp4|webm|mov)(\?|$)/i.test(videoSrc) || videoSrc.startsWith('/videos/'))

  if (isVideo && videoSrc) {
    return (
      <div
        className={`media-placeholder media-placeholder--${variant}`}
        aria-label="Product video"
      >
        <video src={videoSrc} autoPlay muted loop playsInline preload="auto" />
      </div>
    )
  }

  if (src?.trim() && !isVideo) {
    return (
      <div className={`media-placeholder media-placeholder--${variant}`} aria-label="Product visual">
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
    )
  }

  return (
    <div
      className={`media-placeholder media-placeholder--${variant}`}
      aria-label="Video coming soon"
    />
  )
}
