// Copyright (c) 2026 ShadowAssist. All rights reserved.

import React, { useRef, useEffect } from 'react'

/** Side-by-side live captions: Me (local mic) vs Participant (system / loopback). */
export default function LiveTranscriptPanel({ segments = [], visible = true, className = '', autoScroll = true }) {
  const meColRef = useRef(null)
  const partColRef = useRef(null)

  useEffect(() => {
    if (!autoScroll) return
    const m = meColRef.current
    const p = partColRef.current
    // Instant scroll — smooth scroll on every partial fights user input and adds compositor work.
    if (m) m.scrollTo({ top: m.scrollHeight, behavior: 'auto' })
    if (p) p.scrollTo({ top: p.scrollHeight, behavior: 'auto' })
  }, [segments, autoScroll])

  if (!visible) return null

  const meLines = segments.filter((s) => s.speaker === 'me')
  const otherLines = segments.filter((s) => s.speaker === 'other')

  return (
    <div
      className={[
        'grid shrink-0 grid-cols-2 gap-px border-b border-white/[0.08] bg-white/[0.06]',
        className,
      ].join(' ')}
    >
      <div
        ref={meColRef}
        className="flex max-h-[9.5rem] min-h-[4rem] flex-col gap-1 overflow-y-auto bg-sky-950/25 px-2 py-2"
      >
        <div className="sticky top-0 z-[1] bg-sky-950/80 pb-1 text-[10px] font-semibold uppercase tracking-wide text-sky-200/90">
          Me
        </div>
        {meLines.map((s) => (
          <p
            key={s.id}
            className={[
              'break-words rounded-md px-2 py-1 text-[11px] leading-snug text-zinc-100',
              s.interim ? 'bg-sky-500/5 opacity-90' : 'bg-sky-500/10',
            ].join(' ')}
            style={{ animation: 'overlayLiveLine 220ms ease-out' }}
          >
            {s.text}
          </p>
        ))}
      </div>
      <div
        ref={partColRef}
        className="flex max-h-[9.5rem] min-h-[4rem] flex-col gap-1 overflow-y-auto bg-zinc-900/40 px-2 py-2"
      >
        <div className="sticky top-0 z-[1] bg-zinc-900/85 pb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          Participant
        </div>
        {otherLines.map((s) => (
          <p
            key={s.id}
            className={[
              'break-words rounded-md px-2 py-1 text-[11px] leading-snug text-zinc-200',
              s.interim ? 'bg-zinc-800/40 opacity-90' : 'bg-zinc-800/70',
            ].join(' ')}
            style={{ animation: 'overlayLiveLine 220ms ease-out' }}
          >
            {s.text}
          </p>
        ))}
      </div>
    </div>
  )
}
