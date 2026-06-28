import { TiltCard } from '@/components/marketing/TiltCard'
import { RippleButton } from '@/components/marketing/RippleButton'
import { SITE } from '@/config/site'
import { useCountUp } from '@/hooks/useCountUp'

const STATS = [
  { num: '12+', label: 'Languages' },
  { num: '300ms', label: 'Response time' },
  { num: '0', label: 'Meeting bots' },
  { num: '5000+', label: 'Downloads' },
] as const

function StatNum({ value }: { value: string }) {
  const { ref, shown } = useCountUp(value)
  return (
    <div ref={ref} className="ds-stats__num">
      {shown}
    </div>
  )
}

export function StatsBar() {
  return (
    <section className="ds-stats" aria-label="Product stats">
      <div className="ds-container">
        <div className="ds-stats__grid reveal">
          {STATS.map((s) => (
            <div key={s.label} className="ds-stats__item">
              <StatNum value={s.num} />
              <p className="ds-stats__label">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const TESTIMONIALS = [
  { quote: 'VeilAssist saved me on a technical interview — answers streamed before I could panic.', name: 'Alex R.', role: 'Software Engineer' },
  { quote: 'No bot joining the call. That alone makes it worth it for client meetings.', name: 'Priya M.', role: 'Account Executive' },
  { quote: 'Ctrl+Enter during standup is unfair. In a good way.', name: 'Jordan K.', role: 'Engineering Lead' },
  { quote: 'Screen share safe overlay is the killer feature nobody talks about.', name: 'Sam T.', role: 'Consultant' },
  { quote: 'BYOK means I control cost. Streaming to my phone companion is clutch.', name: 'Neha S.', role: 'PM' },
  { quote: 'Finally — meeting AI that helps during the call, not a PDF afterward.', name: 'Chris L.', role: 'Founder' },
] as const

function TestimonialCards({ prefix }: { prefix: string }) {
  return TESTIMONIALS.map((c, i) => (
    <article key={`${prefix}-${i}`} className="ds-testimonial">
      <p className="ds-testimonial__quote">&ldquo;{c.quote}&rdquo;</p>
      <div className="ds-testimonial__stars" aria-hidden>
        ★★★★★
      </div>
      <div className="ds-testimonial__author">
        <span className="ds-testimonial__avatar" aria-hidden />
        <div>
          <p className="ds-testimonial__name">{c.name}</p>
          <p className="ds-testimonial__role">{c.role}</p>
        </div>
      </div>
    </article>
  ))
}

export function TestimonialsMarquee() {
  return (
    <section className="ds-section" aria-label="Testimonials">
      <div className="ds-container">
        <div className="ds-section__head--center reveal">
          <p className="ds-section__eyebrow">Loved by builders</p>
          <h2 className="ds-section__title">What people are saying</h2>
        </div>
      </div>
      <div className="ds-marquee-wrap">
        <div className="ds-marquee-row ds-marquee-row--left">
          <TestimonialCards prefix="a" />
          <TestimonialCards prefix="b" />
        </div>
      </div>
      <div className="ds-marquee-wrap">
        <div className="ds-marquee-row ds-marquee-row--right">
          <TestimonialCards prefix="c" />
          <TestimonialCards prefix="d" />
        </div>
      </div>
    </section>
  )
}

type Tier = {
  name: string
  price: string
  period: string
  highlight: boolean
  features: readonly string[]
  cta: string
  teams?: boolean
}

const TIERS: Tier[] = [
  {
    name: 'Starter',
    price: '$0',
    period: '',
    highlight: false,
    features: ['Windows download', 'Overlay + settings', 'Bring your own API keys', 'Local session recaps'],
    cta: 'Download free',
  },
  {
    name: 'Pro',
    price: 'BYOK',
    period: '',
    highlight: true,
    features: ['Everything in Starter', 'Vision + screen context', 'Phone companion streaming', '12+ STT languages', 'Content protection'],
    cta: 'Get for Windows',
  },
  {
    name: 'Teams',
    price: 'Custom',
    period: '',
    highlight: false,
    features: ['Volume deployment', 'Custom hotkeys', 'Priority support', 'Security review'],
    cta: 'Contact us',
    teams: true,
  },
]

function PricingCard({ tier }: { tier: Tier }) {
  const href = tier.teams ? SITE.repoUrl : SITE.downloadSetupExeUrl

  return (
    <TiltCard className={`reveal ds-pricing-card${tier.highlight ? ' ds-pricing-card--highlight' : ''}`}>
      {tier.highlight ? <span className="ds-pricing-card__badge">Most Popular</span> : null}
      <p className="ds-pricing-card__tier">{tier.name}</p>
      <p className="ds-pricing-card__price">
        {tier.price}
        {tier.period ? <span className="ds-pricing-card__period">{tier.period}</span> : null}
      </p>
      <ul className="ds-pricing-card__features">
        {tier.features.map((f) => (
          <li key={f}>
            <span className="ds-pricing-card__check" aria-hidden>
              ✓
            </span>
            {f}
          </li>
        ))}
      </ul>
      <RippleButton href={href} variant={tier.highlight ? 'primary' : 'secondary'} size="sm" className="ds-btn--lg">
        {tier.highlight ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M3 5.5L10.5 4.5V11H3V5.5zm0 13L10.5 19.5V13H3v5.5zM12 4.2L21 3v8.8H12V4.2zm0 15.6V12H21v9l-9-1.2z" />
            </svg>
            {tier.cta}
          </>
        ) : (
          tier.cta
        )}
      </RippleButton>
    </TiltCard>
  )
}

export function PricingSection() {
  return (
    <section id="pricing" className="ds-section scroll-mt-24">
      <div className="ds-container">
        <div className="ds-section__head--center reveal">
          <p className="ds-section__eyebrow">Pricing</p>
          <h2 className="ds-section__title">Simple, transparent</h2>
          <p className="ds-section__sub">Free to download. You pay your model provider directly.</p>
        </div>
        <div className="ds-pricing-grid reveal-stagger ds-pricing-grid--mobile-pro-first">
          {TIERS.map((t) => (
            <PricingCard key={t.name} tier={t} />
          ))}
        </div>
      </div>
    </section>
  )
}
