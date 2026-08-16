import { useId } from 'react'

export function SessionOrb({
  mode,
  onPause,
  onResume,
}: {
  mode: 'loading' | 'pause' | 'play'
  onPause: () => void
  onResume: () => void
}) {
  if (mode === 'loading') {
    return (
      <span className="mobile-session-orb is-loading" role="status" aria-label="Starting session">
        <OrbSvg mode="loading" />
      </span>
    )
  }

  const paused = mode === 'play'
  return (
    <button
      type="button"
      className="mobile-session-orb"
      aria-label={paused ? 'Resume session' : 'Pause session'}
      onClick={paused ? onResume : onPause}
    >
      <OrbSvg mode={paused ? 'play' : 'pause'} />
    </button>
  )
}

function OrbSvg({ mode }: { mode: 'loading' | 'pause' | 'play' }) {
  const uid = useId().replace(/:/g, '')
  const face = `${uid}-face`
  const sheen = `${uid}-sheen`
  const shade = `${uid}-shade`
  const shadow = `${uid}-shadow`

  return (
    <svg className="mobile-session-orb-svg" viewBox="0 0 96 96" aria-hidden>
      <defs>
        <radialGradient id={face} cx="70%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="38%" stopColor="#f7f7f8" />
          <stop offset="78%" stopColor="#e4e6ea" />
          <stop offset="100%" stopColor="#c8ccd2" />
        </radialGradient>
        <radialGradient id={sheen} cx="32%" cy="22%" r="55%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={shade} cx="78%" cy="82%" r="60%">
          <stop offset="0%" stopColor="#7d838c" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#7d838c" stopOpacity="0" />
        </radialGradient>
        <filter id={shadow} x="-45%" y="-25%" width="190%" height="190%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3.8" result="blur" />
          <feOffset dx="-7" dy="9" in="blur" result="off" />
          <feFlood floodColor="#000000" floodOpacity="0.42" result="tint" />
          <feComposite in="tint" in2="off" operator="in" result="drop" />
          <feMerge>
            <feMergeNode in="drop" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#${shadow})`}>
        <circle cx="50" cy="43" r="27" fill={`url(#${face})`} />
        <circle cx="50" cy="43" r="27" fill={`url(#${shade})`} />
        <circle cx="50" cy="43" r="27" fill={`url(#${sheen})`} />
        <circle
          cx="50"
          cy="43"
          r="26.35"
          fill="none"
          stroke="rgba(255,255,255,0.78)"
          strokeWidth="1.35"
        />
        <circle
          cx="50"
          cy="43"
          r="27"
          fill="none"
          stroke="rgba(40,44,48,0.16)"
          strokeWidth="0.7"
        />
        {mode === 'pause' ? <PauseGlyph /> : null}
        {mode === 'play' ? <PlayGlyph /> : null}
        {mode === 'loading' ? <LoadingGlyph /> : null}
      </g>
    </svg>
  )
}

function PauseGlyph() {
  return (
    <g fill="#373d3f">
      <rect x="42.2" y="34.2" width="5.4" height="17.6" rx="2.7" />
      <rect x="52.4" y="34.2" width="5.4" height="17.6" rx="2.7" />
    </g>
  )
}

function PlayGlyph() {
  return <path fill="#373d3f" d="M41.8 33.4v19.2L60.6 43 41.8 33.4Z" />
}

function LoadingGlyph() {
  return (
    <g className="mobile-session-orb-loader" fill="none" strokeLinecap="round">
      <circle cx="50" cy="43" r="9.5" stroke="rgba(55,61,63,0.18)" strokeWidth="2.6" />
      <circle
        cx="50"
        cy="43"
        r="9.5"
        stroke="#373d3f"
        strokeWidth="2.6"
        strokeDasharray="16 44"
      />
    </g>
  )
}
