import { Link } from 'react-router-dom'
import { SITE } from '@/config/site'

export function Footer() {
  return (
    <footer className="foot glass-foot">
      <div className="foot-inner">
        <span className="foot-brand">{SITE.name}</span>
        <span className="sep">·</span>
        <Link to="/legal/terms">Terms</Link>
        <Link to="/legal/privacy">Privacy</Link>
        <span className="sep">·</span>
        <a href={SITE.repoUrl} target="_blank" rel="noreferrer">
          Source
        </a>
        <span className="foot-muted">Not affiliated with Groq, OpenAI, or NVIDIA.</span>
      </div>
    </footer>
  )
}
