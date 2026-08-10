// Copyright (c) 2026 VeilAssist. All rights reserved.
// Meeting toast — dark, sharp card; platform marks (SVG).

import brandLogo from '../shared/brandLogo.js'
import { resolveBrandNow } from '../shared/branding.jsx'

const root = document.getElementById('root')
/** Last payload `eventId` — sent on dismiss so main can suppress repeats. */
let lastToastEventId = ''

function platformSvg(p) {
  const x = String(p || '').toLowerCase()
  if (x === 'zoom') {
    return `<svg class="plogo" viewBox="0 0 40 40" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#0B5CFF"/>
      <path fill="#fff" d="M11 12h14L14 28h-3V12zm9 0h9v7.5h-5.2L20 12z"/>
    </svg>`
  }
  if (x === 'meet' || x === 'google_meet') {
    /* Official Google Meet (2020) geometry — Wikimedia Commons, public domain */
    return `<svg class="plogo plogo-meet-official" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 87.5 72" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <path fill="#00832d" d="M49.5 36l8.53 9.75 11.47 7.33 2-17.02-2-16.64-11.69 6.44z"/>
      <path fill="#0066da" d="M0 51.5V66c0 3.315 2.685 6 6 6h14.5l3-10.96-3-9.54-9.95-3z"/>
      <path fill="#e94235" d="M20.5 0L0 20.5l10.55 3 9.95-3 2.95-9.41z"/>
      <path fill="#2684fc" d="M20.5 20.5H0v31h20.5z"/>
      <path fill="#00ac47" d="M82.6 8.68L69.5 19.42v33.66l13.16 10.79c1.97 1.54 4.85.135 4.85-2.37V11c0-2.535-2.945-3.925-4.91-2.32zM49.5 36v15.5h-29V72h43c3.315 0 6-2.685 6-6V53.08z"/>
      <path fill="#ffba00" d="M63.5 0h-43v20.5h29V36l20-16.57V6c0-3.315-2.685-6-6-6z"/>
    </svg>`
  }
  if (x === 'teams' || x === 'msteams') {
    return `<svg class="plogo" viewBox="0 0 40 40" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="saTeamsBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#6264A7"/>
          <stop offset="1" stop-color="#464EB8"/>
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="8" fill="url(#saTeamsBg)"/>
      <g fill="#fff">
        <circle cx="14.25" cy="12.75" r="3.65"/>
        <rect x="9.25" y="16.5" width="10.5" height="11.75" rx="2.25" ry="2.25"/>
      </g>
      <g fill="#fff" opacity="0.9">
        <circle cx="24.5" cy="11.25" r="3.55"/>
        <rect x="19.75" y="15.75" width="10.5" height="13.25" rx="2.25" ry="2.25"/>
      </g>
    </svg>`
  }
  if (x === 'webex') {
    return `<svg class="plogo" viewBox="0 0 40 40" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#00C853"/>
      <circle cx="20" cy="20" r="9" fill="none" stroke="#fff" stroke-width="2.2"/>
      <circle cx="20" cy="20" r="3" fill="#fff"/>
    </svg>`
  }
  return `<svg class="plogo" viewBox="0 0 40 40" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#3f3f46"/>
    <circle cx="20" cy="20" r="6" fill="#a1a1aa"/>
  </svg>`
}

function render(data) {
  const headline = String(data?.headline || data?.title || 'Meeting detected').slice(0, 48)
  const platform = String(data?.platform || 'generic')
  const logo = platformSvg(platform)
  const brand = resolveBrandNow()
  const brandName = brand.name || 'VeilAssist'
  root.innerHTML = `
    <div class="wrap">
      <div class="top">
        <button type="button" class="close" aria-label="Close">×</button>
        <div class="brand">
          <img class="brand-logo" src="${brand.hasCustomLogo && brand.logoDataUrl ? brand.logoDataUrl : brandLogo}" alt="" draggable="false" />
          <span>${escapeHtml(brandName)}</span>
        </div>
      </div>
      <div class="row">
        <div class="logo-wrap">${logo}</div>
        <div class="msg">${escapeHtml(headline)}</div>
      </div>
    </div>
  `
  root.querySelector('.close').addEventListener('click', () => {
    window.meetingToast.dismiss(lastToastEventId)
  })
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const style = document.createElement('style')
style.textContent = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; overflow: hidden; background: transparent; }
  #root { -webkit-app-region: no-drag; }
  .wrap {
    font-family: "Segoe UI Variable", "Segoe UI", system-ui, sans-serif;
    background: linear-gradient(165deg, #141416 0%, #0c0c0e 55%, #0a0a0c 100%);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    box-shadow:
      0 0 0 1px rgba(0,0,0,0.75),
      0 12px 40px rgba(0,0,0,0.55),
      inset 0 1px 0 rgba(255,255,255,0.06);
    padding: 10px 12px 12px;
    min-width: 300px;
    max-width: 360px;
    color: #e4e4e7;
    -webkit-font-smoothing: antialiased;
  }
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .close {
    border: none;
    background: rgba(255,255,255,0.06);
    color: #a1a1aa;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    padding: 4px 10px;
    border-radius: 6px;
    font-weight: 500;
  }
  .close:hover {
    color: #fafafa;
    background: rgba(255,255,255,0.12);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #52525b;
    text-transform: uppercase;
  }
  .brand-logo {
    height: 18px;
    width: auto;
    display: block;
    object-fit: contain;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .logo-wrap { flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .plogo { width: 40px; height: 40px; display: block; border-radius: 8px; }
  .plogo-meet-official { width: 48px; height: 40px; border-radius: 10px; }
  .msg {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.3;
    color: #fafafa;
    letter-spacing: -0.01em;
  }
`
document.head.appendChild(style)

window.meetingToast.onPayload((data) => {
  const d = data || {}
  lastToastEventId = String(d.eventId || '').trim()
  render(d)
})
