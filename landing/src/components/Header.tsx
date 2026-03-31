import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { SITE } from '@/config/site'
import { fetchLatestSetupUrl } from '@/lib/releases'

const navCls = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'nav-link nav-link--active' : 'nav-link'

function hashHref(id: string) {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/')
  return `${base}#${id}`
}

export function Header() {
  useEffect(() => {
    const el = document.getElementById('nav-download-smart')
    if (!el) return
    const onClick = async (e: Event) => {
      e.preventDefault()
      window.location.href = await fetchLatestSetupUrl()
    }
    el.setAttribute('href', SITE.releasesLatestUrl)
    el.addEventListener('click', onClick)
    return () => el.removeEventListener('click', onClick)
  }, [])

  return (
    <header className="top glass-bar">
      <NavLink to="/" className="brand" end>
        {SITE.name}
      </NavLink>
      <nav className="nav">
        <a className="nav-link" href={hashHref('features')}>
          Product
        </a>
        <a className="nav-link" href={hashHref('byok')}>
          BYOK
        </a>
        <NavLink to="/docs" className={navCls}>
          Docs
        </NavLink>
        <a className="nav-link" href={hashHref('faq')}>
          FAQ
        </a>
        <a className="nav-link nav-cta" href={SITE.releasesLatestUrl} id="nav-download-smart">
          Download
        </a>
        <a className="nav-link" href={SITE.repoUrl} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </nav>
    </header>
  )
}
