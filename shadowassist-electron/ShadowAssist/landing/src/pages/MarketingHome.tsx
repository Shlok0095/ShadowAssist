import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { DsFaqAccordion } from '@/components/marketing/DsFaqAccordion'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import {
  PricingSection,
  StatsBar,
  TestimonialsMarquee,
} from '@/components/marketing/MarketingSections'
import { RippleButton, WindowsIcon } from '@/components/marketing/RippleButton'
import { TiltCard, useHeroCursor } from '@/components/marketing/TiltCard'
import { MEDIA } from '@/config/mediaManifest'
import { SITE } from '@/config/site'
import { useRevealObserver } from '@/hooks/useReveal'

const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
      </svg>
    ),
    title: 'Listens in real time',
    body: 'Mic and system audio feed live context — no bot joins your meeting.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 17.8 5.7 21l2.3-7-6-4.6h7.6L12 2z" />
      </svg>
    ),
    title: 'Instant AI assist',
    body: 'Hit Ctrl+Enter for streaming answers grounded in your screen and conversation.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
    title: 'Undetectable by design',
    body: 'Content protection keeps the overlay off recordings and shared screens.',
  },
] as const

const SPOTLIGHTS = [
  {
    chip: 'Live overlay',
    title: 'AI that helps during the call',
    body: 'VeilAssist streams answers to your overlay and phone companion together — while the meeting is still happening.',
    checks: ['Real-time token streaming', 'Screen + audio context', 'Ctrl+Enter hotkey assist', 'No post-meeting wait'],
    link: { label: 'See how it works →', href: '#how-it-works' as string, to: undefined as string | undefined },
    badges: ['⚡ Instant', '🔒 Private'],
    reverse: false,
  },
  {
    chip: 'Meeting notes',
    title: 'Instant session recaps',
    body: 'After Listen, get concise local summaries — action items, decisions, and follow-ups without sending audio to the cloud.',
    checks: ['Local session storage', 'Summary + transcript tabs', 'Shareable export', 'Works offline after capture'],
    link: { label: 'Read the docs →', href: undefined as string | undefined, to: '/docs' },
    badges: ['📝 Notes', '✦ Smart'],
    reverse: true,
  },
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
  const heroRef = useRef<HTMLElement>(null)
  useRevealObserver()
  useHeroCursor(heroRef)

  return (
    <div className="ds-page">
      {/* Hero */}
      <section ref={heroRef} className="ds-hero">
        <div className="ds-hero__grid" aria-hidden />
        <span className="orb ds-hero__orb-1" aria-hidden />
        <span className="orb ds-hero__orb-2" aria-hidden />
        <span className="ds-hero__cursor-glow" aria-hidden />

        <div className="ds-container">
          <div className="ds-hero__content reveal">
            <div className="ds-hero__badge">
              <span className="ds-hero__badge-dot" aria-hidden />
              New · Hotkey-powered AI
              <span aria-hidden> → </span>
            </div>

            <h1 className="ds-hero__title">
              Your AI Copilot,
              <br />
              Always On
              <br />
              <span className="gradient-text">One Hotkey Away.</span>
            </h1>

            <p className="ds-hero__sub">
              VeilAssist gives real-time answers and meeting notes — completely undetectable on your screen. No bots. No
              waiting until after the call.
            </p>

            <div className="ds-hero__ctas">
              <RippleButton href={SITE.downloadSetupExeUrl}>
                <WindowsIcon />
                Get for Windows
              </RippleButton>
              <RippleButton href={SITE.downloadPortablePageUrl} variant="secondary">
                Portable exe
              </RippleButton>
            </div>

            <div className="ds-hero__social">
              <div className="ds-hero__avatars" aria-hidden>
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className="ds-hero__avatar" />
                ))}
              </div>
              <p className="ds-hero__social-text">
                Trusted by <strong>5,000+</strong> engineers, PMs, and founders
              </p>
              <span className="ds-hero__stars" aria-label="4.9 out of 5 stars">
                ★★★★★
              </span>
              <span className="ds-hero__social-text">(4.9/5)</span>
            </div>
          </div>

          <div className="ds-hero__media-wrap reveal">
            <div className="ds-hero__media-tilt">
              <MediaPlaceholder variant="hero" src={MEDIA.heroVideo || undefined} />
              <div className="ds-hero__media-fade" aria-hidden />
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section id="how-it-works" className="ds-section scroll-mt-24">
        <div className="ds-container">
          <div className="ds-section__head--center reveal">
            <p className="ds-section__eyebrow">How it works</p>
            <h2 className="ds-section__title">Built for live meetings</h2>
            <p className="ds-section__sub">Everything you need to stay sharp when the pressure is on.</p>
          </div>

          <div className="ds-features-grid reveal-stagger">
            {FEATURES.map((f) => (
              <TiltCard key={f.title} className="reveal ds-feature-card">
                <div className="ds-feature-card__icon">{f.icon}</div>
                <h3 className="ds-feature-card__title">{f.title}</h3>
                <p className="ds-feature-card__body">{f.body}</p>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      <StatsBar />

      {/* Spotlight rows */}
      <section id="features" className="ds-section scroll-mt-24">
        <div className="ds-container">
          {SPOTLIGHTS.map((row, idx) => (
            <div
              key={row.title}
              className={`ds-spotlight${row.reverse ? ' ds-spotlight--reverse' : ''}${idx > 0 ? ' ds-spotlight--spaced' : ''}`}
            >
              <div className="reveal">
                <span className="ds-spotlight__chip">{row.chip}</span>
                <h3 className="ds-spotlight__title">{row.title}</h3>
                <p className="ds-spotlight__body">{row.body}</p>
                <ul className="ds-spotlight__list">
                  {row.checks.map((c) => (
                    <li key={c}>
                      <span className="ds-spotlight__check" aria-hidden>
                        ✓
                      </span>
                      {c}
                    </li>
                  ))}
                </ul>
                {row.link.to ? (
                  <Link to={row.link.to} className="ds-spotlight__link">
                    {row.link.label}
                  </Link>
                ) : (
                  <a href={row.link.href} className="ds-spotlight__link">
                    {row.link.label}
                  </a>
                )}
              </div>
              <div className="ds-spotlight__visual reveal">
                <span className="ds-float-badge ds-float-badge--tl">{row.badges[0]}</span>
                <span className="ds-float-badge ds-float-badge--br">{row.badges[1]}</span>
                <MediaPlaceholder variant="spotlight" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <PricingSection />
      <TestimonialsMarquee />

      {/* FAQ */}
      <section id="faq" className="ds-section scroll-mt-24">
        <div className="ds-container">
          <div className="reveal">
            <p className="ds-section__eyebrow">FAQ</p>
            <h2 className="ds-section__title">Frequently asked questions</h2>
          </div>
          <div className="mt-8">
            <DsFaqAccordion items={[...FAQ]} />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="download" className="ds-final-cta scroll-mt-24">
        <div className="ds-container reveal">
          <h2 className="ds-final-cta__title gradient-text">Meeting AI that helps during the call, not after.</h2>
          <p className="ds-final-cta__sub">Try VeilAssist on your next meeting today.</p>
          <div className="ds-final-cta__btns">
            <RippleButton href={SITE.downloadSetupExeUrl}>
              <WindowsIcon />
              Get for Windows
            </RippleButton>
            <RippleButton href={SITE.releasesRollingUrl} variant="secondary">
              All releases
            </RippleButton>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
