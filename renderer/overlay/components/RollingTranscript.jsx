// Copyright (c) 2026 VeilAssist. All rights reserved.

import React, { useEffect, useRef } from 'react'

/**
 * Natively-style rolling transcript bar — horizontal scroll of the active channel text.
 * Always pins to the trailing end so newly spoken words stay visible.
 */
export default function RollingTranscript({
  text = '',
  label = '',
  speaker = 'other',
  isActive = true,
  sysCaptureActive = false,
  micCaptureActive = false,
}) {
  const containerRef = useRef(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el || !text) return
    // overflow:hidden still allows programmatic scrollLeft in Chromium —
    // pin to the end so the latest words sit in the visible (unmasked) region.
    el.scrollLeft = el.scrollWidth
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
      <div className="flex shrink-0 items-center gap-1 pr-0.5">
        <span
          className={[
            'crystal-capture-dot',
            sysCaptureActive ? 'crystal-capture-dot-sys-active' : '',
          ].join(' ')}
          aria-label={sysCaptureActive ? 'Participant audio active' : 'Participant audio idle'}
          title="Participant / system audio"
        />
        <span
          className={[
            'crystal-capture-dot',
            micCaptureActive ? 'crystal-capture-dot-mic-active' : '',
          ].join(' ')}
          aria-label={micCaptureActive ? 'Microphone active' : 'Microphone idle'}
          title="Microphone"
        />
      </div>
    </div>
  )
}
