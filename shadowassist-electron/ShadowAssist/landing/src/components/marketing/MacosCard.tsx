type Props = {
  wide?: boolean
  tall?: boolean
  /** Optional screenshot — body stays empty when unset */
  src?: string
  className?: string
}

export function MacosCard({ wide, tall, src, className = '' }: Props) {
  const isVideo = src && /\.(mp4|webm)(\?|$)/i.test(src)

  return (
    <div
      className={`macos-card${wide ? ' macos-card--wide' : ''}${tall ? ' macos-card--tall' : ''} ${className}`.trim()}
      aria-label="Product UI preview"
    >
      <div className="macos-card__titlebar" aria-hidden>
        <span className="macos-card__dot macos-card__dot--red" />
        <span className="macos-card__dot macos-card__dot--yellow" />
        <span className="macos-card__dot macos-card__dot--green" />
      </div>
      <div className="macos-card__body">
        {src && isVideo ? (
          <video src={src} autoPlay muted loop playsInline preload="auto" aria-label="Product preview" />
        ) : src ? (
          <img src={src} alt="" loading="lazy" />
        ) : null}
      </div>
    </div>
  )
}

export function DockIcons() {
  const icons = ['📹', '💬', '⚙️', '🌐']
  return (
    <>
      {icons.map((icon) => (
        <span key={icon} className="dock-icon" aria-hidden>
          {icon}
        </span>
      ))}
    </>
  )
}
