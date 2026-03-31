import { useEffect, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaqAccordion } from '@/components/FaqAccordion'
import { SITE } from '@/config/site'
import { fetchLatestPortableUrl, fetchLatestSetupUrl } from '@/lib/releases'

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
}

const bento = [
  {
    span: 2 as const,
    c: '#5eead4',
    h: 'Answers beside your work',
    p: 'A translucent panel on your desktop — not another face in the meeting roster.',
  },
  {
    span: 1 as const,
    c: '#a78bfa',
    h: 'Hotkeys',
    p: 'Show, hide, ask, and clear without hunting for buttons.',
  },
  {
    span: 1 as const,
    c: '#fcd34d',
    h: 'Session audio',
    p: 'Optional mic & system capture when you turn it on.',
  },
  {
    span: 2 as const,
    c: '#67e8f9',
    h: 'Your vendor, your keys',
    p: 'Groq, OpenAI-compatible APIs, or NVIDIA NIM. Nothing embedded in the installer.',
  },
  {
    span: 3 as const,
    c: '#94a3b8',
    h: 'Portable or full setup',
    p: 'One-file portable .exe, or an NSIS wizard with terms, folder choice, and optional desktop shortcut.',
  },
]

export function Home() {
  useEffect(() => {
    const installer = document.getElementById('cta-installer')
    const portable = document.getElementById('cta-portable')
    const ctaBand = document.getElementById('cta-band-installer')
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
    ctaBand?.addEventListener('click', onInstaller)
    return () => {
      installer?.removeEventListener('click', onInstaller)
      portable?.removeEventListener('click', onPortable)
      ctaBand?.removeEventListener('click', onInstaller)
    }
  }, [])

  return (
    <>
      <section className="hero hero--split">
        <div className="hero-copy">
          <motion.p className="hero-kicker" {...fadeUp}>
            <span className="hero-kicker__mark" aria-hidden>
              ◆
            </span>
            Native Windows · Open releases on GitHub · Bring your own API keys
          </motion.p>
          <motion.h1 className="hero-title" {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }}>
            <span className="hero-title__line">Meeting help that stays</span>
            <span className="hero-title__gradient">on your screen</span>
            <span className="hero-title__line hero-title__line--sub">— not in the participant list.</span>
          </motion.h1>
          <motion.p className="lede lede--hero" {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
            ShadowAssist is a local overlay for notes, quick answers, and optional session context. You plug in{' '}
            <strong>your</strong> provider keys; traffic goes straight there — we don’t sit in the middle.
          </motion.p>
          <motion.div className="cta" {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.14 }}>
            <a className="btn primary btn--lg" href={SITE.releasesLatestUrl} id="cta-installer">
              Get the installer
            </a>
            <a className="btn secondary btn--lg" href={SITE.releasesLatestUrl} id="cta-portable">
              Portable .exe
            </a>
            <Link className="btn ghost btn--lg" to="/docs/getting-started">
              Read the guide
            </Link>
          </motion.div>
          <motion.p className="fine fine--hero" {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.18 }}>
            <a href={SITE.repoUrl} target="_blank" rel="noreferrer">
              Source &amp; releases
            </a>
            {' · '}
            <Link to="/docs/how-it-works">Technical overview</Link>
            {' · '}
            SHA256 files on every release
          </motion.p>
        </div>

        <motion.div
          className="hero-visual hero-visual--lift"
          aria-hidden
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mock-card mock-card--rich glass-panel">
            <div className="mock-bar">
              <span className="mock-dot" />
              <span className="mock-dot" />
              <span className="mock-dot" />
              <span className="mock-title">ShadowAssist</span>
            </div>
            <div className="mock-body mock-body--chat">
              <div className="mock-bubble mock-bubble--user">
                <span className="mock-bubble__label">You</span>
                What&apos;s the action item the PM just mentioned?
              </div>
              <div className="mock-bubble mock-bubble--ai">
                <span className="mock-bubble__label">Assistant</span>
                They asked design for revised mockups by Thursday and to loop in legal before the client sync.
              </div>
              <div className="mock-toolbar">
                <span className="mock-chip">Ctrl+Enter · Ask</span>
                <span className="mock-chip mock-chip--muted">Streaming reply</span>
              </div>
            </div>
          </div>
          <p className="mock-caption">Glass overlay · stays on your display · your keys only</p>
        </motion.div>
      </section>

      <section className="metrics glass-panel">
        <div className="metrics__item">
          <span className="metrics__val">Win 10+</span>
          <span className="metrics__label">64-bit desktop app</span>
        </div>
        <div className="metrics__divider" aria-hidden />
        <div className="metrics__item">
          <span className="metrics__val">BYOK</span>
          <span className="metrics__label">No vendor keys in the download</span>
        </div>
        <div className="metrics__divider" aria-hidden />
        <div className="metrics__item">
          <span className="metrics__val">Local UI</span>
          <span className="metrics__label">Electron + React on your PC</span>
        </div>
      </section>

      <section className="strip glass-strip">
        <span>Open-source friendly distribution</span>
        <span className="strip-dot">·</span>
        <span>In-app consent &amp; disclosures</span>
        <span className="strip-dot">·</span>
        <Link to="/docs">All docs hosted here</Link>
      </section>

      <motion.section id="features" className="section section--tight-top" {...fadeUp}>
        <p className="section-eyebrow">Product</p>
        <h2 className="section-title">Why teams try a screen-side assistant</h2>
        <p className="section-sub">
          Same job-to-be-done as a polished meeting tool — different shape: yours runs next to Zoom/Meet/Teams instead of
          joining as a bot.
        </p>
        <div className="bento-grid">
          {bento.map((f) => (
            <article
              key={f.h}
              className={`bento-card glass-panel bento-span-${f.span}`}
            >
              <div className="bento-card__accent" style={{ '--bc': f.c } as CSSProperties} />
              <h3>{f.h}</h3>
              <p>{f.p}</p>
            </article>
          ))}
        </div>
      </motion.section>

      <motion.section id="compare" className="section" {...fadeUp}>
        <p className="section-eyebrow">Contrast</p>
        <h2 className="section-title">Not another calendar guest</h2>
        <p className="section-sub">
          Many assistants join the call as a visible participant. ShadowAssist is intentionally different — use it
          only where policy allows.
        </p>
        <div className="compare">
          <div className="compare__col glass-panel">
            <h3 className="compare__h">Typical cloud notetakers</h3>
            <ul className="compare__list">
              <li>Join as &quot;AI&quot; or bot user in the roster</li>
              <li>Often obvious on screen shares and recordings</li>
              <li>Hosted flow; you trust their stack end-to-end</li>
            </ul>
          </div>
          <div className="compare__col compare__col--hi glass-panel">
            <h3 className="compare__h">ShadowAssist</h3>
            <ul className="compare__list">
              <li>Lives on your desktop as a floating panel</li>
              <li>Designed for a low visual footprint; optional stealth mode</li>
              <li>You choose the AI vendor and paste your own key</li>
            </ul>
          </div>
        </div>
      </motion.section>

      <section id="byok" className="section section-tint">
        <div className="two-col">
          <motion.div {...fadeUp}>
            <p className="section-eyebrow">Trust</p>
            <h2 className="section-title">Bring your own API keys</h2>
            <p className="section-sub left">
              We <strong>never</strong> ship Groq, OpenAI, or NVIDIA credentials inside the app. First launch: legal
              consent, then onboarding with a live connection test.
            </p>
            <ul className="checklist">
              <li>Secrets stay under your Windows user profile.</li>
              <li>Reset from Settings or uninstall when you need a clean slate.</li>
              <li>
                <Link to="/legal/terms">Terms</Link> · <Link to="/legal/privacy">Privacy</Link>
              </li>
            </ul>
          </motion.div>
          <motion.div className="panel-highlight glass-panel" {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }}>
            <h3>First-run checklist</h3>
            <ol className="steps-bold">
              <li>Complete every consent checkbox.</li>
              <li>Pick a provider and paste your key.</li>
              <li>Run Test until it passes.</li>
              <li>Confirm BYOK notices, then open the overlay.</li>
            </ol>
          </motion.div>
        </div>
      </section>

      <motion.section className="section" {...fadeUp}>
        <p className="section-eyebrow">Start here</p>
        <h2 className="section-title">Three steps</h2>
        <div className="steps-row">
          {[
            { n: '1', h: 'Grab a build', p: 'Installer for a full wizard, or portable for instant run.' },
            { n: '2', h: 'Connect', p: 'Consent, key, and test — all inside the app.' },
            { n: '3', h: 'Use it live', p: 'Hotkeys during calls; tune models and privacy in Settings.' },
          ].map((s) => (
            <div key={s.n} className="step-card glass-panel">
              <span className="step-num">{s.n}</span>
              <h3>{s.h}</h3>
              <p>{s.p}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section className="section section--narrow-metrics" {...fadeUp}>
        <h2 className="section-title">Requirements</h2>
        <ul className="list-inline">
          <li>Windows 10 or newer (64-bit)</li>
          <li>Account + API key with a supported provider</li>
          <li>Microphone access if you enable listening</li>
        </ul>
      </motion.section>

      <section id="faq" className="section section-narrow">
        <motion.div {...fadeUp}>
          <p className="section-eyebrow">FAQ</p>
          <h2 className="section-title">Common questions</h2>
        </motion.div>
        <FaqAccordion
          items={[
            {
              q: 'Are API keys inside the download?',
              a: 'No. You supply credentials after install; nothing is pre-filled.',
            },
            {
              q: 'Will other people “not see” my assistant?',
              a: 'We aim for a discreet overlay, but we can’t promise others won’t infer use. Follow your org and platform rules.',
            },
            {
              q: 'Where do prompts run?',
              a: (
                <>
                  To whichever provider you configure. See <Link to="/legal/privacy">privacy</Link> for how that fits
                  together.
                </>
              ),
            },
            {
              q: 'Why does Windows SmartScreen complain?',
              a: 'New or unsigned executables are often flagged. Compare against SHA256SUMS.txt on the release when you can.',
            },
            {
              q: 'Installer vs portable?',
              a: 'Portable is one file. The installer adds shortcuts, uninstall entry, and runs through your license text.',
            },
            {
              q: 'Desktop shortcut optional?',
              a: 'Yes — the NSIS finish page has a checkbox; leave it off if you prefer a clean desktop.',
            },
          ]}
        />
      </section>

      <section className="cta-band" aria-labelledby="cta-band-heading">
        <div className="cta-band__mesh" aria-hidden />
        <div className="cta-band__inner">
          <h2 id="cta-band-heading" className="cta-band__title">
            Built for people who live in meetings
          </h2>
          <p className="cta-band__sub">Download the latest Windows build, verify the hash, and you’re running in minutes.</p>
          <div className="cta-band__actions">
            <a className="btn primary btn--xl" href={SITE.releasesLatestUrl} id="cta-band-installer">
              Download for Windows
            </a>
            <Link className="btn ghost btn--xl cta-band__ghost" to="/docs/getting-started">
              Setup walkthrough
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
