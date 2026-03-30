// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import React, { useState, useEffect } from 'react'
import { applyUiAccentTheme, normalizeUiAccentId } from '../shared/uiAccentThemes'
import { createIpcShim } from '../shared/ipcShim'

const ipc = createIpcShim()

const PROVIDERS = [
  { id: 'groq', label: 'Groq', badge: 'FAST & FREE', color: '#22c55e', desc: 'Llama 3.3 70B — instant responses', placeholder: 'gsk_...', link: 'https://console.groq.com/keys' },
  { id: 'openai', label: 'OpenAI', badge: 'GPT-4o', color: '#0ea5e9', desc: 'Vision, screenshots, best accuracy', placeholder: 'sk-...', link: 'https://platform.openai.com/api-keys' },
  { id: 'nvidia', label: 'NVIDIA NIM', badge: 'FREE TIER', color: '#a78bfa', desc: 'Llama, Qwen, Nemotron', placeholder: 'nvapi-...', link: 'https://build.nvidia.com/' },
]

const PRESETS = [
  { id: 'meeting', label: 'Meeting', prompt: 'I am in a meeting. Help me understand, contribute, and summarize.' },
  { id: 'sync', label: 'Stand-up / sync', prompt: 'I am in a team stand-up or sync. Keep suggestions brief and action-oriented.' },
]

export default function Onboarding() {
  useEffect(() => {
    if (!ipc) return
    ipc.invoke('get-store', 'uiAccentTheme').then((id) => applyUiAccentTheme(document.documentElement, normalizeUiAccentId(id)))
  }, [])

  const [step, setStep] = useState(1)
  const [provider, setProvider] = useState('groq')
  const [apiKey, setApiKey] = useState('')
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState(PRESETS[0].prompt)

  const current = PROVIDERS.find((p) => p.id === provider)

  const testApi = async () => {
    if (!apiKey.trim()) { setTestResult({ success: false, error: 'Enter API key' }); return }
    setTesting(true); setTestResult(null)
    const r = await ipc.invoke('test-api', provider, apiKey.trim())
    setTestResult(r); setTesting(false)
  }

  const save = (k, v) => ipc?.invoke('set-store', k, v)

  const saveAndLaunch = async () => {
    const keyName = provider === 'groq' ? 'groqKey' : provider === 'nvidia' ? 'nvidiaKey' : 'apiKey'
    try {
      await save('provider', provider)
      if (apiKey.trim()) await save(keyName, apiKey.trim())
      await save('systemPrompt', systemPrompt)
      await save('hasCompletedOnboarding', true)
    } catch (e) {
      console.error('save onboarding', e)
    }
    ipc?.send('complete-onboarding')
  }

  return (
    <div className="min-h-screen bg-void-900 text-gray-200 p-8 max-w-md mx-auto font-sans">
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight">ShadowAssist</h1>
        <p className="mt-1 text-sm text-indigo-300/90">Undetectable AI for live meetings</p>
        <p className="mt-1 text-xs text-gray-500">Discreet on-screen assistant for calls and meetings — not for hiring interviews.</p>
      </div>

      {step === 1 && (
        <>
          <h2 className="text-sm font-semibold text-gray-300 mb-4">1. Choose provider</h2>
          <div className="space-y-2 mb-6">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => { setProvider(p.id); setApiKey(''); setTestResult(null) }}
                className="w-full text-left px-4 py-3 rounded-xl border transition-all"
                style={{
                  background: provider === p.id ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                  borderColor: provider === p.id ? `${p.color}40` : 'rgba(255,255,255,0.08)',
                }}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-sm">{p.label}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${p.color}25`, color: p.color }}>{p.badge}</span>
                </div>
                <p className="text-xs text-gray-500">{p.desc}</p>
              </button>
            ))}
          </div>

          <h2 className="text-sm font-semibold text-gray-300 mb-2">2. API key</h2>
          <a href={current.link} target="_blank" rel="noreferrer" className="text-xs mb-2 inline-block" style={{ color: current.color }}>Get key →</a>
          <div className="flex gap-2 mb-4">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={current.placeholder}
              className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-accent/40"
            />
            <button onClick={testApi} disabled={testing} className="px-4 py-2.5 rounded-xl bg-accent/20 text-accent text-sm font-medium hover:bg-accent/30 disabled:opacity-50">
              {testing ? '…' : 'Test'}
            </button>
          </div>
          {testResult && <p className={`text-sm mb-4 ${testResult.success ? 'text-accent' : 'text-rose-400'}`}>{testResult.success ? '✓ Connected' : testResult.error}</p>}

          <h2 className="text-sm font-semibold text-gray-300 mb-2">3. System prompt</h2>
          <div className="space-y-2 mb-6">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setSystemPrompt(p.prompt)}
                className="block w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors"
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
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm resize-none focus:outline-none focus:border-accent/40 mb-6"
          />

          <button
            onClick={saveAndLaunch}
            className="w-full py-3 rounded-xl bg-accent text-void-900 font-semibold text-sm hover:bg-accent/90 transition-colors"
          >
            Start ShadowAssist
          </button>
        </>
      )}
    </div>
  )
}
