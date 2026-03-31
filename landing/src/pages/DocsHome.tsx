import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const cards = [
  {
    to: '/docs/how-it-works',
    title: 'How it works',
    desc: 'Overlay, session listen, screen context, settings, tray — the complete loop.',
  },
  {
    to: '/legal/terms',
    title: 'Terms of service',
    desc: 'Summary terms bundled with the app and installer.',
  },
  {
    to: '/legal/privacy',
    title: 'Privacy policy',
    desc: 'What stays on your device and how third-party AI fits in.',
  },
]

export function DocsHome() {
  return (
    <div className="page-doc">
      <motion.div
        className="doc-hero glass-panel"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="doc-title">Documentation</h1>
        <p className="doc-lede">Everything here lives on this site — no GitHub blob redirects for reading.</p>
      </motion.div>
      <div className="docs-grid">
        {cards.map((c, i) => (
          <motion.div
            key={c.to}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * i }}
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
