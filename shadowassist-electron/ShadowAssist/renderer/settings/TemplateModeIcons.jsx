// Copyright (c) 2026 VeilAssist. All rights reserved.
// Cluely-style template icons — tinted tile + stroke glyph.

import React from 'react'

const S = { stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' }

function IconSales() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <path {...S} d="M3 7.5 5 3.5h10l2 4" />
      <path {...S} d="M2.5 7.5h15V15a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 2.5 15V7.5z" />
      <path {...S} d="M7 11.5h1.5M11.5 11.5H13" />
    </svg>
  )
}

function IconRecruiting() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <path {...S} d="M4 7.5V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1.5" />
      <path {...S} d="M3.5 7.5h13v7.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 3.5 15V7.5z" />
      <path {...S} d="M8 7.5V5.5a2 2 0 0 1 4 0v2" />
    </svg>
  )
}

function IconMeeting() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <rect {...S} x="2.5" y="5.5" width="15" height="10" rx="2" />
      <circle {...S} cx="10" cy="10.5" r="2.25" />
      <path {...S} d="M7.5 3.5h5l1 2h-7l1-2z" />
    </svg>
  )
}

function IconInterview() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <path {...S} d="M3 8.5 10 4l7 4.5" />
      <path {...S} d="M5 8.5V14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8.5" />
      <path {...S} d="M8 14v2.5h4V14" />
      <path {...S} d="M3 8.5h14" />
    </svg>
  )
}

function IconLecture() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <path {...S} d="M4 5.5c0-1 .8-1.5 2-1.5h8c1.2 0 2 .5 2 1.5v9c0 1-.8 1.5-2 1.5H6c-1.2 0-2-.5-2-1.5v-9z" />
      <path {...S} d="M7 8.5h6M7 11h4.5" />
      <path {...S} d="M10 5.5V4" />
    </svg>
  )
}

function IconGeneral() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <path {...S} d="M10 3.5v2M10 14.5v2M4.2 5.8l1.4 1.4M14.4 12.8l1.4 1.4M3.5 10h2M14.5 10h2M5.8 14.4l1.4-1.4M12.8 7.4l1.4-1.4" />
      <circle {...S} cx="10" cy="10" r="2.75" />
    </svg>
  )
}

function IconGenAi() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <rect {...S} x="4.5" y="4.5" width="11" height="11" rx="2" />
      <path {...S} d="M7.5 8h5M7.5 10.5h3.5M7.5 13h5" />
      <circle fill="currentColor" stroke="none" cx="7" cy="8" r="0.75" />
      <circle fill="currentColor" stroke="none" cx="7" cy="10.5" r="0.75" />
      <circle fill="currentColor" stroke="none" cx="7" cy="13" r="0.75" />
    </svg>
  )
}

function IconDataScience() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <path {...S} d="M4 15.5V8.5M8.5 15.5V5.5M13 15.5v-4M17.5 15.5V10" />
      <path {...S} d="M3 15.5h14.5" />
    </svg>
  )
}

const ICON_MAP = {
  general: IconGeneral,
  sales: IconSales,
  recruiting: IconRecruiting,
  meeting: IconMeeting,
  interview: IconInterview,
  lecture: IconLecture,
  'gen-ai': IconGenAi,
  'data-science': IconDataScience,
}

function hexToRgba(hex, alpha) {
  const h = String(hex || '#6366f1').replace('#', '')
  if (h.length !== 6) return `rgba(99, 102, 241, ${alpha})`
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function TemplateModeIcon({ icon = 'general', color = '#6366f1' }) {
  const Icon = ICON_MAP[icon] || ICON_MAP.general
  return (
    <span
      className="mode-template-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border"
      style={{
        color,
        backgroundColor: hexToRgba(color, 0.14),
        borderColor: hexToRgba(color, 0.28),
        boxShadow: `inset 0 1px 0 ${hexToRgba(color, 0.12)}`,
      }}
    >
      <Icon />
    </span>
  )
}
