import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'

/** Full-viewport live grid + particle field (anime.js). */
export function LiveField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let t = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const particles = Array.from({ length: 140 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      a: Math.random() * 0.5 + 0.15,
    }))

    const draw = () => {
      t += 0.008
      const w = window.innerWidth
      const h = window.innerHeight
      ctx.clearRect(0, 0, w, h)

      // Perspective grid floor
      const horizon = h * 0.38
      ctx.strokeStyle = 'rgba(124, 58, 237, 0.12)'
      ctx.lineWidth = 1
      for (let i = 0; i < 24; i++) {
        const y = horizon + (i * i * 1.8) % (h - horizon)
        const fade = 1 - (y - horizon) / (h - horizon)
        ctx.globalAlpha = fade * 0.55
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
      const vanishX = w / 2
      for (let i = -20; i <= 20; i++) {
        ctx.globalAlpha = 0.35
        ctx.beginPath()
        ctx.moveTo(vanishX, horizon)
        ctx.lineTo(vanishX + i * 80, h)
        ctx.stroke()
      }

      // Particles
      ctx.globalAlpha = 1
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = w
        if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h
        if (p.y > h) p.y = 0
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4)
        g.addColorStop(0, `rgba(167, 139, 250, ${p.a})`)
        g.addColorStop(1, 'rgba(34, 211, 238, 0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2)
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const orbsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!orbsRef.current) return
    const orbs = orbsRef.current.querySelectorAll('.va-orb')
    animate(orbs, {
      translateY: () => animeRand(-30, 30),
      translateX: () => animeRand(-20, 20),
      scale: () => [1, animeRand(1.05, 1.2), 1],
      delay: stagger(120),
      duration: () => animeRand(4000, 7000),
      ease: 'inOutSine',
      loop: true,
      alternate: true,
    })
  }, [])

  return (
    <div className="va-live-field" aria-hidden>
      <canvas ref={canvasRef} className="va-live-field__canvas" />
      <div ref={orbsRef} className="va-live-field__orbs">
        <span className="va-orb va-orb--violet" />
        <span className="va-orb va-orb--cyan" />
        <span className="va-orb va-orb--pink" />
      </div>
      <div className="va-live-field__vignette" />
    </div>
  )
}

function animeRand(min: number, max: number) {
  return min + Math.random() * (max - min)
}
