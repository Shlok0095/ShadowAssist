// Copyright (c) 2026 VeilAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import React, { useState, useMemo, useEffect } from 'react'
import { applyUiAccentTheme, normalizeUiAccentId } from '../shared/uiAccentThemes'
import AppWindowFrame from '../shared/AppWindowFrame'
import { useBrand } from '../shared/branding'

const api = typeof window !== 'undefined' ? window.shadowAPI : null

const CHECKS = [
  {
    key: 'c1',
    label:
      'This app captures my screen and audio. I will inform all participants before using.',
  },
  {
    key: 'c2',
    label:
      'I am solely responsible for disclosing AI assistance to meeting participants as required by their policies.',
  },
  {
    key: 'c3',
    label:
      'I understand screen text and meeting audio may be sent to the third-party AI provider I configure (e.g. Groq, OpenAI, NVIDIA) when I use those features. I use only my own API keys. VeilAssist does not store meeting audio.',
  },
  {
    key: 'c4',
    label: 'I confirm I am 18 years or older.',
  },
]

export default function ConsentApp() {
  const { name } = useBrand()
  const [state, setState] = useState({ c1: false, c2: false, c3: false, c4: false })
  const allOk = useMemo(() => state.c1 && state.c2 && state.c3 && state.c4, [state])

  useEffect(() => {
    applyUiAccentTheme(document.documentElement, normalizeUiAccentId('blue'))
  }, [])

  const toggle = (k) => setState((s) => ({ ...s, [k]: !s[k] }))

  const onContinue = async () => {
    if (!allOk || !api) return
    await api.invoke('consent:complete', state)
  }

  const onDecline = () => {
    api?.invoke('consent:decline')
  }

  const openLegal = (which) => {
    void api?.invoke('legal:open', which)
  }

  return (
    <AppWindowFrame>
      <div className="settings-root relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="relative z-20 shrink-0 border-b border-white/[0.06] bg-black/30 px-5 py-4 backdrop-blur-xl lg:px-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">{name}</p>
          <h1 className="font-display mt-0.5 text-xl font-semibold tracking-tight text-white">Consent &amp; safety</h1>
          <p className="mt-1 max-w-xl text-[13px] leading-snug text-zinc-500">
            Read the legal documents, then confirm each statement. This matches the commitments in Settings → Privacy &amp; Data.
          </p>
        </header>

        <main className="settings-scroll-outer relative z-20 min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-5 lg:p-8">
          <div className="mx-auto max-w-lg">
            <section className="glass-panel p-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Documents</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-zinc-600">Open in your default viewer before you agree.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openLegal('terms')}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition-colors duration-150 hover:border-white/15 hover:bg-white/[0.07]"
                >
                  Terms of Use
                </button>
                <button
                  type="button"
                  onClick={() => openLegal('privacy')}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition-colors duration-150 hover:border-white/15 hover:bg-white/[0.07]"
                >
                  Privacy
                </button>
                <button
                  type="button"
                  onClick={() => openLegal('license')}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition-colors duration-150 hover:border-white/15 hover:bg-white/[0.07]"
                >
                  License
                </button>
              </div>

              <div className="mt-6 space-y-2">
                {CHECKS.map(({ key, label }) => (
                  <label
                    key={key}
                    className={`settings-row-tile flex cursor-default gap-3 py-3 ${
                      state[key] ? 'border-blue-500/25 bg-blue-500/[0.04]' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={state[key]}
                      onChange={() => toggle(key)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/15 bg-black/40 accent-blue-500"
                    />
                    <span className="text-[13px] leading-snug text-zinc-300">{label}</span>
                  </label>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-5">
                <button
                  type="button"
                  disabled={!allOk}
                  onClick={onContinue}
                  className="btn-glow px-6 py-2.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Continue
                </button>
                <button type="button" onClick={onDecline} className="btn-ghost px-4 py-2.5 text-[13px]">
                  Decline
                </button>
              </div>
            </section>
          </div>
        </main>
      </div>
    </AppWindowFrame>
  )
}
