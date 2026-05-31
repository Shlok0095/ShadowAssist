const ITEMS = [
  'Live Listen sessions',
  'Screen-grounded answers',
  'BYOK · provider-direct',
  'Stealth overlay',
  'Google Meet detection',
  'Meeting recaps',
  'Multilingual STT',
  'Hotkey-first UX',
] as const

export function FeatureMarquee() {
  const track = [...ITEMS, ...ITEMS]

  return (
    <div className="futura-marquee relative overflow-hidden border-y border-white/[0.06] bg-white/[0.02] py-3">
      <div className="futura-marquee__fade-l" aria-hidden />
      <div className="futura-marquee__fade-r" aria-hidden />
      <div className="futura-marquee__track flex w-max gap-10">
        {track.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className="flex shrink-0 items-center gap-10 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500"
          >
            <span className="text-cyan-400/80">◆</span>
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
