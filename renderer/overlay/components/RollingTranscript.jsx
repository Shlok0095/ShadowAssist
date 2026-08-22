// Copyright (c) 2026 VeilAssist. All rights reserved.

import React, { useEffect, useRef } from 'react'

/**
 * Natively-style rolling transcript bar — horizontal scroll of the active channel text.
 */
export default function RollingTranscript({
  text = '',
  label = '',
  speaker = 'other',
  isActive = true,
  sysCaptureActive = true,
  micCaptureActive = true,
}) {
  const containerRef = useRef(null)

  useEffect(() => {
    const el = containerRef.current
    if (el && text) el.scrollLeft = el.scrollWidth
  }, [text])

  const chipClass =
    speaker === 'me'
      ? 'crystal-caption-chip crystal-caption-chip-me'
      : 'crystal-caption-chip crystal-caption-chip-them'

  return (
    <div className="crystal-caption-row">
      {label ? (
        <span className={chipClass}>
          {label}
        </span>
      ) : null}
      <div ref={containerRef} className="crystal-caption-text min-w-0 flex-1">
        <span className={text ? 'crystal-caption-final' : 'crystal-caption-interim'}>
          {text || (isActive ? 'Listening…' : 'Paused')}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1 pr-0.5" aria-hidden>
        <span
          className={[
            'h-1.5 w-1.5 rounded-full',
            sysCaptureActive ? 'bg-red-400/90' : 'bg-zinc-600',
          ].join(' ')}
        />
        <span
          className={[
            'h-1.5 w-1.5 rounded-full',
            micCaptureActive ? 'bg-sky-400/90' : 'bg-zinc-600',
          ].join(' ')}
        />
      </div>
    </div>
  )
}
