import { useEffect, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaqAccordion } from '@/components/FaqAccordion'
import { SITE } from '@/config/site'
import { fetchLatestPortableUrl, fetchLatestSetupUrl } from '@/lib/releases'

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
}

export function Home() {
  useEffect(() => {
    const installer = document.getElementById('cta-installer')
    const portable = document.getElementById('cta-portable')
    const onInstaller = async (e: Event) => {
      e.preventDefault()
      window.location.href = await fetchLatestSetupUrl()
    }
    const onPortable = async (e: Event) => {
      e.preventDefault()
      window.location.href = await fetchLatestPortableUrl()
    }
    installer?.addEventListener('click', onInstaller)
    portable?.addEventListener('click', onPortable)
    return () => {
      installer?.removeEventListener('click', onInstaller)
      portable?.removeEventListener('click', onPortable)
    }
  }, [])

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <motion.div className="pill-row" {...fadeUp}>
            <span className="pill">Windows 10+</span>
            <span className="pill pill-accent">Bring your own keys</span>
            <span className="pill">Meetings &amp; syncs</span>
          </motion.div>
          <motion.h1 {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.04 }}>
            Undetectable AI
            <span className="headline-gradient"> for live meetings</span>
          </motion.h1>
          <motion.p className="lede" {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }}>
            A native overlay that stays on your screen — concise answers, session listening, and screen context.
            You connect <strong>your own</strong> Groq, OpenAI, or NVIDIA keys; we don’t proxy your prompts.
          </motion.p>
          <motion.div className="cta" {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.12 }}>
            <a className="btn primary" href={SITE.releasesLatestUrl} id="cta-installer">
              Download installer
            </a>
            <a className="btn secondary" href={SITE.releasesLatestUrl} id="cta-portable">
              Portable .exe
            </a>
            <Link className="btn ghost" to="/docs">
              Read docs
            </Link>
          </motion.div>
          <p className="fine">
            <strong>Installer</strong> — Windows setup, terms, folder, shortcuts. <strong>Portable</strong> — single{' '}
            <code>.exe</code>, no wizard. <a href={SITE.releasesLatestUrl}>Releases</a> · SHA256 on each release · First
            launch: consent + API setup. Full walkthrough in{' '}
            <Link to="/docs/how-it-works">How it works</Link>.
          </p>
        </div>
        <motion.div className="hero-visual" aria-hidden initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
          <div className="mock-card glass-panel">
            <div className="mock-bar">
              <span className="mock-dot" />
              <span className="mock-dot" />
              <span className="mock-dot" />
              <span className="mock-title">ShadowAssist</span>
            </div>
            <div className="mock-body">
              <p className="mock-line shimmer" />
              <p className="mock-line short" />
              <div className="mock-chip">Ctrl+Enter · Ask</div>
            </div>
          </div>
          <p className="mock-caption">Translucent overlay · hotkeys · your keys only</p>
        </motion.div>
      </section>

      <section className="strip glass-strip">
        <span>No vendor keys bundled</span>
        <span className="strip-dot">·</span>
        <span>In-app legal consent</span>
        <span className="strip-dot">·</span>
        <Link to="/docs">Docs on this site</Link>
      </section>

      <motion.section id="features" className="section" {...fadeUp}>
        <h2 className="section-title">Built for how you actually meet</h2>
        <p className="section-sub">Keyboard-first, low-friction, transparent about what leaves your machine.</p>
        <div className="feature-grid">
          {[
            { c: '#7c6cf0', t: '⌘', h: 'Hotkey-driven', p: 'Toggle visibility, ask the model, clear thread, move the overlay without leaving your flow.' },
            { c: '#22c55e', t: '◉', h: 'Session & screen', p: 'Optional mic and desktop context when you enable them — with clear in-app disclosures.' },
            { c: '#38bdf8', t: '◇', h: 'Multiple providers', p: 'Groq, OpenAI-compatible, NVIDIA NIM — pick what your org allows.' },
            { c: '#f472b6', t: '✦', h: 'Stealth option', p: 'Content protection to reduce capture in thumbnails and some recorders when you need discretion.' },
            { c: '#fbbf24', t: '⚡', h: 'Fast local UI', p: 'Electron + React on your PC. Inference goes straight to the vendor you configured.' },
            { c: '#94a3b8', t: '⬡', h: 'Portable or installer', p: 'Single portable .exe or NSIS setup — same app, your choice.' },
          ].map((f) => (
            <article key={f.h} className="feature-card glass-panel">
              <div className="feature-icon" style={{ '--c': f.c } as CSSProperties}>
                {f.t}
              </div>
              <h3>{f.h}</h3>
              <p>{f.p}</p>
            </article>
          ))}
        </div>
      </motion.section>

      <section id="byok" className="section section-tint">
        <div className="two-col">
          <motion.div {...fadeUp}>
            <h2 className="section-title">Bring your own API keys</h2>
            <p className="section-sub left">
              ShadowAssist <strong>never</strong> embeds Groq, OpenAI, or NVIDIA credentials. On first launch you accept
              legal acknowledgments, enter <em>your</em> key, and pass a connection test.
            </p>
            <ul className="checklist">
              <li>Keys stay in your Windows user profile (encrypted where the OS allows).</li>
              <li>Uninstall or “delete all data” in Settings removes stored secrets from this app.</li>
              <li>
                Legal text: <Link to="/legal/terms">Terms</Link> · <Link to="/legal/privacy">Privacy</Link>
              </li>
            </ul>
          </motion.div>
          <motion.div className="panel-highlight glass-panel" {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }}>
            <h3>First launch checklist</h3>
            <ol className="steps-bold">
              <li>Legal consent — all checkboxes required.</li>
              <li>Choose provider and paste your API key.</li>
              <li>Tap Test until it succeeds.</li>
              <li>Confirm BYOK acknowledgments, then start.</li>
            </ol>
          </motion.div>
        </div>
      </section>

      <motion.section className="section" {...fadeUp}>
        <h2 className="section-title">Get started in minutes</h2>
        <div className="steps-row">
          {[
            { n: '1', h: 'Install', p: 'ShadowAssist-Setup-….exe for the full wizard, or portable ShadowAssist.exe for no install.' },
            { n: '2', h: 'Connect', p: 'Complete consent, add your key, verify with the built-in test.' },
            { n: '3', h: 'Meet', p: 'Use hotkeys during calls; adjust overlay, models, and privacy in Settings.' },
          ].map((s) => (
            <div key={s.n} className="step-card glass-panel">
              <span className="step-num">{s.n}</span>
              <h3>{s.h}</h3>
              <p>{s.p}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section className="section" {...fadeUp}>
        <h2 className="section-title">Requirements</h2>
        <ul className="list-inline">
          <li>Windows 10+ (64-bit)</li>
          <li>Account + API key with a supported provider</li>
          <li>Microphone permission if you use session features</li>
        </ul>
      </motion.section>

      <section id="faq" className="section section-narrow">
        <motion.h2 className="section-title" {...fadeUp}>
          FAQ
        </motion.h2>
        <FaqAccordion
          items={[
            {
              q: 'Are API keys included in the download?',
              a: 'No. The app ships without vendor keys. You must supply your own.',
            },
            {
              q: 'Is this “undetectable”?',
              a: 'The UI is designed to be discreet. We don’t guarantee others can’t infer assistant use; follow your org and platform rules.',
            },
            {
              q: 'Where is data processed?',
              a: (
                <>
                  Requests go to the AI provider you configure. Read our{' '}
                  <Link to="/legal/privacy">privacy summary</Link> and in-app terms.
                </>
              ),
            },
            {
              q: 'Why does SmartScreen warn?',
              a: 'New or unsigned Windows builds are often flagged. Verify SHA256SUMS.txt on the release when possible.',
            },
            {
              q: 'Portable vs installer?',
              a: 'Portable opens the app immediately. The Setup .exe runs a classic wizard (terms, folder, shortcuts).',
            },
            {
              q: 'Can I skip the desktop shortcut?',
              a: 'The installer finish page includes a “Create a desktop shortcut” checkbox — leave it unchecked if you prefer.',
            },
          ]}
        />
      </section>
    </>
  )
}
