import { Outlet } from 'react-router-dom'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'

export function Shell() {
  return (
    <>
      <div className="bg-grid" aria-hidden />
      <div className="glow glow-a" aria-hidden />
      <div className="glow glow-b" aria-hidden />
      <Header />
      <main className="main-shell">
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
