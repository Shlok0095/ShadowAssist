import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const cards = [
  {
    to: '/docs/getting-started',
    title: 'Getting started',
    desc: 'Download, installer vs portable, first launch, tray, uninstall.',
  },
  {
    to: '/docs/how-it-works',
    title: 'How it works',
    desc: 'Overlay, listen, screen context, settings, and what leaves your machine.',
  },
  {
    to: '/docs/shipping',
    title: 'Shipping & releases',
    desc: 'Builds, tags, Actions, GitHub Pages — transparency for power users.',
  },
  {
    to: '/legal/terms',
    title: 'Terms of service',
    desc: 'Same legal text bundled with the app and installer.',
  },
  {
    to: '/legal/privacy',
    title: 'Privacy policy',
    desc: 'BYOK, providers, and data on your device.',
  },
]

export function DocsHome() {
  return (
    <div className="docs-hub">
      <motion.div
        className="doc-hero glass-panel docs-hub__hero"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="doc-title">Documentation</h1>
        <p className="doc-lede">
          Guides and legal copy live here — no jumping to GitHub to read. Downloads still come from{' '}
          <strong>Releases</strong> (binaries are too large for Pages).
        </p>
      </motion.div>
      <div className="docs-grid">
        {cards.map((c, i) => (
          <motion.div
            key={c.to}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
          >
            <Link to={c.to} className="docs-card glass-panel">
              <h2>{c.title}</h2>
              <p>{c.desc}</p>
              <span className="docs-card__go">Open →</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
