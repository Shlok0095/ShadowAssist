import { NavLink, Outlet } from 'react-router-dom'

const linkCls = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'docs-side__a docs-side__a--active' : 'docs-side__a'

const items = [
  { to: '/docs', end: true, label: 'Overview' },
  { to: '/docs/getting-started', label: 'Getting started' },
  { to: '/docs/how-it-works', label: 'How it works' },
  { to: '/docs/shipping', label: 'Shipping & releases' },
] as const

export function DocsLayout() {
  return (
    <div className="docs-shell">
      <aside className="docs-side glass-panel" aria-label="Documentation">
        <p className="docs-side__title">Documentation</p>
        <nav className="docs-side__nav">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkCls}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="docs-side__meta">
          <NavLink to="/legal/terms" className="docs-side__link-muted">
            Terms
          </NavLink>
          <span className="docs-side__dot">·</span>
          <NavLink to="/legal/privacy" className="docs-side__link-muted">
            Privacy
          </NavLink>
        </div>
      </aside>
      <div className="docs-main">
        <Outlet />
      </div>
    </div>
  )
}
