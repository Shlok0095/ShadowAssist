import { useRef, type MouseEvent, type ReactNode } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { MEDIA } from '@/config/mediaManifest'

type Props = {
  children: ReactNode
}

export function Hero3D({ children }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 120, damping: 18 })
  const sy = useSpring(my, { stiffness: 120, damping: 18 })
  const rotateY = useTransform(sx, [-0.5, 0.5], [-10, 10])
  const rotateX = useTransform(sy, [-0.5, 0.5], [7, -7])

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = stageRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
  }

  const onLeave = () => {
    mx.set(0)
    my.set(0)
  }

  return (
    <section className="va-hero">
      <div className="lm-container va-hero__grid">
        <motion.div
          className="va-hero__copy"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.div>

        <div
          ref={stageRef}
          className="va-hero__stage"
          onMouseMove={onMove}
          onMouseLeave={onLeave}
        >
          <motion.div
            className="va-hero__3d"
            style={{ rotateX, rotateY, transformPerspective: 1400 }}
          >
            <motion.div
              className="va-hero__float-card va-hero__float-card--back"
              animate={{ y: [0, -8, 0], rotateZ: [-2, 2, -2] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="va-hero__float-card va-hero__float-card--main"
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="va-hero__chrome">
                <span className="va-dot va-dot--r" />
                <span className="va-dot va-dot--y" />
                <span className="va-dot va-dot--g" />
                <span className="va-hero__chrome-title">VeilAssist overlay</span>
              </div>
              <div className="va-hero__screen">
                {MEDIA.heroOverlayScreenshot ? (
                  <img src={MEDIA.heroOverlayScreenshot} alt="" />
                ) : (
                  <div className="va-hero__placeholder">
                    <span className="va-hero__pulse" />
                    Live assist ready
                  </div>
                )}
              </div>
              <div className="va-hero__shine" aria-hidden />
            </motion.div>
            <motion.div
              className="va-hero__kbd-hint"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <kbd>Ctrl</kbd>
              <span>+</span>
              <kbd>↵</kbd>
              <span className="va-hero__kbd-label">Assist</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
