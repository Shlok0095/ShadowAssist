import { LiveField } from '@/components/marketing/LiveField'
import { Hero3D } from '@/components/marketing/Hero3D'
import { VaAnimeHero } from '@/components/marketing/VaAnimeHero'
import { VaButton } from '@/components/marketing/VaButton'
import { VaParticleCta } from '@/components/marketing/VaParticleCta'
import { VaReveal, VaSection } from '@/components/marketing/VaSection'
import { VaStatsLive } from '@/components/marketing/VaStatsLive'
import { DownloadHub } from '@/components/marketing/DownloadHub'
import { LightFaq } from '@/components/marketing/LightFaq'
import { LightFooter } from '@/components/marketing/LightFooter'
import { CompatLogos } from '@/components/marketing/MacosCard'
import { LiquidGlassCard } from '@/components/kokonutui/liquid-glass-card'
import { MEDIA } from '@/config/mediaManifest'
import { marketingAnchor } from '@/utils/marketingNav'

const STEPS = [
  {
    n: '01',
    title: 'Listen',
    body: 'Captures microphone and system audio so VeilAssist understands the full conversation before you ask.',
    img: MEDIA.meetingListenScreenshot,
  },
  {
    n: '02',
    title: 'Assist',
    body: 'Press Ctrl+Enter for streaming answers grounded in your screen content and live transcript.',
    img: MEDIA.meetingAssistScreenshot,
  },
  {
    n: '03',
    title: 'Recap',
    body: 'End the session for local summaries and action items — without a bot joining the meeting.',
    img: MEDIA.notesScreenshot,
  },
] as const

const BENTO = [
  {
    icon: '◌',
    title: 'Never joins the meeting',
    body: 'No guest bot, no meeting link, and no presence on the attendee list.',
  },
  {
    icon: '⛨',
    title: 'Hidden from screen share',
    body: 'Content protection keeps the overlay off recordings and shared screens until you summon it.',
  },
  {
    icon: '⌨',
    title: 'Ctrl+Enter shortcut',
    body: 'Request help mid-conversation without breaking flow or eye contact.',
  },
  {
    icon: '◎',
    title: '12+ languages',
    body: 'English, Hindi, Hinglish, and cloud speech-to-text — local or with your own API keys.',
  },
  {
    icon: '⚡',
    title: 'Low-latency streaming',
    body: 'Token-batched overlay updates deliver answers in roughly 300ms during the call.',
  },
  {
    icon: '⊞',
    title: 'Works with major meeting apps',
    body: 'Zoom, Google Meet, Microsoft Teams, Webex, Slack huddles, and more.',
    compat: true,
  },
] as const

const FAQ = [
  {
    q: 'How is VeilAssist different from a standard AI notetaker?',
    a: 'Most tools summarize after the meeting. VeilAssist provides real-time assistance while the conversation is still happening.',
  },
  {
    q: 'Who is VeilAssist designed for?',
    a: 'Interviews, sales calls, standups, and any meeting where you need support in the moment.',
  },
  {
    q: 'Is VeilAssist free?',
    a: 'The app is free to download. You bring your own API keys and pay your model provider directly.',
  },
  {
    q: 'How does it stay undetectable?',
    a: 'VeilAssist does not join as a participant. Content protection hides the overlay from screen capture until you open it.',
  },
  {
    q: 'Which platforms are supported?',
    a: 'Windows, macOS, and Linux, with the same real-time assist experience on each.',
  },
  {
    q: 'How do I get support?',
    a: 'Open a GitHub issue on the repository. The team responds on a best-effort basis.',
  },
] as const

export function MarketingHome() {
  return (
    <div className="va-page">
      <LiveField />

      <Hero3D>
        <p className="va-eyebrow va-eyebrow--live">
          <span className="va-eyebrow__pulse" />
          Real-time meeting assistant
        </p>
        <VaAnimeHero />
        <p className="va-hero-sub">
          VeilAssist listens, transcribes, and surfaces answers while you talk — without a bot in the room or
          anything visible on screen share.
        </p>
        <div className="va-hero-ctas">
          <VaParticleCta href={marketingAnchor('download')}>Download for free</VaParticleCta>
          <VaButton href={marketingAnchor('how-it-works')} variant="ghost">
            How it works
          </VaButton>
        </div>
        <p className="va-hero-platform">Available on Windows, macOS, and Linux</p>
      </Hero3D>

      <VaSection
        id="how-it-works"
        eyebrow="How it works"
        title="Listen, assist, and recap"
        subtitle="A simple workflow that stays on your desktop — never in your meeting invite."
      >
        <div className="va-steps">
          {STEPS.map((s, i) => (
            <VaReveal key={s.n} delay={i * 0.08} className="va-step">
              <div className="va-step__meta">
                <span className="va-step__n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
              <div className="va-step__visual">
                {s.img ? <img src={s.img} alt="" loading="lazy" /> : <div className="va-step__placeholder" />}
              </div>
            </VaReveal>
          ))}
        </div>
      </VaSection>

      <VaSection
        id="features"
        eyebrow="Privacy & discretion"
        title="Built for professional use"
        subtitle="Every capability is designed for live meetings where a visible AI participant is not an option."
      >
        <div className="va-bento">
          {BENTO.map((c, i) => (
            <VaReveal key={c.title} delay={i * 0.05}>
              <LiquidGlassCard glassSize="sm" className="va-bento-card group">
                <span className="va-bento-card__icon">{c.icon}</span>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
                {'compat' in c && c.compat ? <CompatLogos /> : null}
              </LiquidGlassCard>
            </VaReveal>
          ))}
        </div>
      </VaSection>

      <VaSection eyebrow="Performance" title="Metrics that matter during a call">
        <VaStatsLive />
      </VaSection>

      {MEDIA.transcriptionScreenshot ? (
        <VaSection eyebrow="Product preview" title="Live transcription, always available">
          <VaReveal className="va-shot-wrap">
            <img src={MEDIA.transcriptionScreenshot} alt="" className="va-shot" loading="lazy" />
          </VaReveal>
        </VaSection>
      ) : null}

      <VaSection id="faq" eyebrow="FAQ" title="Frequently asked questions">
        <div className="va-faq-wrap">
          <LightFaq items={[...FAQ]} />
        </div>
      </VaSection>

      <VaSection
        id="download"
        className="va-download-section"
        eyebrow="Download"
        title="Get VeilAssist"
        subtitle="Free for Windows, macOS, and Linux."
      >
        <DownloadHub />
      </VaSection>

      <LightFooter />
    </div>
  )
}
