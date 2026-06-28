import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Lenis from 'lenis'
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
    document.body.classList.toggle('va-marketing', isMarketingSurface)
    document.body.classList.toggle('ds-marketing', isMarketingSurface)
    return () => {
      document.body.classList.remove('marketing-dark')
      document.body.classList.remove('va-marketing')
      document.body.classList.remove('ds-marketing')
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
