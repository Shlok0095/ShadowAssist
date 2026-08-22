import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { getPlatformById, sortPlatformsForUser } from '@/config/platforms'
import { marketingAnchor, scrollToMarketingSection } from '@/utils/marketingNav'
import { useDetectedPlatform } from '@/hooks/useDetectedPlatform'

type Props = { className?: string; variant?: 'light' | 'dark' }

export function PlatformDownloadMenu({ className = '', variant = 'dark' }: Props) {
  const { preferred, isDetected } = useDetectedPlatform()
  const reduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const active = getPlatformById(preferred)
  const ActiveIcon = active.icon

  useEffect(() => {
    if (!open) return
    const onDoc = (e: globalThis.MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const goToAllDownloads = (e: ReactMouseEvent) => {
    e.preventDefault()
    setOpen(false)
    if (!scrollToMarketingSection('download')) {
      window.location.href = marketingAnchor('download')
    }
  }

  return (
    <div ref={rootRef} className={`lm-download-menu lm-download-menu--${variant} ${className}`.trim()}>
      <motion.button
        type="button"
        className="lm-download-btn lm-download-btn--menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        whileHover={reduceMotion ? undefined : { scale: 1.02 }}
        whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      >
        <ActiveIcon />
        <span className="lm-download-btn__label">Download for {active.name}</span>
        <span className="lm-download-btn__chev" aria-hidden>
          ▾
        </span>
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            className="lm-download-menu__panel"
            initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="lm-download-menu__hint">
              {isDetected ? `Detected ${active.name}. All platforms:` : 'Choose your platform:'}
            </p>
            {sortPlatformsForUser(preferred).map((p) => {
              const Icon = p.icon
              const isActive = p.id === preferred
              return (
                <div key={p.id} className={`lm-download-menu__row${isActive ? ' is-active' : ''}`}>
                  <div className="lm-download-menu__row-head">
                    <Icon />
                    <span>{p.name}</span>
                    {isActive ? <span className="lm-download-menu__badge">Your device</span> : null}
                  </div>
                  <div className="lm-download-menu__links">
                    <a
                      href={p.download.href}
                      role="menuitem"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setOpen(false)}
                    >
                      Download
                    </a>
                  </div>
                </div>
              )
            })}
            <a href={marketingAnchor('download')} className="lm-download-menu__all" onClick={goToAllDownloads}>
              Compare all platforms ↓
            </a>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export function PlatformDownloadDrawerLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { preferred } = useDetectedPlatform()
  return (
    <div className="lm-drawer-downloads">
      {sortPlatformsForUser(preferred).map((p) => {
        const Icon = p.icon
        return (
          <div key={p.id} className="lm-drawer-downloads__block">
            <div className="lm-drawer-downloads__label">
              <Icon />
              <span>{p.name}</span>
            </div>
            <a
              href={p.download.href}
              className="lm-drawer__link"
              target="_blank"
              rel="noopener noreferrer"
              onClick={onNavigate}
            >
              Download for {p.name}
            </a>
          </div>
        )
      })}
      <a
        href={marketingAnchor('download')}
        className="lm-drawer__link lm-drawer__link--accent"
        onClick={(e) => {
          e.preventDefault()
          onNavigate?.()
          scrollToMarketingSection('download')
        }}
      >
        View full download hub ↓
      </a>
    </div>
  )
}
