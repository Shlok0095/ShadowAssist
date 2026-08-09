import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { cn } from '@/components/ui/cn'
import { scrollToMarketingSection } from '@/utils/marketingNav'

const MARKETING_PATHS = new Set(['/', '/how-it-works', '/built-for-live-work'])

export function Shell() {
  const location = useLocation()
  const { pathname } = location
  const isMarketingSurface = MARKETING_PATHS.has(pathname)
  const isHome = pathname === '/' || pathname === ''

  useEffect(() => {
    document.body.classList.toggle('va-live', isMarketingSurface)
    document.body.classList.toggle('light-marketing', isMarketingSurface)
    document.documentElement.classList.toggle('dark', isMarketingSurface)
    return () => {
      document.body.classList.remove('va-live')
      document.body.classList.remove('light-marketing')
      document.documentElement.classList.remove('dark')
    }
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

  useEffect(() => {
    const hash = location.hash.replace(/^#/, '')
    if (!hash) return
    const t = window.setTimeout(() => scrollToMarketingSection(hash, 'auto'), 80)
    return () => window.clearTimeout(t)
  }, [location.pathname, location.hash])

  return (
    <>
      <Header />
      <main className={cn('main-shell min-w-0', isMarketingSurface && 'overflow-x-hidden')}>
        <Outlet />
      </main>
      {!isHome ? <Footer /> : null}
    </>
  )
}
