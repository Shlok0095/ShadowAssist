import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaqAccordion } from '@/components/FaqAccordion'
import { SITE } from '@/config/site'
import { fetchLatestPortableUrl, fetchLatestSetupUrl } from '@/lib/releases'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
}

const fourWays = [
  {
    h: 'Answers while you stay in the flow',
    p: 'Streamed replies in a floating panel — use hotkeys so you never hunt for buttons mid-call.',
  },
  {
    h: 'Optional session & screen context',
    p: 'Turn on listening or desktop context when you want it; disclosures are clear in the app.',
  },
  {
    h: 'Bring your own API keys',
    p: 'Groq, OpenAI-compatible endpoints, or NVIDIA NIM. Nothing is pre-filled in the installer.',
  },
  {
    h: 'Portable or full Windows setup',
    p: 'Single portable .exe, or an NSIS wizard with terms, folder choice, and optional shortcuts.',
  },
]

const demoBlocks = [
  {
    prompt: 'Summarize the last agenda block in three bullets.',
    answer:
      '• Thursday design deadline\n• Legal review before client sync\n• Finance to confirm headcount by EOW',
  },
  {
    prompt: 'What commitment did they repeat at the end?',
    answer: 'They reiterated a phased pilot in two regions, then expansion after a 30-day checkpoint.',
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
      <section className="hero hero--cluely">
        <div className="hero-cluely-inner">
          <motion.h1 className="hero-cluely-title" {...fadeUp}>
            Live meeting help
            <span className="hero-cluely-title__accent"> on your desktop</span>
          </motion.h1>
          <motion.hr className="hero-cluely-rule" {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.04 }} />
          <motion.p className="hero-cluely-sub" {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.06 }}>
            ShadowAssist keeps concise answers and notes beside your work — without adding another participant to the
            call. You supply <strong>your own</strong> AI keys; requests go straight to the vendor you trust.
          </motion.p>
          <motion.div className="hero-cluely-cta" {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
            <a className="btn btn-cluely-primary" href={SITE.releasesLatestUrl} id="cta-installer">
              Download for Windows
            </a>
            <a className="btn btn-cluely-secondary" href={SITE.releasesLatestUrl} id="cta-portable">
              Get portable .exe
            </a>
          </motion.div>
          <motion.p className="hero-cluely-meta" {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.14 }}>
            <a href={SITE.repoUrl} target="_blank" rel="noreferrer">
              GitHub
            </a>
            {' · '}
            <Link to="/docs/getting-started">Setup guide</Link>
            {' · '}
            <Link to="/docs/how-it-works">How it works</Link>
          </motion.p>
        </div>
      </section>

      <section className="cluely-demo" aria-label="Product preview">
        <div className="cluely-demo__wrap">
          {demoBlocks.map((d) => (
            <div key={d.prompt} className="cluely-demo__block">
              <p className="cluely-demo__prompt">{d.prompt}</p>
              <blockquote className="cluely-demo__quote">{d.answer}</blockquote>
            </div>
          ))}
          <p className="cluely-demo__label">Contextual follow-ups</p>
          <p className="cluely-demo__hint">Dig into the thread or what&apos;s on screen — always with your own API keys.</p>
        </div>
      </section>

      <motion.section id="features" className="section section-cluely" {...fadeUp}>
        <h2 className="section-cluely-title">What you get with ShadowAssist</h2>
        <p className="section-cluely-lead">
          Fast context on video calls without juggling extra tabs — built for Windows power users.
        </p>
        <div className="four-grid">
          {fourWays.map((f) => (
            <article key={f.h} className="four-card">
              <h3>{f.h}</h3>
              <p>{f.p}</p>
            </article>
          ))}
        </div>
      </motion.section>

      <motion.section className="section section-cluely section-cluely--soft" {...fadeUp}>
        <h2 className="section-cluely-title">Up and running in three steps</h2>
        <p className="section-cluely-lead">The shortest path from download to your first live answer.</p>
        <div className="cluely-steps">
          {[
            {
              n: '1',
              t: 'Install ShadowAssist',
              d: 'Run the setup wizard or the portable .exe — your choice.',
            },
            {
              n: '2',
              t: 'Connect your provider',
              d: 'Consent, paste your API key, and pass the built-in connection test.',
            },
            {
              n: '3',
              t: 'Use it on the call',
              d: 'Hotkeys toggle the overlay; adjust models and privacy in Settings.',
            },
          ].map((s) => (
            <div key={s.n} className="cluely-step">
              <span className="cluely-step__num">{s.n}</span>
              <h3 className="cluely-step__title">{s.t}</h3>
              <p className="cluely-step__desc">{s.d}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section id="compare" className="section section-cluely" {...fadeUp}>
        <h2 className="section-cluely-title">On your screen — not on the guest list</h2>
        <p className="section-cluely-lead">
          A lot of assistants join as another attendee. ShadowAssist lives on your desktop; use it only where policy allows.
        </p>
        <div className="compare-visual">
          <div className="compare-visual__lane compare-visual__lane--muted">
            <span className="compare-visual__tag">Typical AI notetakers</span>
            <p className="compare-visual__text">Joins the roster as an app or &quot;AI&quot; guest</p>
          </div>
          <div className="compare-visual__lane compare-visual__lane--hi">
            <span className="compare-visual__tag compare-visual__tag--hi">ShadowAssist</span>
            <p className="compare-visual__text">Floating panel on your desktop — visible to you</p>
          </div>
        </div>
        <div className="compare compare--cluely">
          <div className="compare__col compare__col--plain">
            <h3 className="compare__h">Cloud notetaker flow</h3>
            <ul className="compare__list">
              <li>Often appears in the participant list</li>
              <li>Easy to spot on recordings and screen shares</li>
              <li>You route audio/transcript through their stack</li>
            </ul>
          </div>
          <div className="compare__col compare__col--emph">
            <h3 className="compare__h">ShadowAssist</h3>
            <ul className="compare__list">
              <li>Native Windows overlay + system tray</li>
              <li>Designed for a smaller on-screen footprint</li>
              <li>BYOK — traffic goes to the API you configure</li>
            </ul>
          </div>
        </div>
      </motion.section>

      <section className="cluely-stats">
        <div className="cluely-stats__grid">
          <div className="cluely-stat">
            <span className="cluely-stat__n">3+</span>
            <span className="cluely-stat__k">Provider styles</span>
            <p className="cluely-stat__p">Groq, OpenAI-compatible APIs, NVIDIA NIM — wire up what your org approves.</p>
          </div>
          <div className="cluely-stat">
            <span className="cluely-stat__n">0</span>
            <span className="cluely-stat__k">Bundled API keys</span>
            <p className="cluely-stat__p">The download never ships vendor secrets; you paste your own after install.</p>
          </div>
          <div className="cluely-stat">
            <span className="cluely-stat__n">100%</span>
            <span className="cluely-stat__k">Your chosen vendor</span>
            <p className="cluely-stat__p">Completions are requested from the endpoint you pick — we don&apos;t proxy prompts.</p>
          </div>
        </div>
      </section>

      <section id="byok" className="section section-cluely--soft byok-strip">
        <div className="two-col two-col--cluely">
          <motion.div {...fadeUp}>
            <h2 className="byok-strip__title">Bring your own keys</h2>
            <p className="byok-strip__lead">
              Legal consent on first launch, then onboarding with a live test. Keys live in your Windows profile.
            </p>
            <ul className="checklist checklist--cluely">
              <li>Delete data or uninstall when you need a reset.</li>
              <li>
                <Link to="/legal/terms">Terms</Link> · <Link to="/legal/privacy">Privacy</Link>
              </li>
            </ul>
          </motion.div>
          <motion.div className="panel-cluely" {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.06 }}>
            <h3>First-run checklist</h3>
            <ol className="steps-bold">
              <li>Complete every consent checkbox.</li>
              <li>Choose provider and paste your key.</li>
              <li>Run Test until it succeeds.</li>
              <li>Open the overlay and join your call.</li>
            </ol>
          </motion.div>
        </div>
      </section>

      <motion.section className="section section-cluely" {...fadeUp}>
        <h2 className="section-cluely-title">Requirements</h2>
        <ul className="list-inline list-inline--cluely">
          <li>Windows 10+ (64-bit)</li>
          <li>Account + API key with a supported provider</li>
          <li>Microphone permission if you use session listening</li>
        </ul>
      </motion.section>

      <section id="faq" className="section section-narrow section-cluely-faq">
        <motion.div {...fadeUp}>
          <h2 className="section-cluely-title">Frequently asked questions</h2>
        </motion.div>
        <FaqAccordion
          items={[
            {
              q: 'Are API keys inside the download?',
              a: 'No. You add credentials after install.',
            },
            {
              q: 'Will others fail to notice I’m using it?',
              a: 'We aim for a discreet overlay but can’t guarantee invisibility. Follow your org and platform rules.',
            },
            {
              q: 'Where are prompts processed?',
              a: (
                <>
                  At the AI provider you configure. See <Link to="/legal/privacy">privacy</Link>.
                </>
              ),
            },
            {
              q: 'Why does SmartScreen warn?',
              a: 'New unsigned Windows builds are often flagged. Use SHA256SUMS.txt on the release when you can.',
            },
            {
              q: 'Installer vs portable?',
              a: 'Portable is one file. The installer adds shortcuts and an uninstall entry.',
            },
            {
              q: 'Skip the desktop shortcut?',
              a: 'Yes — the installer finish page includes an optional checkbox.',
            },
          ]}
        />
      </section>

      <section className="cta-band cta-band--cluely" aria-labelledby="cta-band-heading">
        <div className="cta-band__inner">
          <h2 id="cta-band-heading" className="cta-band__title">
            Answers beside your next call — with your keys.
          </h2>
          <p className="cta-band__sub">Download the latest Windows build and follow the setup guide.</p>
          <div className="cta-band__actions">
            <a className="btn btn-cluely-inverse" href={SITE.releasesLatestUrl} id="cta-band-installer">
              Download for Windows
            </a>
            <Link className="btn btn-cluely-ghost" to="/docs/getting-started">
              Read the guide
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
