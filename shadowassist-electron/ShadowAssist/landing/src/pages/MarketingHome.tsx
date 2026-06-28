import { Link } from 'react-router-dom'
import { FaqAccordion } from '@/components/FaqAccordion'
import { MediaSlot } from '@/components/marketing/MediaSlot'
import { OverlayHeroMock } from '@/components/marketing/OverlayHeroMock'
import { ScrollReveal } from '@/components/marketing/ScrollReveal'
import { WindowsDownloadButton } from '@/components/marketing/WindowsDownloadButton'
import { MEDIA } from '@/config/mediaManifest'
import { SITE } from '@/config/site'

const UNDETECTABLE = [
  {
    title: "Doesn't join meetings.",
    body: 'VeilAssist never joins your call — no bots on the guest list.',
    label: 'Participants list · no bots',
  },
  {
    title: 'Invisible to screen share.',
    body: 'Content protection keeps the overlay off recordings and shared screens.',
    label: 'Screen share comparison',
  },
  {
    title: 'Follows your eyes.',
    body: 'Move the panel anywhere — position it where you are already looking.',
    label: 'Movable overlay · keyboard hint',
  },
] as const

const STATS = [
  { n: '12+', title: 'Languages', body: 'English, Hindi, Hinglish, and cloud STT languages.' },
  { n: '300ms', title: 'Response time', body: 'Fast streaming to overlay and phone companion together.' },
  { n: '95%', title: 'Transcription accuracy', body: 'Dual-path mic + system audio with local or cloud STT.' },
] as const

const FAQ = [
  {
    q: 'Why real-time vs. a regular AI notetaker?',
    a: 'Most tools summarize after the meeting. VeilAssist helps while the conversation is still happening.',
  },
  { q: 'Who is VeilAssist for?', a: 'Live interviews, sales calls, standups, and any meeting where you need help in the moment.' },
  { q: 'Is VeilAssist free?', a: 'The app is free to download. You bring your own API keys — you pay your model provider directly.' },
  {
    q: 'How is it undetectable in meetings?',
    a: 'No bot join link. The overlay uses content protection and stays off shared screens until you summon it.',
  },
  { q: 'What languages and apps are supported?', a: '12+ STT languages. Works alongside Zoom, Meet, Teams, Webex, and more.' },
  { q: 'Can I talk to customer support?', a: 'Open an issue on GitHub or email from the repo — we respond on best effort.' },
] as const

export function MarketingHome() {
  return (
    <div className="va-page">
      {/* ── Hero (Cluely: centered serif headline + one hero visual) ── */}
      <section className="va-hero">
        <div className="va-container va-hero__copy">
          <ScrollReveal>
            <h1 className="va-hero__title">
              <span className="block">#1 Undetectable AI</span>
              <span className="block">for Meetings</span>
            </h1>
            <hr className="va-hero__rule" />
            <p className="va-hero__lede">
              VeilAssist gives <strong>real-time answers</strong> and meeting notes — all while staying completely
              undetectable on your screen.
            </p>
            <div className="va-hero__cta">
              <WindowsDownloadButton />
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={0.08} className="va-hero__visual-wrap">
          {MEDIA.heroVideo ? (
            <div className="va-hero__peek va-hero__peek--video">
              <MediaSlot label="Product hero video" kind="hero" src={MEDIA.heroVideo} />
            </div>
          ) : (
            <div className="va-hero__peek">
              <OverlayHeroMock />
            </div>
          )}
        </ScrollReveal>
      </section>

      {/* ── How during meeting (two cards) ── */}
      <section id="how-it-works" className="va-section scroll-mt-20">
        <div className="va-container">
          <ScrollReveal>
            <h2 className="va-section__title va-section__title--center">How VeilAssist helps during a meeting</h2>
          </ScrollReveal>

          <div className="va-meeting-grid">
            <ScrollReveal>
              <article className="va-meeting-card va-meeting-card--accent">
                <h3 className="va-meeting-card__head">
                  VeilAssist <span className="va-pill">listens</span> in to the conversation
                </h3>
                <p className="va-meeting-card__sub">
                  It picks up context in real time — mic and system audio — so it can help when you need it.
                </p>
                <div className="va-meeting-card__media">
                  {MEDIA.meetingListenClip ? (
                    <MediaSlot label="Listening UI clip" kind="mini" src={MEDIA.meetingListenClip} />
                  ) : (
                    <MediaSlot label="Listening UI · waveform + timer" kind="mini" />
                  )}
                </div>
              </article>
            </ScrollReveal>

            <ScrollReveal delay={0.06}>
              <article className="va-meeting-card va-meeting-card--glass">
                <h3 className="va-meeting-card__head">
                  When you need help, VeilAssist <span className="va-spark">✦</span> assists instantly
                </h3>
                <p className="va-meeting-card__sub">Hit Ctrl+Enter and VeilAssist helps you with AI in the moment.</p>
                <div className="va-meeting-card__media">
                  {MEDIA.meetingAssistClip ? (
                    <MediaSlot label="Assist UI clip" kind="mini" src={MEDIA.meetingAssistClip} />
                  ) : (
                    <MediaSlot label="Assist overlay · screen + answer" kind="mini" />
                  )}
                </div>
              </article>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Instant meeting notes (one large image frame) ── */}
      <section className="va-section va-section--tint">
        <div className="va-container va-container--narrow">
          <ScrollReveal>
            <h2 className="va-section__title va-section__title--center">Instant meeting notes</h2>
            <p className="va-section__lede va-section__lede--center">
              The easiest way to get concise, local session recaps after Listen.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.08} className="mt-10">
            <div className="va-frame-lavender">
              <MediaSlot
                label="Meeting notes / summary screenshot"
                kind="wide"
                src={MEDIA.notesScreenshot || undefined}
              />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Undetectable (3 cards + image each) ── */}
      <section id="features" className="va-section scroll-mt-20">
        <div className="va-container">
          <ScrollReveal>
            <h2 className="va-section__title va-section__title--center">Undetectable in every way</h2>
            <p className="va-section__lede va-section__lede--center">Suite of features to use VeilAssist without a trace.</p>
          </ScrollReveal>

          <div className="va-undetect-grid">
            {UNDETECTABLE.map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 0.05}>
                <article className="va-undetect-card">
                  <MediaSlot
                    label={item.label}
                    kind="feature"
                    src={MEDIA.undetectable[i] || undefined}
                    className="rounded-b-none border-0"
                  />
                  <div className="va-undetect-card__body">
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Real-time transcription (image left, stats right) ── */}
      <section className="va-section va-section--border">
        <div className="va-container va-split">
          <ScrollReveal>
            <div className="va-frame-soft">
              <MediaSlot
                label="Live transcript / session UI screenshot"
                kind="feature"
                src={MEDIA.transcriptionScreenshot || undefined}
              />
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.06}>
            <div className="va-split__copy">
              <h2 className="va-section__title">Real-time transcription</h2>
              <ul className="va-stat-list">
                {STATS.map((s) => (
                  <li key={s.title}>
                    <span className="va-stat-list__n">{s.n}</span>
                    <div>
                      <strong>{s.title}</strong>
                      <p>{s.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="va-section scroll-mt-20">
        <div className="va-container va-container--narrow">
          <ScrollReveal>
            <h2 className="va-section__title">Frequently asked questions</h2>
          </ScrollReveal>
          <ScrollReveal delay={0.06} className="mt-8">
            <FaqAccordion items={[...FAQ]} />
          </ScrollReveal>
        </div>
      </section>

      {/* ── Footer CTA (Cluely bottom) ── */}
      <section id="download" className="va-footer-cta scroll-mt-20">
        <div className="va-container va-footer-cta__inner">
          <ScrollReveal>
            <div className="va-footer-cta__text">
              <h2>Meeting AI that helps during the call, not after.</h2>
              <p>Try VeilAssist on your next meeting today.</p>
              <WindowsDownloadButton size="md" />
              <p className="va-footer-cta__alt">
                <a href={SITE.downloadPortablePageUrl}>Portable exe</a>
                <span aria-hidden> · </span>
                <a href={SITE.releasesRollingUrl}>All releases</a>
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.08} className="va-footer-cta__decor">
            {MEDIA.footerDecor ? (
              <MediaSlot label="Footer 3D keys decor" kind="feature" src={MEDIA.footerDecor} />
            ) : (
              <MediaSlot label="3D keyboard keys · ⌘ + Enter" kind="feature" className="max-w-sm" />
            )}
          </ScrollReveal>
        </div>
      </section>

      <footer className="va-site-foot">
        <div className="va-container va-site-foot__inner">
          <span className="font-semibold text-zinc-300">{SITE.name}</span>
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm">
            <Link to="/legal/privacy">Privacy</Link>
            <Link to="/legal/terms">Terms</Link>
            <Link to="/docs">Docs</Link>
            <a href={SITE.repoUrl} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </nav>
          <span className="text-xs text-zinc-600">© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  )
}
