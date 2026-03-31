import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MarkdownBody } from '@/components/MarkdownBody'
import howItWorks from '../../../HOW_IT_WORKS.md?raw'

export function HowItWorks() {
  return (
    <div className="page-doc">
      <motion.div
        className="doc-hero glass-panel"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <p className="doc-crumb">
          <Link to="/docs">Docs</Link> <span className="doc-crumb__sep">/</span> How it works
        </p>
        <h1 className="doc-title">How ShadowAssist works</h1>
        <p className="doc-lede">
          Full product guide — same content as the repo, rendered here so you never leave the site.
        </p>
      </motion.div>
      <motion.div
        className="glass-panel doc-sheet"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
      >
        <MarkdownBody markdown={howItWorks} />
      </motion.div>
    </div>
  )
}
