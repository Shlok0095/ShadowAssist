// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import React, { useState, useEffect, useMemo, useId, memo } from 'react'
import { UI_ACCENT_THEMES, applyUiAccentTheme, normalizeUiAccentId } from '../shared/uiAccentThemes'
import { createIpcShim } from '../shared/ipcShim'
import AppWindowFrame from '../shared/AppWindowFrame'

const ipc = createIpcShim()

const RESUME_TEXT_MAX = 20000
const JD_TEXT_MAX = 12000

const GROQ_WHISPER = ['whisper-large-v3-turbo', 'whisper-large-v3']
const TOGETHER_WHISPER_MODELS = ['openai/whisper-large-v3', 'openai/whisper-large-v3-turbo']
const MISTRAL_STT_MODELS = ['voxtral-mini-latest', 'voxtral-mini-transcribe-realtime-2602']
const FIREWORKS_STT_MODELS = ['whisper-v3-turbo', 'whisper-v3']

const PROMPT_PRESETS = [
  { id: 'meeting', label: 'Meeting', prompt: 'I am in a meeting. Help me understand, contribute, and summarize.' },
  { id: 'sync', label: 'Stand-up / sync', prompt: 'I am in a team stand-up or sync. Keep suggestions brief and action-oriented.' },
]

const save = (k, v) => ipc?.invoke('set-store', k, v)

function useFirstRunQuery() {
  return useMemo(() => {
    try {
      const q = window.location.search
      const p = new URLSearchParams(q.startsWith('?') ? q.slice(1) : q)
      return p.get('firstRun') === '1'
    } catch {
      return false
    }
  }, [])
}

const AmbientOrbs = memo(function AmbientOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      <div
        className="absolute -left-[20%] top-[10%] h-[420px] w-[420px] transform-gpu rounded-full bg-phantom-600/20 blur-[120px] animate-shadow-drift"
        aria-hidden
      />
      <div
        className="absolute -right-[15%] bottom-[5%] h-[380px] w-[380px] transform-gpu rounded-full bg-accent/10 blur-[100px] animate-shadow-drift"
        style={{ animationDelay: '-6s' }}
        aria-hidden
      />
      <div
        className="absolute left-[40%] top-[60%] h-[200px] w-[200px] transform-gpu rounded-full bg-sky-500/10 blur-[80px] animate-shadow-drift"
        style={{ animationDelay: '-12s' }}
        aria-hidden
      />
    </div>
  )
})

const ModelSelect = memo(function ModelSelect({ label, value, models, onChange, listbox }) {
  const safeVal = models.includes(value) ? value : models[0] || ''
  const n = models.length
  const size = listbox && n > 1 ? Math.min(22, Math.max(5, n)) : undefined
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-mist-400">{label}</label>
      <select
        value={safeVal}
        size={size}
        onChange={(e) => onChange(e.target.value)}
        className={`input-shadow w-full px-3 py-2 font-mono text-xs ${size ? 'min-h-0' : 'py-2.5'}`}
      >
        {models.map((m) => (
          <option key={m} value={m} className="bg-void-900">
            {m}
          </option>
        ))}
      </select>
    </div>
  )
})

const ModelInput = memo(function ModelInput({ label, value, onChange, onCommit, suggestions, hint }) {
  const id = useId()
  const listId = `${id}-models`
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-mist-400">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onCommit(e.target.value)}
        list={listId}
        className="input-shadow w-full px-3 py-2.5 font-mono text-xs"
        placeholder="Paste model id from vendor docs"
        autoComplete="off"
      />
      <datalist id={listId}>
        {(suggestions || []).map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      {hint && <p className="mt-1 text-[10px] text-gray-600">{hint}</p>}
    </div>
  )
})

export default function Settings() {
  const isFirstRunWindow = useFirstRunQuery()

  const [providerMeta, setProviderMeta] = useState([])
  const [snap, setSnap] = useState(null)
  const [provider, setProvider] = useState('groq')
  const [secretInput, setSecretInput] = useState('')
  const [keySetMap, setKeySetMap] = useState({})
  const [systemPrompt, setSystemPrompt] = useState('')
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)
  const [activeTab, setActiveTab] = useState('api')
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true)
  const [ocrEnabled, setOcrEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [ocrInterval, setOcrInterval] = useState(8000)
  const [audioChunkSize, setAudioChunkSize] = useState(5000)
  const [audioFallbackKey, setAudioFallbackKey] = useState('')
  const [audioFallbackProvider, setAudioFallbackProvider] = useState('openai')

  const [resumeContext, setResumeContext] = useState('')
  const [resumeSourceName, setResumeSourceName] = useState('')
  const [jdContext, setJdContext] = useState('')
  const [resumeParsing, setResumeParsing] = useState(false)
  const [resumeError, setResumeError] = useState(null)

  const [modelCatalog, setModelCatalog] = useState({})
  const [sttPolicy, setSttPolicy] = useState(null)
  const [remoteChatModels, setRemoteChatModels] = useState(null)
  const [listModelsLoading, setListModelsLoading] = useState(false)
  const [listModelsErr, setListModelsErr] = useState('')

  const [overlayOpacityUi, setOverlayOpacityUi] = useState(0.92)
  const [overlayFontUi, setOverlayFontUi] = useState('medium')
  const [overlayW, setOverlayW] = useState(400)
  const [overlayH, setOverlayH] = useState(540)
  const [uiAccentThemeId, setUiAccentThemeId] = useState('neon')

  const currentMeta = useMemo(() => providerMeta.find((p) => p.id === provider), [providerMeta, provider])

  useEffect(() => {
    if (!ipc) return
    Promise.all([ipc.invoke('get-all-settings'), ipc.invoke('get-provider-metadata')])
      .then(([s, meta]) => {
        setSnap(s)
        setProviderMeta(meta || [])
        setProvider(s.provider || 'groq')
        setSystemPrompt(s.systemPrompt || '')
        setHasCompletedOnboarding(!!s.hasCompletedOnboarding)
        setOcrEnabled(s.ocrEnabled !== false)
        setAudioEnabled(s.audioEnabled !== false)
        setOcrInterval(s.ocrInterval || 8000)
        setAudioChunkSize(s.audioChunkSize || 5000)
        setAudioFallbackProvider(s.audioFallbackProvider || 'openai')
        setResumeContext(s.resumeContext || '')
        setResumeSourceName(s.resumeSourceName || '')
        setJdContext(s.jdContext || '')
        const ob = s.overlayBounds || {}
        setOverlayOpacityUi(typeof s.overlayOpacity === 'number' ? s.overlayOpacity : 0.92)
        setOverlayFontUi(s.overlayFontSize || 'medium')
        setOverlayW(ob.width || 400)
        setOverlayH(ob.height || 540)
        const accentId = normalizeUiAccentId(s.uiAccentTheme)
        setUiAccentThemeId(accentId)
        applyUiAccentTheme(document.documentElement, accentId)
        setKeySetMap({
          apiKey: !!s.apiKey,
          groqKey: !!s.groqKey,
          nvidiaKey: !!s.nvidiaKey,
          anthropicKey: !!s.anthropicKey,
          deepseekKey: !!s.deepseekKey,
          moonshotKey: !!s.moonshotKey,
          mistralKey: !!s.mistralKey,
          xaiKey: !!s.xaiKey,
          openrouterKey: !!s.openrouterKey,
          togetherKey: !!s.togetherKey,
          perplexityKey: !!s.perplexityKey,
          googleKey: !!s.googleKey,
          fireworksKey: !!s.fireworksKey,
          cerebrasKey: !!s.cerebrasKey,
          customOpenaiKey: !!s.customOpenaiKey,
        })
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!ipc) return
    Promise.all([ipc.invoke('get-chat-model-catalog'), ipc.invoke('get-stt-policy')])
      .then(([cat, pol]) => {
        setModelCatalog(cat && typeof cat === 'object' ? cat : {})
        setSttPolicy(pol)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    setRemoteChatModels(null)
    setListModelsErr('')
  }, [provider])

  useEffect(() => {
    if (!ipc) return
    const onUiAccent = (_, id) => {
      const next = normalizeUiAccentId(id)
      setUiAccentThemeId(next)
      applyUiAccentTheme(document.documentElement, next)
    }
    const unsub = ipc.on('ui-accent-update', onUiAccent)
    return () => unsub?.()
  }, [])

  const showSetupBanner = isFirstRunWindow && !hasCompletedOnboarding

  const saveKey = (storeKey, val) => {
    if (!val?.trim()) return
    save(storeKey, val.trim())
    setSecretInput('')
    setKeySetMap((k) => ({ ...k, [storeKey]: true }))
  }

  const patchSnap = (key, value) => {
    setSnap((s) => (s ? { ...s, [key]: value } : s))
  }

  const getKeyForTest = async () => {
    const field = currentMeta?.keyField
    if (!field) return ''
    const local = secretInput.trim()
    const stored = await ipc?.invoke('get-store', field)
    return local || stored
  }

  const testApi = async () => {
    const key = await getKeyForTest()
    if (!key) {
      setTestResult({ success: false, error: 'Enter or save API key first' })
      return
    }
    setTesting(true)
    setTestResult(null)
    const r = await ipc.invoke('test-api', provider, key)
    setTestResult(r)
    setTesting(false)
  }

  const launchFromSetup = async () => {
    try {
      await save('systemPrompt', systemPrompt)
      await save('jdContext', jdContext.slice(0, JD_TEXT_MAX))
      await save('hasCompletedOnboarding', true)
      setHasCompletedOnboarding(true)
    } catch (e) {
      console.error(e)
    }
    ipc?.send('complete-onboarding')
  }

  const pickResumeFile = async () => {
    if (!ipc) return
    setResumeError(null)
    const { canceled, filePaths } = await ipc.invoke('show-open-dialog', {
      properties: ['openFile'],
      filters: [{ name: 'Resume', extensions: ['pdf', 'txt'] }],
    })
    if (canceled || !filePaths?.[0]) return
    setResumeParsing(true)
    try {
      const raw = await ipc.invoke('parse-playbook', filePaths[0])
      const text = (raw || '').trim()
      if (!text) throw new Error('No text extracted — try another PDF or use .txt')
      const truncated = text.slice(0, RESUME_TEXT_MAX)
      await save('resumeContext', truncated)
      const base = (await ipc.invoke('path-basename', filePaths[0])) || 'resume'
      await save('resumeSourceName', base)
      setResumeContext(truncated)
      setResumeSourceName(base)
    } catch (e) {
      setResumeError(e.message || 'Could not parse file')
    } finally {
      setResumeParsing(false)
    }
  }

  const syncRemoteModels = async () => {
    if (!ipc) return
    setListModelsLoading(true)
    setListModelsErr('')
    try {
      const res = await ipc.invoke('list-remote-models', provider)
      if (res.ok && res.models?.length) setRemoteChatModels(res.models)
      setListModelsErr(res.error || (res.ok ? '' : 'No models returned'))
    } catch (e) {
      setListModelsErr(e.message || 'Sync failed')
    } finally {
      setListModelsLoading(false)
    }
  }

  const clearResume = async () => {
    await save('resumeContext', '')
    await save('resumeSourceName', '')
    setResumeContext('')
    setResumeSourceName('')
    setResumeError(null)
  }

  const tabs = [
    { id: 'api', label: 'Neural link', sub: 'Vendors & keys' },
    { id: 'profile', label: 'Shadow profile', sub: 'Tone & meeting context' },
    { id: 'display', label: 'Overlay', sub: 'Look & layout' },
    { id: 'session', label: 'Field ops', sub: 'OCR & audio' },
    { id: 'privacy', label: 'Privacy & Data', sub: 'Undetectable meeting AI' },
    { id: 'about', label: 'Manifest', sub: 'About' },
  ]

  const applyOverlayOpacity = async (raw) => {
    const v = Math.min(1, Math.max(0.35, Number(raw)))
    setOverlayOpacityUi(v)
    patchSnap('overlayOpacity', v)
    await save('overlayOpacity', v)
    await ipc?.invoke('apply-overlay-display', { overlayOpacity: v })
  }

  const applyOverlayFont = async (v) => {
    if (!['small', 'medium', 'large'].includes(v)) return
    setOverlayFontUi(v)
    patchSnap('overlayFontSize', v)
    await save('overlayFontSize', v)
    await ipc?.invoke('apply-overlay-display', { overlayFontSize: v })
  }

  const applyUiAccent = async (id) => {
    const next = normalizeUiAccentId(id)
    setUiAccentThemeId(next)
    applyUiAccentTheme(document.documentElement, next)
    patchSnap('uiAccentTheme', next)
    await save('uiAccentTheme', next)
  }

  const applyOverlaySize = async () => {
    const w = Math.min(860, Math.max(280, Math.round(overlayW)))
    const h = Math.min(940, Math.max(180, Math.round(overlayH)))
    setOverlayW(w)
    setOverlayH(h)
    const prev = snap?.overlayBounds || {}
    const next = { ...prev, width: w, height: h }
    patchSnap('overlayBounds', next)
    await save('overlayBounds', next)
    await ipc?.invoke('apply-overlay-display', { width: w, height: h })
  }

  const snapOverlayToPreset = async (preset) => {
    if (!ipc) return
    await ipc.invoke('set-overlay-position-preset', preset)
    const b = await ipc.invoke('get-window-bounds')
    if (b) {
      patchSnap('overlayBounds', b)
      setOverlayW(b.width)
      setOverlayH(b.height)
    }
  }

  const OVERLAY_POSITION_PRESETS = ['Top-Right', 'Top-Left', 'Bottom-Right', 'Bottom-Left', 'Center-Right']

  const nativeSttIds = sttPolicy?.nativeSttProviderIds || ['groq', 'openai', 'together', 'mistral', 'fireworks']
  const needsAudioFallback = !nativeSttIds.includes(provider)
  const keyField = currentMeta?.keyField
  const modelField = currentMeta?.modelField
  const modelValue = snap && modelField ? (snap[modelField] ?? currentMeta?.defaultModel ?? '') : ''

  const mergedChatOptions = useMemo(() => {
    const base = modelCatalog[provider] || []
    const fromApi = remoteChatModels?.length ? remoteChatModels : []
    const set = new Set([...fromApi, ...base])
    const m = (modelValue || '').trim()
    if (m) set.add(m)
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [provider, modelCatalog, remoteChatModels, modelValue])

  return (
    <AppWindowFrame>
      <div className="settings-root relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
      <AmbientOrbs />

      <header className="relative z-20 shrink-0 border-b border-white/[0.06] bg-black/20 px-6 py-5 backdrop-blur-md lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.35em] text-phantom-400/90">ShadowAssist</p>
            <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
              Command{' '}
              <span className="bg-gradient-to-r from-accent via-accent-light to-phantom-400 bg-clip-text text-transparent">surface</span>
            </h1>
            <p className="mt-1 text-xs font-medium text-indigo-300/80">Undetectable AI for live meetings</p>
            <p className="mt-1 max-w-xl text-sm text-mist-500">
              {showSetupBanner ? 'Calibrate your whisper — wide layout, zero chrome noise.' : 'Real-time AI assistance — paste keys & model IDs from each vendor’s docs.'}
            </p>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <div className="shadow-accent-dot h-2 w-2 animate-pulse rounded-full bg-accent" title="Core" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Lattice online</span>
          </div>
        </div>
      </header>

      {showSetupBanner && (
        <div className="relative z-20 shrink-0 border-b border-accent/20 bg-gradient-to-r from-accent/10 via-transparent to-phantom-600/10 px-6 py-3 lg:px-10">
          <p className="text-sm font-medium text-accent">First sync</p>
          <p className="text-xs text-gray-400">Pick a vendor, paste key + model id — meeting context lives under Shadow profile.</p>
        </div>
      )}

      <div className="relative z-20 flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <nav className="flex w-[200px] shrink-0 flex-col border-r border-white/[0.06] bg-black/25 py-6 backdrop-blur-sm">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`group mx-3 mb-1 rounded-xl px-4 py-3 text-left transition-all duration-300 ${
                activeTab === t.id
                  ? 'border border-accent/35 bg-gradient-to-br from-accent/18 via-accent/8 to-phantom-600/10 shadow-[inset_0_1px_0_rgb(var(--accent-rgb)/0.12),0_0_28px_-14px_rgb(var(--accent-rgb)/0.25)]'
                  : 'border border-transparent bg-gradient-to-b from-white/[0.05] to-transparent hover:border-white/[0.09] hover:from-white/[0.07] hover:shadow-[0_8px_28px_-18px_rgba(0,0,0,0.5)]'
              }`}
            >
              <span className={`font-display text-sm font-semibold ${activeTab === t.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                {t.label}
              </span>
              <span className="mt-0.5 block text-[10px] uppercase tracking-wider text-gray-600">{t.sub}</span>
            </button>
          ))}
        </nav>

        <main className="settings-scroll-outer min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8">
          {activeTab === 'api' && (
            <div className="mx-auto max-w-[1600px] space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                <section className="glass-panel animate-border-pulse xl:col-span-12 p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-gray-300">01 — Provider lattice</h2>
                    <span className="font-mono text-[10px] text-gray-600">OPENAI-COMPAT + ANTHROPIC</span>
                  </div>
                  <p className="mb-3 text-xs text-gray-500">
                    OpenAI-compatible: same SDK shape (base URL + key + model). Anthropic uses native Claude API.{' '}
                    <span className="text-gray-400">
                      <strong className="text-gray-300">No 3rd-party mic key</strong> when chat provider is{' '}
                      <strong className="text-gray-300">Groq</strong>, <strong className="text-gray-300">OpenAI</strong>, <strong className="text-gray-300">Together</strong> (Whisper),{' '}
                      <strong className="text-gray-300">Mistral</strong> (Voxtral), or <strong className="text-gray-300">Fireworks</strong> (Whisper on audio*.api.fireworks.ai — same API key). Everyone else needs the fallback OpenAI/Groq key for mic chunks.
                    </span>
                  </p>
                  <div className="settings-scroll max-h-[220px] overflow-y-auto pr-0.5">
                    <div className="flex flex-wrap gap-2">
                      {providerMeta.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setProvider(p.id)
                            save('provider', p.id)
                            setTestResult(null)
                            setSecretInput('')
                          }}
                          className="min-w-[130px] max-w-[200px] flex-1 rounded-xl border px-3 py-3 text-left transition-all duration-300"
                          style={{
                            background:
                              provider === p.id
                                ? `linear-gradient(145deg, ${p.color}22, rgba(0,0,0,0.42))`
                                : 'linear-gradient(165deg, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.48) 100%)',
                            borderColor: provider === p.id ? `${p.color}70` : 'rgba(255,255,255,0.1)',
                            boxShadow:
                              provider === p.id
                                ? `0 0 26px -8px ${p.color}55, inset 0 1px 0 ${p.color}22`
                                : 'inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 28px -18px rgba(0,0,0,0.55)',
                          }}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-display text-xs font-bold leading-tight text-white">{p.label}</span>
                            <span className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase" style={{ background: `${p.color}28`, color: p.color }}>
                              {p.badge}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-gray-500">{p.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="glass-panel xl:col-span-12 p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-gray-300">02 — Credentials & model</h2>
                    {currentMeta?.docs && (
                      <a href={currentMeta.docs} target="_blank" rel="noreferrer" className="text-xs font-medium hover:underline" style={{ color: currentMeta.color }}>
                        Get API key →
                      </a>
                    )}
                  </div>

                  {!snap || !currentMeta ? (
                    <p className="text-sm text-gray-500">Loading providers…</p>
                  ) : (
                    <div className="space-y-4">
                      {currentMeta.kind === 'anthropic' && (
                        <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90">
                          Claude uses the Anthropic Messages API (not OpenAI). Paste an Anthropic API key; model id must match your account (e.g. claude-3-5-sonnet-20241022).
                        </p>
                      )}

                      {currentMeta.usesCustomBase && (
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-mist-400">OpenAI-compatible base URL</label>
                          <input
                            type="url"
                            value={snap.customOpenaiBaseUrl || ''}
                            onChange={(e) => patchSnap('customOpenaiBaseUrl', e.target.value)}
                            onBlur={(e) => save('customOpenaiBaseUrl', e.target.value.trim())}
                            className="input-shadow w-full px-3 py-2.5 font-mono text-xs"
                            placeholder="https://api.openai.com/v1  or  Azure …/openai/deployments/…"
                          />
                          <p className="mt-1 text-[10px] text-gray-600">
                            Trailing slash optional. For Azure / LiteLLM / local vLLM, paste the root that ends with <code className="text-gray-400">/v1</code> (or your proxy’s chat path).
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <input
                          type="password"
                          value={secretInput}
                          onChange={(e) => setSecretInput(e.target.value)}
                          placeholder={keyField && keySetMap[keyField] ? '••••••••' : 'Paste API key'}
                          className="input-shadow min-w-[200px] flex-1 px-3 py-2.5"
                        />
                        <button type="button" onClick={testApi} disabled={testing} className="btn-ghost px-4 py-2.5 text-accent">
                          {testing ? '…' : 'Ping'}
                        </button>
                        <button type="button" onClick={() => keyField && saveKey(keyField, secretInput)} className="btn-ghost px-4 py-2.5">
                          Commit
                        </button>
                      </div>

                      {modelField && mergedChatOptions.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-end gap-2">
                            <div className="min-w-[min(100%,320px)] flex-1">
                              <ModelSelect
                                label={`Chat model (${mergedChatOptions.length} ids — app catalog${remoteChatModels?.length ? ' + API' : ''})`}
                                value={modelValue || currentMeta?.defaultModel || mergedChatOptions[0]}
                                models={mergedChatOptions}
                                listbox={mergedChatOptions.length > 14}
                                onChange={(v) => {
                                  patchSnap(modelField, v)
                                  save(modelField, v)
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={syncRemoteModels}
                              disabled={listModelsLoading}
                              className="btn-ghost whitespace-nowrap px-4 py-2.5 text-xs"
                            >
                              {listModelsLoading ? 'Syncing…' : 'Refresh from API'}
                            </button>
                          </div>
                          {listModelsErr ? <p className="text-xs text-amber-400">{listModelsErr}</p> : null}
                          <p className="text-[10px] text-gray-600">
                            Bundled lists are curated from each vendor’s docs. <strong className="text-gray-400">Refresh from API</strong> calls GET /v1/models (OpenAI-compatible), public OpenRouter, or Anthropic /v1/models — save your key first where required.
                          </p>
                        </div>
                      )}

                      {modelField && mergedChatOptions.length === 0 && (
                        <ModelInput
                          label="Model ID (catalog loading…)"
                          value={modelValue}
                          onChange={(v) => patchSnap(modelField, v)}
                          onCommit={(v) => save(modelField, v)}
                          suggestions={currentMeta?.defaultModel ? [currentMeta.defaultModel] : []}
                          hint="If this stays empty, restart settings — or type an id from the vendor console."
                        />
                      )}

                      {provider === 'groq' && (
                        <ModelSelect
                          label="Whisper (speech-to-text, same Groq key)"
                          value={snap.groqWhisperModel || 'whisper-large-v3-turbo'}
                          models={GROQ_WHISPER}
                          onChange={(v) => {
                            patchSnap('groqWhisperModel', v)
                            save('groqWhisperModel', v)
                          }}
                        />
                      )}

                      {provider === 'together' && (
                        <ModelSelect
                          label="Speech-to-text (Together Whisper — same API key)"
                          value={snap.togetherWhisperModel || 'openai/whisper-large-v3'}
                          models={TOGETHER_WHISPER_MODELS}
                          onChange={(v) => {
                            patchSnap('togetherWhisperModel', v)
                            save('togetherWhisperModel', v)
                          }}
                        />
                      )}

                      {provider === 'mistral' && (
                        <ModelSelect
                          label="Speech-to-text (Mistral Voxtral — same API key)"
                          value={snap.mistralSttModel || 'voxtral-mini-latest'}
                          models={MISTRAL_STT_MODELS}
                          onChange={(v) => {
                            patchSnap('mistralSttModel', v)
                            save('mistralSttModel', v)
                          }}
                        />
                      )}

                      {provider === 'fireworks' && (
                        <ModelSelect
                          label="Speech-to-text (Fireworks Whisper — same API key, separate audio host)"
                          value={snap.fireworksSttModel || 'whisper-v3-turbo'}
                          models={FIREWORKS_STT_MODELS}
                          onChange={(v) => {
                            patchSnap('fireworksSttModel', v)
                            save('fireworksSttModel', v)
                          }}
                        />
                      )}

                      {needsAudioFallback && sttPolicy?.vendorNotes?.[provider] && (
                        <p className="rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2 text-[10px] leading-relaxed text-gray-500">
                          <span className="font-semibold text-gray-400">Why mic needs a fallback key: </span>
                          {sttPolicy.vendorNotes[provider]}
                        </p>
                      )}

                      {needsAudioFallback && (
                        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-mist-400">Mic transcription fallback</label>
                          <p className="mb-2 text-xs text-gray-500">
                            This vendor doesn’t expose OpenAI-style STT on the same key — add an OpenAI or Groq key for mic transcription (Whisper).
                          </p>
                          <input
                            type="password"
                            value={audioFallbackKey}
                            onChange={(e) => setAudioFallbackKey(e.target.value)}
                            placeholder="sk-... or gsk_..."
                            className="input-shadow mb-2 w-full px-3 py-2"
                          />
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => audioFallbackKey.trim() && save('audioFallbackKey', audioFallbackKey.trim())} className="btn-ghost px-3 py-2 text-xs">
                              Save fallback key
                            </button>
                            <select
                              value={audioFallbackProvider}
                              onChange={(e) => {
                                setAudioFallbackProvider(e.target.value)
                                save('audioFallbackProvider', e.target.value)
                              }}
                              className="input-shadow px-3 py-2 text-xs"
                            >
                              <option value="openai" className="bg-void-900">OpenAI</option>
                              <option value="groq" className="bg-void-900">Groq</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {testResult && (
                        <p className={`font-mono text-xs ${testResult.success ? 'text-accent' : 'text-rose-400'}`}>
                          {testResult.success ? '◆ Uplink verified' : testResult.error}
                        </p>
                      )}
                      <button type="button" onClick={testApi} disabled={testing} className="btn-glow py-3 px-8">
                        {testing ? 'Handshaking…' : 'Full connection test'}
                      </button>
                    </div>
                  )}
                </section>
              </div>

              {showSetupBanner && (
                <button type="button" onClick={launchFromSetup} className="btn-glow w-full py-4 text-base">
                  Launch ShadowAssist
                </button>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="mx-auto max-w-[1600px] animate-fade-in space-y-5">
              <div>
                <h2 className="font-display text-xl font-bold text-white">Shadow profile</h2>
                <p className="mt-1 max-w-3xl text-sm text-mist-500">
                  <strong className="text-gray-300">Persona</strong> defines how the AI sounds. <strong className="text-gray-300">Profile</strong> + <strong className="text-gray-300">notes / JD</strong> ground suggestions in your background and team context for meetings.
                </p>
              </div>

              <section className="glass-panel p-6">
                <h3 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-gray-300">Persona stream</h3>
                <p className="mt-1 text-xs text-gray-500">How the whisper should behave — merged with resume/JD on every ask.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {PROMPT_PRESETS.map((p) => (
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
                  onBlur={() => save('systemPrompt', systemPrompt)}
                  rows={8}
                  className="input-shadow mt-4 min-h-[160px] w-full resize-y px-3 py-3 font-mono text-xs leading-relaxed"
                  placeholder="How should the AI behave in your ear?"
                />
                <p className="mt-2 text-[10px] text-gray-600">Saved when you leave this field.</p>
              </section>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <section className="glass-panel p-6">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-sm font-bold uppercase tracking-widest text-phantom-300">Resume ingest</h3>
                      <p className="mt-1 text-xs text-gray-500">PDF or plain text — parsed locally until you send a question to the AI.</p>
                    </div>
                    <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-accent">CV</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={pickResumeFile} disabled={resumeParsing} className="btn-glow px-5 py-2.5 text-sm">
                      {resumeParsing ? 'Parsing…' : 'Upload resume'}
                    </button>
                    {(resumeContext || resumeSourceName) && (
                      <button type="button" onClick={clearResume} className="btn-ghost border-rose-500/20 px-4 py-2.5 text-sm text-rose-300 hover:bg-rose-500/10">
                        Clear
                      </button>
                    )}
                  </div>

                  {resumeError && <p className="mt-3 text-sm text-rose-400">{resumeError}</p>}

                  <div className="mt-5 rounded-xl border border-white/[0.06] bg-black/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-gray-500">Source</span>
                      <span className="font-mono text-accent/90">{resumeSourceName || '— none —'}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-gray-500">Characters stored</span>
                      <span className="font-mono text-gray-300">
                        {resumeContext.length.toLocaleString()} / {RESUME_TEXT_MAX.toLocaleString()}
                      </span>
                    </div>
                    {resumeContext ? (
                      <pre className="settings-scroll mt-4 max-h-48 overflow-auto rounded-lg border border-white/5 bg-void-950/80 p-3 font-mono text-[10px] leading-relaxed text-gray-500">
                        {resumeContext.slice(0, 1200)}
                        {resumeContext.length > 1200 ? '\n…' : ''}
                      </pre>
                    ) : (
                      <p className="mt-4 text-xs italic text-gray-600">No profile loaded — upload for stronger meeting context (optional).</p>
                    )}
                  </div>
                </section>

                <section className="glass-panel p-6">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-sm font-bold uppercase tracking-widest text-sky-300/90">Role / JD / focus</h3>
                      <p className="mt-1 text-xs text-gray-500">Job description, stack, or notes — optional alone, best with resume.</p>
                    </div>
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-sky-300">JD</span>
                  </div>
                  <textarea
                    value={jdContext}
                    onChange={(e) => setJdContext(e.target.value.slice(0, JD_TEXT_MAX))}
                    onBlur={() => save('jdContext', jdContext.slice(0, JD_TEXT_MAX))}
                    rows={14}
                    className="input-shadow min-h-[280px] w-full resize-y px-3 py-3 text-sm leading-relaxed"
                    placeholder="e.g. Senior backend at FinCo — Kotlin, Kafka, AWS…"
                  />
                  <p className="mt-2 text-[10px] text-gray-600">
                    {jdContext.length.toLocaleString()} / {JD_TEXT_MAX.toLocaleString()} — saved on blur.
                  </p>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'display' && (
            <div className="mx-auto max-w-3xl animate-fade-in space-y-5">
              <section className="glass-panel p-8">
                <h2 className="font-display text-lg font-bold text-white">Overlay display</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Tune the floating panel: transparency, answer text size, default window size, and snap position on your primary display. Changes apply immediately when the overlay is visible.
                </p>

                <div className="mt-8 space-y-8">
                  <div>
                    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-mist-400">
                      Accent color
                    </label>
                    <p className="mb-3 text-xs text-gray-600">
                      Saturated neon ramps for the overlay — mic, code blocks, scroll chrome. Default stays the original green.
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                      {UI_ACCENT_THEMES.map((t) => {
                        const [r, g, b] = t.main
                        const [lr, lg, lb] = t.light
                        const active = uiAccentThemeId === t.id
                        return (
                          <button
                            key={t.id}
                            type="button"
                            title={t.label}
                            onClick={() => applyUiAccent(t.id)}
                            className={`group relative flex flex-col items-center gap-2.5 overflow-hidden rounded-2xl border px-2 pb-3 pt-3 text-center transition-all duration-300 ${
                              active
                                ? 'border-accent/50 bg-gradient-to-b from-accent/20 via-accent/8 to-transparent shadow-[0_0_40px_-12px_rgb(var(--accent-rgb)/0.55)] ring-1 ring-accent/35'
                                : 'border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.02] hover:border-white/15 hover:shadow-[0_12px_40px_-20px_rgb(0,0,0,0.6)]'
                            }`}
                          >
                            <span
                              className="relative h-11 w-11 rounded-full ring-2 ring-white/15 transition-transform duration-300 group-hover:scale-105"
                              style={{
                                background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55), transparent 42%), linear-gradient(155deg, rgb(${lr},${lg},${lb}) 0%, rgb(${r},${g},${b}) 55%, rgb(${t.mid[0]},${t.mid[1]},${t.mid[2]}) 100%)`,
                                boxShadow: `0 0 22px rgba(${r},${g},${b},0.55), inset 0 2px 5px rgba(255,255,255,0.35)`,
                              }}
                            />
                            <span
                              className={`font-display text-[10px] font-semibold uppercase tracking-wide ${
                                active ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
                              }`}
                            >
                              {t.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-mist-400">Window opacity</label>
                      <span className="font-mono text-xs text-accent">{Math.round(overlayOpacityUi * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={35}
                      max={100}
                      value={Math.round(overlayOpacityUi * 100)}
                      onChange={(e) => applyOverlayOpacity(Number(e.target.value) / 100)}
                      className="h-2 w-full cursor-pointer accent-accent"
                    />
                    <p className="mt-2 text-[10px] text-gray-600">
                      Affects the whole overlay window (Electron) and the glass panel tint. Minimum 35% so the window stays usable.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-mist-400">Answer text size</label>
                    <div className="flex flex-wrap gap-2">
                      {['small', 'medium', 'large'].map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => applyOverlayFont(sz)}
                          className={`settings-chip settings-chip-sm ${overlayFontUi === sz ? 'settings-chip-active' : ''}`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-mist-400">Panel size (expanded)</label>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="min-w-[100px] flex-1">
                        <span className="mb-1 block text-[10px] text-gray-600">Width (280–860)</span>
                        <input
                          type="number"
                          min={280}
                          max={860}
                          value={overlayW}
                          onChange={(e) => setOverlayW(Number(e.target.value) || 280)}
                          className="input-shadow w-full px-3 py-2.5 font-mono text-xs"
                        />
                      </div>
                      <div className="min-w-[100px] flex-1">
                        <span className="mb-1 block text-[10px] text-gray-600">Height (180–940)</span>
                        <input
                          type="number"
                          min={180}
                          max={940}
                          value={overlayH}
                          onChange={(e) => setOverlayH(Number(e.target.value) || 180)}
                          className="input-shadow w-full px-3 py-2.5 font-mono text-xs"
                        />
                      </div>
                      <button type="button" onClick={applyOverlaySize} className="btn-glow shrink-0 px-5 py-2.5 text-sm">
                        Apply size
                      </button>
                    </div>
                    <p className="mt-2 text-[10px] text-gray-600">You can still drag resize handles on the overlay; this sets the stored default and resizes the window now.</p>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-mist-400">Snap position (primary monitor)</label>
                    <div className="flex flex-wrap gap-2">
                      {OVERLAY_POSITION_PRESETS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => snapOverlayToPreset(p)}
                          className="settings-chip settings-chip-sm !normal-case"
                        >
                          {p.replace(/-/g, ' ')}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] text-gray-600">Uses current width/height. Nudge with hotkeys: Ctrl+Arrow keys.</p>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'session' && (
            <div className="mx-auto max-w-3xl animate-fade-in">
              <section className="glass-panel p-8">
                <h2 className="font-display text-lg font-bold text-white">Field operations</h2>
                <p className="mt-1 text-sm text-gray-500">Capture pipelines for the overlay session.</p>
                <div className="mt-8 space-y-6">
                  <label className="settings-row-tile flex cursor-pointer items-center justify-between gap-4">
                    <div>
                      <span className="font-medium text-gray-200">Screen reading (OCR)</span>
                      <p className="text-xs text-gray-600">Periodic screen text for context</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={ocrEnabled}
                      onChange={(e) => {
                        setOcrEnabled(e.target.checked)
                        save('ocrEnabled', e.target.checked)
                      }}
                      className="h-5 w-5 rounded border-white/20 accent-accent"
                    />
                  </label>
                  <label className="settings-row-tile flex cursor-pointer items-center justify-between gap-4">
                    <div>
                      <span className="font-medium text-gray-200">Microphone / audio</span>
                      <p className="text-xs text-gray-600">Chunks for transcription</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={audioEnabled}
                      onChange={(e) => {
                        setAudioEnabled(e.target.checked)
                        save('audioEnabled', e.target.checked)
                      }}
                      className="h-5 w-5 rounded border-white/20 accent-accent"
                    />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-mist-400">OCR interval (ms)</label>
                      <input
                        type="number"
                        min={5000}
                        step={1000}
                        value={ocrInterval}
                        onChange={(e) => setOcrInterval(Number(e.target.value))}
                        onBlur={() => save('ocrInterval', ocrInterval)}
                        className="input-shadow w-full px-3 py-2.5"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-mist-400">Audio chunk (ms)</label>
                      <input
                        type="number"
                        min={2000}
                        step={500}
                        value={audioChunkSize}
                        onChange={(e) => setAudioChunkSize(Number(e.target.value))}
                        onBlur={() => save('audioChunkSize', audioChunkSize)}
                        className="input-shadow w-full px-3 py-2.5"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        const r = await ipc?.invoke('reset-session-timing-defaults')
                        if (!r) return
                        setOcrInterval(r.ocrInterval)
                        setAudioChunkSize(r.audioChunkSize)
                        patchSnap('ocrInterval', r.ocrInterval)
                        patchSnap('audioChunkSize', r.audioChunkSize)
                      }}
                      className="settings-chip !border-dashed !border-white/20 !px-5 !py-2.5 !text-[11px] !font-semibold !tracking-wide hover:!border-accent/45"
                    >
                      Reset OCR &amp; audio timing to defaults
                    </button>
                    <span className="text-[10px] text-gray-600">OCR 8000 ms · Audio chunk 5000 ms</span>
                  </div>
                  <p className="font-mono text-[10px] text-gray-600">
                    Ctrl+\ toggle · Ctrl+Enter ask · Ctrl+Shift+\ session · Ctrl+Shift+S settings
                  </p>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="mx-auto max-w-3xl animate-fade-in space-y-5">
              <section className="glass-panel p-8">
                <h2 className="font-display text-lg font-bold text-white">Privacy &amp; Data</h2>
                <p className="mt-1 text-sm text-indigo-200/70">Undetectable AI for live meetings — discreet on-screen assistance. You must disclose use where policies or participants require it.</p>
                <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                  Audio is never stored. Transcripts and OCR text used during a session are cleared automatically when your session ends or after extended inactivity. Session buffers stay in memory only.
                </p>
                <p className="mt-4 text-xs leading-relaxed text-zinc-500">
                  Your API keys are encrypted using Windows DPAPI (OS-level security) and never leave your device except when you call your chosen AI provider directly.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!ipc) return
                      if (!window.confirm('Delete all local ShadowAssist data and restart? This cannot be undone.')) return
                      await ipc.invoke('delete-all-data-relaunch')
                    }}
                    className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-5 py-2.5 text-sm font-semibold text-rose-200 hover:bg-rose-500/20"
                  >
                    Delete All My Data
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!ipc) return
                      const r = await ipc.invoke('export-user-data')
                      if (r?.ok && r.path) {
                        window.alert(`Exported to ${r.path}`)
                      }
                    }}
                    className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-5 py-2.5 text-sm font-semibold text-indigo-100 hover:bg-indigo-500/20"
                  >
                    Export My Data
                  </button>
                </div>
                <p className="mt-4 text-[10px] text-zinc-600">
                  Export includes profile text, consent record, and preferences — not API keys, raw audio, or live transcript buffers.
                </p>
              </section>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="mx-auto max-w-xl animate-fade-in text-center">
              <section className="glass-panel p-10">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-phantom-500/30 bg-gradient-to-br from-phantom-600/20 to-accent/10 shadow-glow">
                  <span className="font-display text-2xl font-bold text-white">S</span>
                </div>
                <h2 className="font-display text-2xl font-bold text-white">ShadowAssist</h2>
                <p className="mt-2 text-xs text-indigo-300/80">Undetectable AI for live meetings</p>
                <p className="mt-3 text-sm text-gray-400">Discreet on-screen meeting assistant — built for calls and live meetings only, not hiring interviews. Disclosure is your responsibility where required.</p>
                <p className="mt-6 text-xs text-gray-600">
                  Groq, OpenAI, Anthropic, DeepSeek, Kimi, Mistral, xAI, OpenRouter, Together, Perplexity, Gemini, Fireworks, Cerebras, NVIDIA NIM, or any OpenAI-compatible URL.
                </p>
              </section>
            </div>
          )}
        </main>
      </div>
      </div>
    </AppWindowFrame>
  )
}
