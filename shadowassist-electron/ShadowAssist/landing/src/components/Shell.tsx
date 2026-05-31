import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import { FuturisticBackground } from '@/components/marketing/FuturisticBackground'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { cn } from '@/components/ui/cn'

const MARKETING_PATHS = new Set(['/', '/how-it-works', '/built-for-live-work'])

export function Shell() {
  const { pathname } = useLocation()
  const isMarketingSurface = MARKETING_PATHS.has(pathname)
  const isHome = pathname === '/' || pathname === ''

  useEffect(() => {
    document.body.classList.toggle('marketing-dark', isMarketingSurface)
    return () => document.body.classList.remove('marketing-dark')
  }, [isMarketingSurface])

  useEffect(() => {
    const lenis = new Lenis({ duration: 1.05, smoothWheel: true })
    let raf = 0
    const tick = (t: number) => {
      lenis.raf(t)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  }, [])

  return (
    <>
      <div className="bg-grid" aria-hidden />
      <div className="glow glow-a" aria-hidden />
      <div className="glow glow-b" aria-hidden />
      {isMarketingSurface ? (
        <>
          <FuturisticBackground />
          <div className="marketing-grain" aria-hidden />
          <div className="marketing-blob marketing-blob--blue" aria-hidden />
          <div className="marketing-blob marketing-blob--violet" aria-hidden />
          <div className="marketing-blob marketing-blob--cyan" aria-hidden />
        </>
      ) : null}
      <Header />
      <main className={cn('main-shell min-w-0', isMarketingSurface && 'saas-root overflow-x-hidden')}>
        <Outlet />
      </main>
      {!isHome ? <Footer /> : null}
    </>
  )
}
