// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import React from 'react'
import { parseSpeakerDisplayLine } from './speakerDisplayLine'

export function SpeakerTranscriptText({ line, className = '', bodyClassName = '' }) {
  const parsed = parseSpeakerDisplayLine(line)
  if (!parsed) {
    return <span className={className}>{line}</span>
  }
  const speakerClass =
    parsed.speaker === 'me' ? 'crystal-speaker-me' : 'crystal-speaker-participant'
  return (
    <span className={className}>
      <span className={speakerClass}>{parsed.label}:</span>
      {parsed.text ? <span className={bodyClassName}> {parsed.text}</span> : null}
    </span>
  )
}

export function SpeakerTranscriptBlock({ text, className = '', bodyClassName = '', lineClassName = 'block' }) {
  const raw = String(text || '').trim()
  if (!raw) return null
  const lines = raw.split('\n').filter((l) => l.trim())
  if (lines.length <= 1) {
    return (
      <SpeakerTranscriptText line={raw} className={className} bodyClassName={bodyClassName} />
    )
  }
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <SpeakerTranscriptText
          key={`${i}-${line.slice(0, 24)}`}
          line={line}
          className={lineClassName}
          bodyClassName={bodyClassName}
        />
      ))}
    </span>
  )
}
