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
    [byokOk, apiKey, testResult]
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
      <div className="settings-root relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden bg-void-900 text-gray-200">
        <div className="settings-scroll-outer min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8">
          <div className="mx-auto max-w-md pb-6">
            <h1 className="text-xl font-bold tracking-tight text-white">ShadowAssist</h1>
            <p className="mt-1 text-sm text-indigo-300/90">Set up your provider (BYOK)</p>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              The app never includes vendor API keys. You must create keys in your own Groq, OpenAI, or NVIDIA account and paste them here. A successful
              connection test is required before you can continue.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => ipc?.invoke('legal:open', 'terms')}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-gray-400 hover:text-gray-200"
              >
                Terms
              </button>
              <button
                type="button"
                onClick={() => ipc?.invoke('legal:open', 'privacy')}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-gray-400 hover:text-gray-200"
              >
                Privacy
              </button>
            </div>

            <>
                <h2 className="mt-8 text-xs font-semibold uppercase tracking-wider text-gray-400">1. Provider</h2>
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
                      className="w-full rounded-xl border px-4 py-3 text-left transition-all"
                      style={{
                        background: provider === p.id ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                        borderColor: provider === p.id ? `${p.color}40` : 'rgba(255,255,255,0.08)',
                      }}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium">{p.label}</span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${p.color}25`, color: p.color }}>
                          {p.badge}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{p.desc}</p>
                    </button>
                  ))}
                </div>

                <h2 className="mt-8 text-xs font-semibold uppercase tracking-wider text-gray-400">2. Your API key</h2>
                <a href={current.link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs" style={{ color: current.color }}>
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
                    className="input-shadow flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm focus:border-accent/40 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={testApi}
                    disabled={testing || !apiKey.trim()}
                    className="rounded-xl bg-accent/20 px-4 py-2.5 text-sm font-medium text-accent hover:bg-accent/30 disabled:opacity-40"
                  >
                    {testing ? '…' : 'Test'}
                  </button>
                </div>
                {testResult && (
                  <p className={`mt-2 text-sm ${testResult.success ? 'text-accent' : 'text-rose-400'}`}>
                    {testResult.success ? '✓ Connected with your key' : testResult.error}
                  </p>
                )}

                <h2 className="mt-8 text-xs font-semibold uppercase tracking-wider text-gray-400">3. API key acknowledgment</h2>
                <p className="mt-2 text-xs text-gray-500">Required for compliance with provider programs (e.g. Groq BYOK).</p>
                <div className="mt-3 space-y-2">
                  {BYOK_CHECKS.map(({ key, label }) => (
                    <label
                      key={key}
                      className={`flex cursor-default gap-3 rounded-xl border px-3 py-2.5 ${byok[key] ? 'border-indigo-500/35 bg-indigo-500/[0.06]' : 'border-white/[0.08]'}`}
                    >
                      <input
                        type="checkbox"
                        checked={byok[key]}
                        onChange={() => toggleByok(key)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-black/40 accent-indigo-500"
                      />
                      <span className="text-xs leading-snug text-gray-300">{label}</span>
                    </label>
                  ))}
                </div>

                <h2 className="mt-8 text-xs font-semibold uppercase tracking-wider text-gray-400">4. System prompt</h2>
                <div className="mt-3 space-y-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSystemPrompt(p.prompt)}
                      className="block w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors"
                      style={{
                        background: systemPrompt === p.prompt ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                        borderColor: systemPrompt === p.prompt ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={4}
                  className="input-shadow mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-accent/40 focus:outline-none"
                />

                <button
                  type="button"
                  onClick={saveAndLaunch}
                  disabled={!canStart}
                  title={!canStart ? 'Check all boxes, enter your key, and run Test until it succeeds' : ''}
                  className="btn-glow mt-8 w-full py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Start ShadowAssist
                </button>
            </>
          </div>
        </div>
      </div>
    </AppWindowFrame>
  )
}
