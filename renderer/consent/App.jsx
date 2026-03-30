// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import React, { useState, useMemo, useEffect } from 'react'
import { applyUiAccentTheme, normalizeUiAccentId } from '../shared/uiAccentThemes'
import AppWindowFrame from '../shared/AppWindowFrame'

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
      'I understand screen text and meeting audio may be sent to the third-party AI provider I configure (e.g. Groq, OpenAI, NVIDIA) when I use those features. I use only my own API keys. ShadowAssist does not store meeting audio.',
  },
  {
    key: 'c4',
    label: 'I confirm I am 18 years or older.',
  },
]

function AmbientOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      <div className="absolute -left-[20%] top-[10%] h-[420px] w-[420px] rounded-full bg-phantom-600/20 blur-[120px] animate-shadow-drift" aria-hidden />
      <div
        className="absolute -right-[15%] bottom-[5%] h-[380px] w-[380px] rounded-full bg-indigo-500/12 blur-[100px] animate-shadow-drift"
        style={{ animationDelay: '-6s' }}
        aria-hidden
      />
      <div
        className="absolute left-[40%] top-[60%] h-[200px] w-[200px] rounded-full bg-sky-500/10 blur-[80px] animate-shadow-drift"
        style={{ animationDelay: '-12s' }}
        aria-hidden
      />
    </div>
  )
}

export default function ConsentApp() {
  const [state, setState] = useState({ c1: false, c2: false, c3: false, c4: false })
  const allOk = useMemo(() => state.c1 && state.c2 && state.c3 && state.c4, [state])

  useEffect(() => {
    applyUiAccentTheme(document.documentElement, normalizeUiAccentId('indigo'))
  }, [])

  const toggle = (k) => setState((s) => ({ ...s, [k]: !s[k] }))

  const onContinue = async () => {
    if (!allOk || !api) return
    await api.invoke('consent:complete', state)
  }

  const onDecline = () => {
    api?.invoke('consent:decline')
  }

  return (
    <AppWindowFrame>
    <div className="settings-root relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
      <AmbientOrbs />

      <header className="relative z-20 shrink-0 border-b border-white/[0.06] bg-black/20 px-6 py-5 backdrop-blur-md lg:px-10">
        <div className="mx-auto max-w-2xl">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.35em] text-phantom-400/90">ShadowAssist // consent</p>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
            Before you{' '}
            <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-phantom-400 bg-clip-text text-transparent">continue</span>
          </h1>
          <p className="mt-1 text-xs font-medium text-indigo-300/85">Undetectable AI for live meetings</p>
          <p className="mt-2 max-w-xl text-sm text-mist-500">
            ShadowAssist is a discreet, undetectable on-screen assistant for live meetings only. Confirm each item to match the same commitments you
            will make in Settings → Privacy &amp; Data.
          </p>
        </div>
      </header>

      <main className="settings-scroll-outer relative z-20 min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8">
        <div className="mx-auto max-w-2xl animate-fade-in">
          <section className="glass-panel animate-border-pulse p-8">
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-gray-300">Legal acknowledgment</h2>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              All boxes must be checked. This mirrors the expectations described in{' '}
              <span className="text-gray-400">legal/terms.txt</span> and <span className="text-gray-400">legal/privacy.txt</span> in the app folder.
            </p>

            <div className="mt-8 space-y-3">
              {CHECKS.map(({ key, label }) => (
                <label
                  key={key}
                  className={`settings-row-tile flex cursor-default gap-3 ${
                    state[key] ? 'border-indigo-500/35 bg-indigo-500/[0.06]' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={state[key]}
                    onChange={() => toggle(key)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-black/40 accent-indigo-500"
                  />
                  <span className="text-sm leading-snug text-gray-300">{label}</span>
                </label>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-8">
              <button
                type="button"
                disabled={!allOk}
                onClick={onContinue}
                className="btn-glow px-8 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none"
              >
                Continue
              </button>
              <button type="button" onClick={onDecline} className="btn-ghost px-6 py-3 text-sm">
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
