// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import React, { useState, useEffect, useMemo } from 'react'
import { applyUiAccentTheme, normalizeUiAccentId } from '../shared/uiAccentThemes'
import { createIpcShim } from '../shared/ipcShim'
import AppWindowFrame from '../shared/AppWindowFrame'

const ipc = createIpcShim()

const PROVIDERS = [
  { id: 'groq', label: 'Groq', badge: 'FAST', color: '#22c55e', desc: 'Llama 3.3 70B — low latency', placeholder: 'gsk_...', link: 'https://console.groq.com/keys' },
  { id: 'openai', label: 'OpenAI', badge: 'GPT-4o', color: '#0ea5e9', desc: 'Vision & screenshots', placeholder: 'sk-...', link: 'https://platform.openai.com/api-keys' },
  { id: 'nvidia', label: 'NVIDIA NIM', badge: 'NIM', color: '#a78bfa', desc: 'Llama, Qwen, Nemotron', placeholder: 'nvapi-...', link: 'https://build.nvidia.com/' },
]

const PRESETS = [
  { id: 'builtin', label: 'ShadowAssist (built-in)', prompt: '' },
  { id: 'meeting', label: 'Meeting', prompt: 'I am in a meeting. Help me understand, contribute, and summarize.' },
  { id: 'sync', label: 'Stand-up / sync', prompt: 'I am in a team stand-up or sync. Keep suggestions brief and action-oriented.' },
]

const BYOK_CHECKS = [
  {
    key: 'b1',
    label:
      'I will use only API keys from my own provider account(s). ShadowAssist does not ship or supply Groq, OpenAI, or other vendor keys.',
  },
  {
    key: 'b2',
    label:
      'I am responsible for complying with each provider’s terms and acceptable-use policies when using my keys in this app.',
  },
]

export default function Onboarding() {
  useEffect(() => {
    if (!ipc) return
    ipc.invoke('get-store', 'uiAccentTheme').then((id) => applyUiAccentTheme(document.documentElement, normalizeUiAccentId(id)))
  }, [])

  const [provider, setProvider] = useState('groq')
  const [apiKey, setApiKey] = useState('')
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState(PRESETS[0].prompt)
  const [byok, setByok] = useState({ b1: false, b2: false })

  const current = PROVIDERS.find((p) => p.id === provider)
  const byokOk = useMemo(() => byok.b1 && byok.b2, [byok])
  const canStart = useMemo(
    () => byokOk && !!apiKey.trim() && testResult?.success === true,
    [byokOk, apiKey, testResult],
  )

  const toggleByok = (k) => setByok((s) => ({ ...s, [k]: !s[k] }))

  const testApi = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, error: 'Enter your API key from your provider account' })
      return
    }
    setTesting(true)
    setTestResult(null)
    const r = await ipc.invoke('test-api', provider, apiKey.trim())
    setTestResult(r)
    setTesting(false)
  }

  const save = (k, v) => ipc?.invoke('set-store', k, v)

  const saveAndLaunch = async () => {
    if (!canStart || !ipc) return
    const keyName = provider === 'groq' ? 'groqKey' : provider === 'nvidia' ? 'nvidiaKey' : 'apiKey'
    try {
      await save('provider', provider)
      await save(keyName, apiKey.trim())
      await save('systemPrompt', systemPrompt)
      await save('hasCompletedOnboarding', true)
    } catch (e) {
      console.error('save onboarding', e)
    }
    ipc.send('complete-onboarding')
  }

  return (
    <AppWindowFrame>
      <div className="settings-root relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden text-zinc-300">
        <header className="relative z-20 shrink-0 border-b border-white/[0.06] bg-black/30 px-5 py-4 backdrop-blur-xl lg:px-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">First launch</p>
          <h1 className="font-display mt-0.5 text-xl font-semibold tracking-tight text-white">ShadowAssist</h1>
          <p className="mt-1 max-w-md text-[13px] leading-snug text-zinc-500">
            Bring your own API key (BYOK). The app never includes vendor keys. A successful connection test is required before you continue.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => ipc?.invoke('legal:open', 'terms')}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Terms
            </button>
            <button
              type="button"
              onClick={() => ipc?.invoke('legal:open', 'privacy')}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Privacy
            </button>
          </div>
        </header>

        <div className="settings-scroll-outer relative z-20 min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-5 lg:p-8">
          <div className="mx-auto max-w-md space-y-5 pb-8">
            <section className="glass-panel p-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Provider</h2>
              <div className="mt-3 space-y-2">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProvider(p.id)
                      setApiKey('')
                      setTestResult(null)
                    }}
                    className="w-full rounded-lg border px-3 py-2.5 text-left transition-colors duration-150"
                    style={{
                      background: provider === p.id ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                      borderColor: provider === p.id ? `${p.color}35` : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium text-white">{p.label}</span>
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold" style={{ background: `${p.color}22`, color: p.color }}>
                        {p.badge}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-zinc-600">{p.desc}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="glass-panel p-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">API key</h2>
              <a href={current.link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11px] transition-opacity hover:opacity-90" style={{ color: current.color }}>
                Get a key from {current.label} →
              </a>
              <div className="mt-2 flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value)
                    setTestResult(null)
                  }}
                  placeholder={current.placeholder}
                  autoComplete="off"
                  className="input-shadow min-w-0 flex-1 px-3 py-2 text-[13px]"
                />
                <button
                  type="button"
                  onClick={testApi}
                  disabled={testing || !apiKey.trim()}
                  className="btn-ghost shrink-0 px-4 py-2 text-[12px] disabled:opacity-40"
                >
                  {testing ? '…' : 'Test'}
                </button>
              </div>
              {testResult && (
                <p className={`mt-2 text-[12px] ${testResult.success ? 'text-accent' : 'text-rose-400'}`}>
                  {testResult.success ? 'Connected with your key.' : testResult.error}
                </p>
              )}
            </section>

            <section className="glass-panel p-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Key acknowledgment</h2>
              <p className="mt-1 text-[11px] text-zinc-600">Required for provider program compliance.</p>
              <div className="mt-3 space-y-2">
                {BYOK_CHECKS.map(({ key, label }) => (
                  <label
                    key={key}
                    className={`settings-row-tile flex cursor-default gap-3 py-2.5 ${byok[key] ? 'border-indigo-500/25 bg-indigo-500/[0.04]' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={byok[key]}
                      onChange={() => toggleByok(key)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/15 bg-black/40 accent-indigo-500"
                    />
                    <span className="text-[12px] leading-snug text-zinc-300">{label}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="glass-panel p-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">System prompt</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSystemPrompt(p.prompt)}
                    className={`settings-chip settings-chip-sm !normal-case ${systemPrompt === p.prompt ? 'settings-chip-active' : ''}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={4}
                className="input-shadow mt-3 w-full resize-y px-3 py-2 text-[12px] leading-relaxed"
              />
            </section>

            <button
              type="button"
              onClick={saveAndLaunch}
              disabled={!canStart}
              title={!canStart ? 'Check all boxes, enter your key, and run Test until it succeeds' : ''}
              className="btn-glow w-full py-2.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-35"
            >
              Start ShadowAssist
            </button>
          </div>
        </div>
      </div>
    </AppWindowFrame>
  )
}
