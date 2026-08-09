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
    body: 'Dual-path mic + system audio. VeilAssist understands the meeting before you ask.',
    img: MEDIA.meetingListenScreenshot,
  },
  {
    n: '02',
    title: 'Assist',
    body: 'Ctrl+Enter — streaming answers grounded in your screen and live transcript.',
    img: MEDIA.meetingAssistScreenshot,
  },
  {
    n: '03',
    title: 'Recap',
    body: 'End Listen for local summaries — action items without a bot in the room.',
    img: MEDIA.notesScreenshot,
  },
] as const

const BENTO = [
  { icon: '◌', title: 'Never joins the call', body: 'No guest bot. No meeting link. Zero presence on the attendee list.' },
  { icon: '⛨', title: 'Invisible to screen share', body: 'Content protection keeps the overlay off recordings and shared screens.' },
  { icon: '⌨', title: 'Ctrl+Enter assist', body: 'Summon help mid-sentence without breaking eye contact or flow.' },
  { icon: '◎', title: '12+ languages', body: 'English, Hindi, Hinglish, and cloud STT — local or provider keys.' },
  { icon: '⚡', title: '~300ms streaming', body: 'Token-batched overlay updates — answers feel live, not laggy.' },
  { icon: '⊞', title: 'Every meeting app', body: 'Zoom, Meet, Teams, Webex, Slack huddles — sits beside them all.', compat: true },
] as const

const FAQ = [
  { q: 'Why real-time vs. a regular AI notetaker?', a: 'Most tools summarize after the meeting. VeilAssist helps while the conversation is still happening.' },
  { q: 'Who is VeilAssist for?', a: 'Live interviews, sales calls, standups — any meeting where you need help in the moment.' },
  { q: 'Is it free?', a: 'Free to download. Bring your own API keys — you pay your model provider directly.' },
  { q: 'How is it undetectable?', a: 'No bot join. Content protection hides the overlay from screen capture until you summon it.' },
  { q: 'Which platforms?', a: 'Windows, macOS, and Linux — with the same real-time assist experience.' },
  { q: 'Support?', a: 'GitHub issues on the repo — best-effort responses from the team.' },
] as const

export function MarketingHome() {
  return (
    <div className="va-page">
      <LiveField />

      <Hero3D>
        <p className="va-eyebrow va-eyebrow--live">
          <span className="va-eyebrow__pulse" />
          Live · Undetectable · On-device ready
        </p>
        <VaAnimeHero />
        <p className="va-hero-sub">
          Real-time answers and meeting notes — floating on your desktop. No bots. No post-call wait.
        </p>
        <div className="va-hero-ctas">
          <VaParticleCta href={marketingAnchor('download')}>Download free</VaParticleCta>
          <VaButton href={marketingAnchor('how-it-works')} variant="ghost">
            See how it works
          </VaButton>
        </div>
        <p className="va-hero-platform">Windows · macOS · Linux</p>
      </Hero3D>

      <VaSection id="how-it-works" eyebrow="Workflow" title="Three beats. One invisible flow." subtitle="From listen to assist to recap — without joining your call.">
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

      <VaSection id="features" eyebrow="Stealth" title="Built to disappear." subtitle="Every feature designed for live meetings where you cannot afford a visible AI bot.">
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

      <VaSection eyebrow="Performance" title="Numbers that matter mid-call.">
        <VaStatsLive />
      </VaSection>

      {MEDIA.transcriptionScreenshot ? (
        <VaSection eyebrow="Preview" title="Live transcript, always on.">
          <VaReveal className="va-shot-wrap">
            <img src={MEDIA.transcriptionScreenshot} alt="" className="va-shot" loading="lazy" />
          </VaReveal>
        </VaSection>
      ) : null}

      <VaSection id="faq" eyebrow="FAQ" title="Questions before your next call.">
        <LightFaq items={[...FAQ]} />
      </VaSection>

      <VaSection id="download" className="va-download-section" eyebrow="Get VeilAssist" title="Ship the invisible copilot." subtitle="Free on Windows, macOS, and Linux.">
        <DownloadHub />
      </VaSection>

      <LightFooter />
    </div>
  )
}
