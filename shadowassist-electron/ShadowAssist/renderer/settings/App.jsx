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
const NVIDIA_STT_MODELS = ['parakeet-1.1b-rnnt-multilingual-asr']

/** Empty prompt = backend uses built-in `DEFAULT_SYSTEM_PROMPT` (lib/defaultSystemPrompt.js). */
const PROMPT_PRESETS = [
  { id: 'builtin', label: 'ShadowAssist (built-in)', prompt: '' },
  { id: 'meeting', label: 'Meeting', prompt: 'I am in a meeting. Help me understand, contribute, and summarize.' },
  { id: 'sync', label: 'Stand-up / sync', prompt: 'I am in a team stand-up or sync. Keep suggestions brief and action-oriented.' },
]

const save = (k, v) => ipc?.invoke('set-store', k, v)

/** Mirrors `lib/hotkeys.js` DEFAULT_HOTKEYS — used for reset + display. */
const DEFAULT_HOTKEYS_MAP = {
  toggleOverlay: 'CommandOrControl+\\',
  askAI: 'CommandOrControl+Return',
  clearChat: 'CommandOrControl+R',
  toggleSession: 'CommandOrControl+Shift+\\',
  moveUp: 'CommandOrControl+Up',
  moveDown: 'CommandOrControl+Down',
  moveLeft: 'CommandOrControl+Left',
  moveRight: 'CommandOrControl+Right',
  scrollUp: 'CommandOrControl+Shift+Up',
  scrollDown: 'CommandOrControl+Shift+Down',
  settings: 'CommandOrControl+Shift+S',
  copyResponse: 'CommandOrControl+Shift+C',
}

const HOTKEY_DEFS = [
  { action: 'toggleOverlay', label: 'Show / hide overlay' },
  { action: 'askAI', label: 'Ask AI (same as overlay send)' },
  { action: 'clearChat', label: 'Clear chat / session buffer' },
  { action: 'toggleSession', label: 'Start / stop listening session' },
  { action: 'settings', label: 'Open this settings window' },
  { action: 'copyResponse', label: 'Copy last assistant reply' },
  { action: 'moveUp', label: 'Nudge overlay up' },
  { action: 'moveDown', label: 'Nudge overlay down' },
  { action: 'moveLeft', label: 'Nudge overlay left' },
  { action: 'moveRight', label: 'Nudge overlay right' },
  { action: 'scrollUp', label: 'Scroll answers up' },
  { action: 'scrollDown', label: 'Scroll answers down' },
]

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

function formatMeetingWhen(iso) {
  if (!iso) return 'Unknown time'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString([], {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatSessionRange(startIso, endIso) {
  if (!startIso) return 'Unknown session'
  const s = new Date(startIso)
  const e = endIso ? new Date(endIso) : null
  if (Number.isNaN(s.getTime())) return String(startIso)
  const fmt = (d) =>
    d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  return `${fmt(s)} - ${e && !Number.isNaN(e.getTime()) ? fmt(e) : 'In progress'}`
}

function toDateKey(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateKeyLabel(dateKey) {
  if (!dateKey) return 'Unknown date'
  const d = new Date(`${dateKey}T00:00:00`)
  if (Number.isNaN(d.getTime())) return dateKey
  return d.toLocaleDateString([], {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function friendlyCalendarError(message) {
  const raw = String(message || '')
  const m = raw.toLowerCase()
  if (!raw) return ''
  if (m.includes('test user') || m.includes('access_denied') || m.includes('403')) {
    return 'Google blocked this email. Ask the app owner to add this email under OAuth consent screen -> Test users, or publish the app to Production.'
  }
  if (m.includes('timed out')) {
    return 'Google sign-in timed out. Keep the browser sign-in tab open and complete approval, then try again.'
  }
  if (m.includes('already in progress')) {
    return 'A Google sign-in is already running. Finish it in browser, or press Cancel connect.'
  }
  return raw
}

function parseSummaryBullets(text) {
  const lines = String(text || '')
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
  const bullets = lines
    .filter((x) => x.startsWith('- '))
    .map((x) =>
      x
        .replace(/^-+\s*/, '')
        .replace(/[*_`]/g, '')
        .trim(),
    )
  return bullets
}

const AmbientOrbs = memo(function AmbientOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden>
      <div className="absolute -left-[25%] top-[15%] h-[280px] w-[280px] rounded-full bg-accent/6 blur-[100px]" />
      <div className="absolute -right-[20%] bottom-[10%] h-[240px] w-[240px] rounded-full bg-white/[0.04] blur-[90px]" />
    </div>
  )
})

const ModelSelect = memo(function ModelSelect({ label, value, models, onChange, listbox }) {
  const [filter, setFilter] = useState('')
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return models
    return models.filter((m) => m.toLowerCase().includes(q))
  }, [models, filter])
  const display = filtered.length ? filtered : models
  const safeVal = display.includes(value) ? value : display[0] || ''
  const n = display.length
  const size = listbox && n > 1 ? Math.min(22, Math.max(5, n)) : undefined
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-mist-400">{label}</label>
      {listbox && models.length > 14 ? (
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter models (e.g. gpt-5.4, claude-opus)…"
          className="input-shadow mb-2 w-full px-3 py-2 font-mono text-xs"
          autoComplete="off"
        />
      ) : null}
      <select
        value={safeVal}
        size={size}
        onChange={(e) => onChange(e.target.value)}
        className={`input-shadow w-full px-3 py-2 font-mono text-xs ${size ? 'min-h-0' : 'py-2.5'}`}
      >
        {display.map((m) => (
          <option key={m} value={m} className="bg-void-900">
            {m}
          </option>
        ))}
      </select>
      {filter.trim() && !filtered.length ? (
        <p className="mt-1 text-[10px] text-amber-400">No match — clear filter or type the id below.</p>
      ) : null}
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
  const [sttProvider, setSttProvider] = useState('groq')
  const [secretByProvider, setSecretByProvider] = useState({})
  const [sttSecretInput, setSttSecretInput] = useState('')
  const [keySetMap, setKeySetMap] = useState({})
  const [systemPrompt, setSystemPrompt] = useState('')
  const [testByProvider, setTestByProvider] = useState({})
  const [testingProvider, setTestingProvider] = useState(null)
  const [activeTab, setActiveTab] = useState('profile')
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true)
  const [ocrEnabled, setOcrEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [micListenLanguage, setMicListenLanguage] = useState('en_hi_hinglish')
  const [micSensitivity, setMicSensitivity] = useState('standard')
  const [sttMode, setSttMode] = useState('local')
  const [assistAutoTrigger, setAssistAutoTrigger] = useState(false)
  const [googleCalendarClientId, setGoogleCalendarClientId] = useState('')
  const [googleCalendarClientSecret, setGoogleCalendarClientSecret] = useState('')
  const [googleCalendarConnectedEmail, setGoogleCalendarConnectedEmail] = useState('')
  const [googleCalendarOAuthReady, setGoogleCalendarOAuthReady] = useState(false)
  const [googleCalendarUsingEmbeddedOAuth, setGoogleCalendarUsingEmbeddedOAuth] = useState(false)
  const [calendarConnectBusy, setCalendarConnectBusy] = useState(false)
  const [calendarEventsLoading, setCalendarEventsLoading] = useState(false)
  const [calendarErr, setCalendarErr] = useState('')
  const [calendarMeetings, setCalendarMeetings] = useState([])
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('')
  const [calendarRemindersEnabled, setCalendarRemindersEnabled] = useState(true)
  const [calendarReminderMinutes, setCalendarReminderMinutes] = useState(5)
  const [meetingForegroundDetectionEnabled, setMeetingForegroundDetectionEnabled] = useState(true)
  const [listenSummaries, setListenSummaries] = useState([])
  const [selectedSummaryId, setSelectedSummaryId] = useState('')
  const [resumeContext, setResumeContext] = useState('')
  const [resumeSourceName, setResumeSourceName] = useState('')
  const [jdContext, setJdContext] = useState('')
  const [resumeParsing, setResumeParsing] = useState(false)
  const [resumeError, setResumeError] = useState(null)

  const [modelCatalog, setModelCatalog] = useState({})
  const [sttPolicy, setSttPolicy] = useState(null)
  const [remoteModelsByProvider, setRemoteModelsByProvider] = useState({})
  const [modelListSourceByProvider, setModelListSourceByProvider] = useState({})
  const [listModelsLoadingId, setListModelsLoadingId] = useState(null)
  const [listModelsErrByProvider, setListModelsErrByProvider] = useState({})

  const [overlayOpacityUi, setOverlayOpacityUi] = useState(0.92)
  const [overlayFontUi, setOverlayFontUi] = useState('medium')
  const [answerStyleUi, setAnswerStyleUi] = useState('brief')
  const [overlayAnswerViewUi, setOverlayAnswerViewUi] = useState('latest')
  const [overlayTeleprompterUi, setOverlayTeleprompterUi] = useState(false)
  const [overlayFocusModeUi, setOverlayFocusModeUi] = useState(false)
  const [overlayW, setOverlayW] = useState(400)
  const [overlayH, setOverlayH] = useState(540)
  const [uiAccentThemeId, setUiAccentThemeId] = useState('neon')
  const [hotkeysMap, setHotkeysMap] = useState(() => ({ ...DEFAULT_HOTKEYS_MAP }))

  const sttCapableMeta = useMemo(() => {
    const ids = sttPolicy?.nativeSttProviderIds || ['groq', 'openai', 'together', 'mistral', 'fireworks', 'nvidia']
    return providerMeta.filter((p) => ids.includes(p.id))
  }, [providerMeta, sttPolicy])
  const currentSttMeta = useMemo(
    () => sttCapableMeta.find((p) => p.id === sttProvider) || sttCapableMeta[0],
    [sttCapableMeta, sttProvider],
  )

  useEffect(() => {
    if (!ipc) return
    Promise.all([ipc.invoke('get-all-settings'), ipc.invoke('get-provider-metadata'), ipc.invoke('get-hotkeys')])
      .then(([s, meta, hk]) => {
        setSnap(s)
        setProviderMeta(meta || [])
        const chatProv = s.provider || 'groq'
        setProvider(chatProv)
        setSttProvider(s.sttProvider || s.provider || 'groq')
        setSystemPrompt(s.systemPrompt || '')
        setHasCompletedOnboarding(!!s.hasCompletedOnboarding)
        setOcrEnabled(s.ocrEnabled !== false)
        setAudioEnabled(s.audioEnabled !== false)
        const ml = s.micListenLanguage
        setMicListenLanguage(ml === 'en' || ml === 'hi' || ml === 'en_hi_hinglish' ? ml : 'en_hi_hinglish')
        setMicSensitivity(s.micSensitivity === 'boost' ? 'boost' : 'standard')
        setSttMode(s.sttMode === 'cloud' ? 'cloud' : 'local')
        setAssistAutoTrigger(s.assistAutoTrigger === true)
        setGoogleCalendarClientId(s.googleCalendarClientId || '')
        setGoogleCalendarClientSecret(s.googleCalendarClientSecret ? '••••••••' : '')
        setGoogleCalendarConnectedEmail(s.googleCalendarConnectedEmail || '')
        setCalendarRemindersEnabled(s.calendarRemindersEnabled !== false)
        setMeetingForegroundDetectionEnabled(s.meetingForegroundDetectionEnabled !== false)
        setCalendarReminderMinutes(
          Number.isFinite(Number(s.calendarReminderMinutes))
            ? Math.max(0, Number(s.calendarReminderMinutes))
            : 5,
        )
        setResumeContext(s.resumeContext || '')
        setResumeSourceName(s.resumeSourceName || '')
        setJdContext(s.jdContext || '')
        const ob = s.overlayBounds || {}
        setOverlayOpacityUi(typeof s.overlayOpacity === 'number' ? s.overlayOpacity : 0.92)
        setOverlayFontUi(s.overlayFontSize || 'medium')
        setAnswerStyleUi(s.answerStyle === 'detailed' ? 'detailed' : 'brief')
        setOverlayAnswerViewUi(s.overlayAnswerView === 'history' ? 'history' : 'latest')
        setOverlayTeleprompterUi(s.overlayTeleprompter === true)
        setOverlayFocusModeUi(s.overlayFocusMode === true)
        setOverlayW(ob.width || 480)
        setOverlayH(ob.height || 580)
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
        if (hk && typeof hk === 'object') {
          setHotkeysMap((prev) => ({ ...prev, ...hk }))
        }
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

  const refreshCalendarMeetings = async () => {
    if (!ipc) return
    setCalendarErr('')
    setCalendarEventsLoading(true)
    try {
      const status = await ipc.invoke('google-calendar:get-status')
      setGoogleCalendarConnectedEmail(status?.connectedEmail || '')
      setGoogleCalendarOAuthReady(status?.oauthReady === true)
      setGoogleCalendarUsingEmbeddedOAuth(status?.usingEmbeddedOAuth === true)
      if (!status?.connected) {
        setCalendarMeetings([])
        return
      }
      const res = await ipc.invoke('google-calendar:list-upcoming')
      if (!res?.ok) throw new Error(res?.error || 'Could not load meetings')
      const meetings = Array.isArray(res.meetings) ? res.meetings : []
      setCalendarMeetings(meetings)
      if (!selectedCalendarDate) {
        const firstDate = toDateKey(meetings[0]?.start)
        if (firstDate) setSelectedCalendarDate(firstDate)
      }
    } catch (e) {
      setCalendarErr(e?.message || 'Could not load meetings')
    } finally {
      setCalendarEventsLoading(false)
    }
  }

  const refreshListenSummaries = async () => {
    if (!ipc) return
    try {
      const rows = await ipc.invoke('listen-session-summaries:get')
      const list = Array.isArray(rows) ? rows : []
      setListenSummaries(list)
      if (!selectedSummaryId && list[0]?.id) setSelectedSummaryId(list[0].id)
      if (selectedSummaryId && !list.find((x) => x.id === selectedSummaryId)) {
        setSelectedSummaryId(list[0]?.id || '')
      }
    } catch {}
  }

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

  useEffect(() => {
    if (isFirstRunWindow) setActiveTab('session')
  }, [isFirstRunWindow])

  useEffect(() => {
    if (!ipc) return
    const unsub = ipc.on('listen-session-summaries:update', () => {
      void refreshListenSummaries()
    })
    return () => unsub?.()
  }, [])

  useEffect(() => {
    void refreshCalendarMeetings()
  }, [])

  useEffect(() => {
    void refreshListenSummaries()
  }, [])

  const showSetupBanner = isFirstRunWindow && !hasCompletedOnboarding

  const saveKey = (storeKey, val, providerId) => {
    if (!val?.trim()) return
    save(storeKey, val.trim())
    if (providerId) {
      setSecretByProvider((m) => {
        const next = { ...m }
        delete next[providerId]
        return next
      })
    }
    setSttSecretInput('')
    setKeySetMap((k) => ({ ...k, [storeKey]: true }))
    if (providerId) void syncRemoteModelsFor(providerId)
  }

  const chatOptionsFor = (pId) => {
    const source = modelListSourceByProvider[pId]
    const fromApi = remoteModelsByProvider[pId]
    if (source !== 'api' || !fromApi?.length) return []
    return fromApi
  }

  const selectChatProvider = (pId) => {
    if (!pId || pId === provider) return
    setProvider(pId)
    save('provider', pId)
    setTestByProvider((t) => {
      const n = { ...t }
      delete n[pId]
      return n
    })
    const meta = providerMeta.find((p) => p.id === pId)
    if (meta?.keyField && keySetMap[meta.keyField]) {
      void syncRemoteModelsFor(pId)
    }
  }

  const patchSnap = (key, value) => {
    setSnap((s) => (s ? { ...s, [key]: value } : s))
  }

  const getKeyForProvider = async (pId) => {
    const meta = providerMeta.find((p) => p.id === pId)
    const field = meta?.keyField
    if (!field) return ''
    const local = (secretByProvider[pId] || '').trim()
    const stored = await ipc?.invoke('get-store', field)
    return local || stored
  }

  const testApiFor = async (pId) => {
    const key = await getKeyForProvider(pId)
    if (!key) {
      setTestByProvider((t) => ({ ...t, [pId]: { success: false, error: 'Enter or save API key first' } }))
      return
    }
    setTestingProvider(pId)
    setTestByProvider((t) => {
      const n = { ...t }
      delete n[pId]
      return n
    })
    const r = await ipc.invoke('test-api', pId, key)
    setTestByProvider((t) => ({ ...t, [pId]: r }))
    setTestingProvider(null)
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

  const syncRemoteModelsFor = async (pId) => {
    if (!ipc) return
    setListModelsLoadingId(pId)
    setListModelsErrByProvider((e) => ({ ...e, [pId]: '' }))
    try {
      const res = await ipc.invoke('list-remote-models', pId)
      if (res.ok && res.source === 'api' && res.models?.length) {
        setRemoteModelsByProvider((m) => ({ ...m, [pId]: res.models }))
        setModelListSourceByProvider((m) => ({ ...m, [pId]: 'api' }))
      } else {
        setRemoteModelsByProvider((m) => ({ ...m, [pId]: [] }))
        setModelListSourceByProvider((m) => ({ ...m, [pId]: 'static' }))
      }
      setListModelsErrByProvider((e) => ({
        ...e,
        [pId]: res.error || (res.ok ? '' : 'No models returned'),
      }))
    } catch (err) {
      setListModelsErrByProvider((e) => ({ ...e, [pId]: err.message || 'Sync failed' }))
    } finally {
      setListModelsLoadingId(null)
    }
  }

  useEffect(() => {
    if (!snap || !providerMeta.length) return
    const meta = providerMeta.find((p) => p.id === provider)
    if (meta?.keyField && keySetMap[meta.keyField]) {
      void syncRemoteModelsFor(provider)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate model list when provider/key ready
  }, [snap, provider, providerMeta.length])

  const clearResume = async () => {
    await save('resumeContext', '')
    await save('resumeSourceName', '')
    setResumeContext('')
    setResumeSourceName('')
    setResumeError(null)
  }

  const tabs = [
    { id: 'profile', label: 'Profile', sub: 'Prompt & context' },
    { id: 'display', label: 'Display', sub: 'Overlay layout' },
    { id: 'meetings', label: 'Meetings', sub: 'Calendar & detection' },
    { id: 'session', label: 'Session', sub: 'Chat, STT & capture' },
    { id: 'privacy', label: 'Privacy', sub: 'Data on this device' },
    { id: 'about', label: 'About', sub: 'Version & info' },
  ]

  const connectGoogleCalendar = async () => {
    if (!ipc) return
    setCalendarErr('')
    setCalendarConnectBusy(true)
    try {
      const id = String(googleCalendarClientId || '').trim()
      const secret = String(googleCalendarClientSecret || '').trim()
      if (!googleCalendarOAuthReady && (!id || !secret || secret === '••••••••')) {
        throw new Error('Enter Google Calendar client ID and client secret first')
      }
      if (!googleCalendarOAuthReady) {
        await save('googleCalendarClientId', id)
        await save('googleCalendarClientSecret', secret)
      }
      const res = await ipc.invoke('google-calendar:connect')
      setGoogleCalendarConnectedEmail(res?.connectedEmail || '')
      setGoogleCalendarClientSecret('••••••••')
      await refreshCalendarMeetings()
    } catch (e) {
      setCalendarErr(friendlyCalendarError(e?.message || 'Google Calendar connect failed'))
    } finally {
      setCalendarConnectBusy(false)
    }
  }

  const selectedSummary = listenSummaries.find((s) => s.id === selectedSummaryId) || null
  const meetingsByDate = useMemo(() => {
    const map = new Map()
    for (const m of calendarMeetings) {
      const key = toDateKey(m.start) || 'unknown'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(m)
    }
    return map
  }, [calendarMeetings])
  const availableDateKeys = useMemo(
    () => [...meetingsByDate.keys()].filter((k) => k !== 'unknown').sort(),
    [meetingsByDate],
  )
  const effectiveDateKey = selectedCalendarDate || availableDateKeys[0] || ''
  const meetingsForSelectedDate = effectiveDateKey ? meetingsByDate.get(effectiveDateKey) || [] : []
  const summaryBullets = parseSummaryBullets(selectedSummary?.llmSummary?.text || '')

  const cancelGoogleCalendarConnect = async () => {
    if (!ipc) return
    try {
      await ipc.invoke('google-calendar:cancel-connect')
    } catch {}
    setCalendarConnectBusy(false)
    setCalendarErr('Google sign-in cancelled.')
  }

  const disconnectGoogleCalendar = async () => {
    if (!ipc) return
    setCalendarErr('')
    setCalendarConnectBusy(true)
    try {
      await ipc.invoke('google-calendar:disconnect')
      setGoogleCalendarConnectedEmail('')
      setCalendarMeetings([])
    } catch (e) {
      setCalendarErr(friendlyCalendarError(e?.message || 'Disconnect failed'))
    } finally {
      setCalendarConnectBusy(false)
    }
  }

  const clearMeetingSummaries = async () => {
    if (!ipc) return
    const ok = window.confirm('Clear all past meeting summaries? This cannot be undone.')
    if (!ok) return
    try {
      await ipc.invoke('listen-session-summaries:clear')
      await refreshListenSummaries()
    } catch {}
  }

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

  const applyAnswerStyle = async (v) => {
    const next = v === 'detailed' ? 'detailed' : 'brief'
    setAnswerStyleUi(next)
    patchSnap('answerStyle', next)
    await save('answerStyle', next)
    await ipc?.invoke('apply-overlay-display', { answerStyle: next })
  }

  const applyOverlayAnswerView = async (v) => {
    const next = v === 'history' ? 'history' : 'latest'
    setOverlayAnswerViewUi(next)
    patchSnap('overlayAnswerView', next)
    await save('overlayAnswerView', next)
    await ipc?.invoke('apply-overlay-display', { overlayAnswerView: next })
  }

  const applyOverlayTeleprompter = async (v) => {
    setOverlayTeleprompterUi(!!v)
    patchSnap('overlayTeleprompter', !!v)
    await save('overlayTeleprompter', !!v)
    await ipc?.invoke('apply-overlay-display', { overlayTeleprompter: !!v })
  }

  const applyOverlayFocusMode = async (v) => {
    setOverlayFocusModeUi(!!v)
    patchSnap('overlayFocusMode', !!v)
    await save('overlayFocusMode', !!v)
    await ipc?.invoke('apply-overlay-display', { overlayFocusMode: !!v })
  }

  const applyOpacityPreset = async (pct) => {
    const v = Math.min(1, Math.max(0.35, pct / 100))
    await applyOverlayOpacity(v)
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

  const commitHotkey = async (action, raw) => {
    if (!ipc) return
    const fallback = DEFAULT_HOTKEYS_MAP[action]
    if (!fallback) return
    let v = String(raw ?? '').trim()
    if (!v) v = fallback
    try {
      await ipc.invoke('update-hotkey', action, v)
      setHotkeysMap((m) => ({ ...m, [action]: v }))
    } catch (e) {
      console.warn('update-hotkey', e)
    }
  }

  const resetOneHotkey = async (action) => {
    const d = DEFAULT_HOTKEYS_MAP[action]
    if (!ipc || !d) return
    await ipc.invoke('update-hotkey', action, d)
    setHotkeysMap((m) => ({ ...m, [action]: d }))
  }

  const resetAllHotkeys = async () => {
    if (!ipc) return
    for (const action of Object.keys(DEFAULT_HOTKEYS_MAP)) {
      await ipc.invoke('update-hotkey', action, DEFAULT_HOTKEYS_MAP[action])
    }
    setHotkeysMap({ ...DEFAULT_HOTKEYS_MAP })
  }

  const OVERLAY_POSITION_PRESETS = ['Top-Right', 'Top-Left', 'Bottom-Right', 'Bottom-Left', 'Center-Right']

  const sttKeyField = currentSttMeta?.keyField
  const sttKeySaved = sttKeyField ? !!keySetMap[sttKeyField] : false

  const chatVendor = providerMeta.find((p) => p.id === provider) || null
  const chatKf = chatVendor?.keyField
  const chatMf = chatVendor?.modelField
  const chatKeySaved = chatKf ? !!keySetMap[chatKf] : false
  const chatOpts = chatVendor ? chatOptionsFor(chatVendor.id) : []
  const chatModel =
    chatMf && snap ? String(snap[chatMf] ?? chatVendor?.defaultModel ?? '') : ''
  const chatTest = chatVendor ? testByProvider[chatVendor.id] : null
  const chatListErr = chatVendor ? listModelsErrByProvider[chatVendor.id] : ''
  const chatTesting = chatVendor ? testingProvider === chatVendor.id : false
  const chatListLoading = chatVendor ? listModelsLoadingId === chatVendor.id : false

  return (
    <AppWindowFrame>
      <div className="settings-root relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
      <AmbientOrbs />

      <header className="relative z-20 shrink-0 border-b border-white/[0.06] bg-black/30 px-5 py-4 backdrop-blur-xl lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">Settings</p>
            <h1 className="font-display mt-0.5 text-xl font-semibold tracking-tight text-white md:text-2xl">ShadowAssist</h1>
            <p className="mt-1 max-w-xl text-[13px] leading-snug text-zinc-500">
              {showSetupBanner
                ? 'Finish first-time setup under Session: chat provider, API key, and model.'
                : 'Profile, display, meetings, session, and privacy.'}
            </p>
          </div>
        </div>
      </header>

      {showSetupBanner && (
        <div className="relative z-20 shrink-0 border-b border-white/[0.06] bg-accent/5 px-5 py-2.5 lg:px-8">
          <p className="text-[12px] font-medium text-accent-light">
            First run: open Session, set chat provider, API key, and model, then launch.
          </p>
        </div>
      )}

      <div className="relative z-20 flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <nav className="flex w-[188px] shrink-0 flex-col border-r border-white/[0.06] bg-black/20 py-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`group mx-2 mb-0.5 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 ${
                activeTab === t.id
                  ? 'border border-white/[0.08] bg-white/[0.06] text-white'
                  : 'border border-transparent text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'
              }`}
            >
              <span className="block text-[13px] font-medium">{t.label}</span>
              <span className="mt-0.5 block text-[10px] text-zinc-600 group-hover:text-zinc-500">{t.sub}</span>
            </button>
          ))}
        </nav>

        <main className="settings-scroll-outer min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8">
          {activeTab === 'profile' && (
            <div className="mx-auto max-w-[1600px] animate-fade-in space-y-5">
              <div>
                <h2 className="font-display text-xl font-bold text-white">Profile</h2>
                <p className="mt-1 max-w-3xl text-sm text-mist-500">
                  <strong className="text-gray-300">Persona</strong> defines how the AI sounds. <strong className="text-gray-300">Profile</strong> + <strong className="text-gray-300">notes / JD</strong> ground suggestions in your background and team context for meetings.
                </p>
              </div>

              <section className="glass-panel p-6">
                <h3 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-gray-300">System prompt</h3>
                <p className="mt-1 text-xs text-gray-500">
                  How the AI should behave — merged with resume/JD on every ask. Leave empty or choose <strong className="text-gray-400">ShadowAssist (built-in)</strong> to use the{' '}
                  <span className="font-mono text-mist-400">lib/defaultSystemPrompt.js</span> base prompt. Override here for your own use case.
                </p>
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
                  placeholder="Leave empty for the built-in ShadowAssist prompt, or describe your persona."
                />
                <p className="mt-2 text-[10px] text-gray-600">Saved when you leave this field.</p>
              </section>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <section className="glass-panel p-6">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-sm font-bold uppercase tracking-widest text-phantom-300">Resume</h3>
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
              <section className="glass-panel p-6">
                <h2 className="text-base font-semibold text-white">Overlay</h2>
                <p className="mt-1 text-[13px] text-zinc-500">
                  Appearance, size, position, and global shortcuts. Changes apply while the overlay is open.
                </p>

                <div className="mt-6 space-y-7">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      Accent
                    </label>
                    <p className="mb-2 text-[11px] text-zinc-600">Overlay highlights (mic, code chrome, accents).</p>
                    <div className="flex flex-wrap gap-2">
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
                            className={`group flex flex-col items-center gap-1 rounded-lg border px-1.5 py-1.5 text-center transition-colors duration-150 ${
                              active
                                ? 'border-accent/40 bg-accent/10'
                                : 'border-white/[0.08] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]'
                            }`}
                          >
                            <span
                              className="h-6 w-6 shrink-0 rounded-full ring-1 ring-white/10"
                              style={{
                                background: `linear-gradient(145deg, rgb(${lr},${lg},${lb}), rgb(${r},${g},${b}))`,
                              }}
                            />
                            <span
                              className={`max-w-[4.5rem] truncate text-[9px] font-medium leading-tight ${
                                active ? 'text-accent-light' : 'text-zinc-500 group-hover:text-zinc-400'
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
                    <div className="mb-2 flex flex-wrap gap-2">
                      {[
                        { label: 'Stealth', pct: 65 },
                        { label: 'Balanced', pct: 85 },
                        { label: 'Clear', pct: 92 },
                      ].map((p) => (
                        <button
                          key={p.pct}
                          type="button"
                          onClick={() => applyOpacityPreset(p.pct)}
                          className={`settings-chip settings-chip-sm !normal-case ${
                            Math.round(overlayOpacityUi * 100) === p.pct ? 'settings-chip-active' : ''
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
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
                    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-mist-400">Answer style</label>
                    <p className="mb-2 text-[11px] text-zinc-600">
                      Brief: multi-paragraph depth + visible code; lists tuck under “Show lists &amp; steps”. Detailed: full markdown.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'brief', label: 'Brief (summary)' },
                        { id: 'detailed', label: 'Detailed' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => applyAnswerStyle(opt.id)}
                          className={`settings-chip settings-chip-sm !normal-case ${answerStyleUi === opt.id ? 'settings-chip-active' : ''}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-mist-400">Reading modes</label>
                    <div className="space-y-3">
                      <label className="settings-row-tile flex cursor-pointer items-center justify-between gap-4">
                        <div>
                          <span className="font-medium text-gray-200">Teleprompter</span>
                          <p className="text-xs text-gray-600">Larger type, minimal labels — best during live calls.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={overlayTeleprompterUi}
                          onChange={(e) => applyOverlayTeleprompter(e.target.checked)}
                          className="h-5 w-5 rounded border-white/20 accent-accent"
                        />
                      </label>
                      <label className="settings-row-tile flex cursor-pointer items-center justify-between gap-4">
                        <div>
                          <span className="font-medium text-gray-200">Focus mode</span>
                          <p className="text-xs text-gray-600">Hide the input bar until you tap — more room for answers.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={overlayFocusModeUi}
                          onChange={(e) => applyOverlayFocusMode(e.target.checked)}
                          className="h-5 w-5 rounded border-white/20 accent-accent"
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-mist-400">Answer preview</label>
                    <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4">
                      <div className="rounded-lg border border-accent/15 bg-accent/[0.06] px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-accent/70">Takeaway</p>
                        <p className="mt-1 text-[13px] font-medium text-gray-100">
                          Lead with this line in the meeting — the core point in plain language.
                        </p>
                      </div>
                      <p className="mt-3 text-[12px] leading-relaxed text-gray-400">
                        Explanation paragraphs follow with depth. Code stays visible; lists tuck under &quot;Show lists &amp; steps&quot;.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-mist-400">Answer panel view</label>
                    <p className="mb-2 text-[11px] text-zinc-600">
                      Latest shows only the current Q&amp;A during a call. History keeps the full thread.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'latest', label: 'Latest only' },
                        { id: 'history', label: 'Full history' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => applyOverlayAnswerView(opt.id)}
                          className={`settings-chip settings-chip-sm !normal-case ${overlayAnswerViewUi === opt.id ? 'settings-chip-active' : ''}`}
                        >
                          {opt.label}
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
                    <p className="mt-2 text-[10px] text-zinc-600">Uses current width/height. Nudge with arrow shortcuts below.</p>
                  </div>

                  <div className="border-t border-white/[0.06] pt-6">
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                          Keyboard shortcuts
                        </label>
                        <p className="mt-1 text-[11px] text-zinc-600">
                          Electron format: <code className="text-zinc-500">CommandOrControl</code> works on Mac (⌘) and Windows (Ctrl). Use{' '}
                          <code className="text-zinc-500">+</code> between keys. Invalid combos may not register — check the dev console if a shortcut stops working.
                        </p>
                      </div>
                      <button type="button" onClick={() => void resetAllHotkeys()} className="btn-ghost shrink-0 px-3 py-1.5 text-[11px]">
                        Restore all defaults
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {HOTKEY_DEFS.map(({ action, label }) => (
                        <div
                          key={action}
                          className="flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-2"
                        >
                          <span className="min-w-0 flex-1 text-[12px] text-zinc-400">{label}</span>
                          <input
                            type="text"
                            spellCheck={false}
                            autoComplete="off"
                            value={hotkeysMap[action] ?? DEFAULT_HOTKEYS_MAP[action] ?? ''}
                            onChange={(e) => setHotkeysMap((m) => ({ ...m, [action]: e.target.value }))}
                            onBlur={(e) => void commitHotkey(action, e.target.value)}
                            className="input-shadow w-[min(100%,220px)] min-w-[160px] px-2 py-1.5 font-mono text-[11px]"
                          />
                          <button
                            type="button"
                            onClick={() => void resetOneHotkey(action)}
                            className="rounded-md border border-white/[0.08] px-2 py-1 text-[10px] text-zinc-500 transition-colors hover:border-white/15 hover:text-zinc-300"
                          >
                            Reset
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'session' && (
            <div className="mx-auto max-w-3xl animate-fade-in space-y-5">
              <div>
                <h2 className="font-display text-xl font-bold text-white">Session</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Chat model for answers, transcription for Listen, and screen or mic capture.
                </p>
              </div>

              <details className="glass-panel group p-0 open" open>
                <summary className="cursor-pointer list-none px-6 py-4 font-display text-sm font-bold uppercase tracking-[0.15em] text-gray-300 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-2">
                    Capture
                    <span className="font-mono text-[10px] font-normal normal-case tracking-normal text-zinc-600 group-open:hidden">
                      Show
                    </span>
                  </span>
                </summary>
                <div className="space-y-6 border-t border-white/[0.06] px-6 pb-6 pt-2">
                  <label className="settings-row-tile flex cursor-pointer items-center justify-between gap-4">
                    <div>
                      <span className="font-medium text-gray-200">Screen reading (OCR)</span>
                      <p className="text-xs text-gray-600">
                        When Listen is on, screen text is captured when you trigger the assistant (hotkey or typed ask),
                        or when Assist mode runs an intent check — not continuously in the background.
                      </p>
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
                      <p className="text-xs text-gray-600">Listen uses fixed-length chunks for transcription (event-driven).</p>
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
                  <div className="settings-row-tile flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-gray-200">Mic language</span>
                      <p className="mt-1 text-xs text-gray-600">
                        English + Hindi + Hinglish uses auto language detection. Forcing English or Hindi sets a single
                        language code — best for single-language sessions.
                      </p>
                    </div>
                    <select
                      value={micListenLanguage}
                      onChange={(e) => {
                        const v = e.target.value
                        setMicListenLanguage(v)
                        save('micListenLanguage', v)
                      }}
                      className="input-shadow w-full shrink-0 px-3 py-2 text-sm sm:w-64"
                    >
                      <option value="en_hi_hinglish" className="bg-void-900">
                        English + Hindi + Hinglish (auto)
                      </option>
                      <option value="en" className="bg-void-900">
                        English only (forced)
                      </option>
                      <option value="hi" className="bg-void-900">
                        Hindi only (forced)
                      </option>
                    </select>
                  </div>
                  <div className="settings-row-tile flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-gray-200">Mic sensitivity</span>
                      <p className="mt-1 text-xs text-gray-600">
                        Boost helps quiet mics; restart Listen after changing. Shortcut keys are under Display → Keyboard
                        shortcuts.
                      </p>
                    </div>
                    <select
                      value={micSensitivity}
                      onChange={(e) => {
                        const v = e.target.value === 'boost' ? 'boost' : 'standard'
                        setMicSensitivity(v)
                        save('micSensitivity', v)
                      }}
                      className="input-shadow w-full shrink-0 px-3 py-2 text-sm sm:w-64"
                    >
                      <option value="standard" className="bg-void-900">
                        Standard
                      </option>
                      <option value="boost" className="bg-void-900">
                        Boost (quiet mic)
                      </option>
                    </select>
                  </div>
                  <label className="settings-row-tile flex cursor-pointer items-center justify-between gap-4">
                    <div>
                      <span className="font-medium text-gray-200">Assist mode (auto AI)</span>
                      <p className="text-xs text-gray-600">
                        Off (default): Listen — speech is context only; use hotkey or type to ask. On: Assist — AI may run
                        when intent is clear (question or strong speech + screen).
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={assistAutoTrigger}
                      onChange={(e) => {
                        setAssistAutoTrigger(e.target.checked)
                        save('assistAutoTrigger', e.target.checked)
                      }}
                      className="h-5 w-5 rounded border-white/20 accent-accent"
                    />
                  </label>
                </div>
              </details>

              <details className="glass-panel group p-0 open" open>
                <summary className="cursor-pointer list-none px-6 py-4 font-display text-sm font-bold uppercase tracking-[0.15em] text-gray-300 [&::-webkit-details-marker]:hidden">
                  Chat
                </summary>
                <div className="space-y-4 border-t border-white/[0.06] px-6 pb-6 pt-2">
                  {!snap || !providerMeta.length ? (
                    <p className="text-sm text-gray-500">Loading providers…</p>
                  ) : (
                    <>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-mist-400">
                          Chat provider
                        </label>
                        <select
                          value={provider}
                          onChange={(e) => selectChatProvider(e.target.value)}
                          className="input-shadow w-full px-3 py-2.5 font-mono text-sm"
                        >
                          {providerMeta.map((pm) => (
                            <option key={pm.id} value={pm.id} className="bg-void-900">
                              {pm.label}
                              {pm.keyField && keySetMap[pm.keyField] ? ' ✓' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {chatVendor && snap && (
                        <div
                          className="space-y-4 rounded-xl border px-4 py-4"
                          style={{
                            borderColor: `${chatVendor.color}55`,
                            background: `linear-gradient(165deg, ${chatVendor.color}12 0%, rgba(0,0,0,0.35) 100%)`,
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-display text-xs font-bold text-white">{chatVendor.label}</span>
                            {chatVendor.docs ? (
                              <a
                                href={chatVendor.docs}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-medium hover:underline"
                                style={{ color: chatVendor.color }}
                              >
                                Get API key →
                              </a>
                            ) : null}
                          </div>

                          {chatVendor.kind === 'anthropic' && (
                            <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90">
                              Claude uses the Anthropic Messages API (not OpenAI). Model id must match your account.
                            </p>
                          )}

                          {chatVendor.usesCustomBase && (
                            <div>
                              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-mist-400">
                                OpenAI-compatible base URL
                              </label>
                              <input
                                type="url"
                                value={snap.customOpenaiBaseUrl || ''}
                                onChange={(e) => patchSnap('customOpenaiBaseUrl', e.target.value)}
                                onBlur={(e) => save('customOpenaiBaseUrl', e.target.value.trim())}
                                className="input-shadow w-full px-3 py-2.5 font-mono text-xs"
                                placeholder="https://api.openai.com/v1"
                              />
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            <input
                              type="password"
                              value={secretByProvider[chatVendor.id] ?? ''}
                              onChange={(e) =>
                                setSecretByProvider((m) => ({ ...m, [chatVendor.id]: e.target.value }))
                              }
                              placeholder={chatKeySaved ? '••••••••' : 'Paste API key'}
                              className="input-shadow min-w-[200px] flex-1 px-3 py-2.5"
                            />
                            <button
                              type="button"
                              onClick={() => testApiFor(chatVendor.id)}
                              disabled={chatTesting}
                              className="btn-ghost px-4 py-2.5 text-accent"
                            >
                              {chatTesting ? '…' : 'Ping'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                chatKf && saveKey(chatKf, secretByProvider[chatVendor.id] || '', chatVendor.id)
                              }
                              className="btn-ghost px-4 py-2.5"
                            >
                              Commit
                            </button>
                          </div>

                          {chatMf && chatOpts.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-end gap-2">
                                <div className="min-w-[min(100%,320px)] flex-1">
                                  <ModelSelect
                                    label={`Chat model (${chatOpts.length} from ${chatVendor.label})`}
                                    value={chatModel || chatVendor.defaultModel || chatOpts[0]}
                                    models={chatOpts}
                                    listbox={chatOpts.length > 14}
                                    onChange={(v) => {
                                      patchSnap(chatMf, v)
                                      save(chatMf, v)
                                    }}
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => syncRemoteModelsFor(chatVendor.id)}
                                  disabled={chatListLoading}
                                  className="btn-ghost whitespace-nowrap px-4 py-2.5 text-xs"
                                >
                                  {chatListLoading ? 'Syncing…' : 'Refresh from API'}
                                </button>
                              </div>
                              {chatListErr ? <p className="text-xs text-amber-400">{chatListErr}</p> : null}
                            </div>
                          )}

                          {chatMf && chatOpts.length === 0 && (
                            <div className="space-y-2">
                              <ModelInput
                                label={
                                  chatListLoading
                                    ? 'Loading models…'
                                    : chatKeySaved
                                      ? 'Chat model (save key & refresh, or type id)'
                                      : 'Chat model (save API key first)'
                                }
                                value={chatModel}
                                onChange={(v) => patchSnap(chatMf, v)}
                                onCommit={(v) => save(chatMf, v)}
                                suggestions={
                                  modelCatalog[chatVendor.id] ||
                                  (chatVendor.defaultModel ? [chatVendor.defaultModel] : [])
                                }
                                hint="Commit your key, then Refresh from API to load models from your vendor account."
                              />
                              {chatKeySaved ? (
                                <button
                                  type="button"
                                  onClick={() => syncRemoteModelsFor(chatVendor.id)}
                                  disabled={chatListLoading}
                                  className="btn-ghost whitespace-nowrap px-4 py-2.5 text-xs"
                                >
                                  {chatListLoading ? 'Syncing…' : 'Refresh from API'}
                                </button>
                              ) : null}
                              {chatListErr ? <p className="text-xs text-amber-400">{chatListErr}</p> : null}
                            </div>
                          )}

                          {chatTest && (
                            <p
                              className={`font-mono text-xs ${chatTest.success ? 'text-accent' : 'text-rose-400'}`}
                            >
                              {chatTest.success ? 'API key verified' : chatTest.error}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => testApiFor(chatVendor.id)}
                            disabled={chatTesting}
                            className="btn-glow py-3 px-8"
                          >
                            {chatTesting ? 'Testing…' : 'Full connection test'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </details>

              <details className="glass-panel group p-0 open" open>
                <summary className="cursor-pointer list-none px-6 py-4 font-display text-sm font-bold uppercase tracking-[0.15em] text-gray-300 [&::-webkit-details-marker]:hidden">
                  Transcription
                </summary>
                <div className="space-y-6 border-t border-white/[0.06] px-6 pb-6 pt-2">
                  <div className="settings-row-tile flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <span className="font-medium text-gray-200">Mode</span>
                      <p className="mt-1 text-xs text-gray-600">Local runs on-device; cloud uses your STT vendor API key.</p>
                    </div>
                    <select
                      value={sttMode}
                      onChange={(e) => {
                        const v = e.target.value === 'cloud' ? 'cloud' : 'local'
                        setSttMode(v)
                        save('sttMode', v)
                      }}
                      className="input-shadow w-full shrink-0 px-3 py-2 text-sm sm:w-48"
                    >
                      <option value="local" className="bg-void-900">
                        Local
                      </option>
                      <option value="cloud" className="bg-void-900">
                        Cloud
                      </option>
                    </select>
                  </div>

                  {sttMode === 'cloud' && snap && (
                    <>
                      <div className="settings-row-tile">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="font-medium text-gray-200">Cloud STT provider</span>
                          <span className={`font-mono text-[10px] ${sttKeySaved ? 'text-accent' : 'text-amber-400'}`}>
                            {sttKeySaved ? 'Key ✓' : 'Key —'}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {sttCapableMeta.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSttProvider(p.id)
                                save('sttProvider', p.id)
                              }}
                              className="w-full rounded-xl border px-3 py-2.5 text-left transition-all duration-300"
                              style={{
                                background:
                                  sttProvider === p.id
                                    ? `linear-gradient(145deg, ${p.color}22, rgba(0,0,0,0.42))`
                                    : 'linear-gradient(165deg, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.48) 100%)',
                                borderColor: sttProvider === p.id ? `${p.color}70` : 'rgba(255,255,255,0.1)',
                              }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-display text-xs font-bold text-white">{p.label}</span>
                                <span
                                  className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase"
                                  style={{ background: `${p.color}28`, color: p.color }}
                                >
                                  {p.badge}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                        {sttKeyField && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <input
                              type="password"
                              value={sttSecretInput}
                              onChange={(e) => setSttSecretInput(e.target.value)}
                              placeholder={sttKeySaved ? '••••••••' : `${currentSttMeta?.label || 'STT'} API key`}
                              className="input-shadow min-w-[200px] flex-1 px-3 py-2 text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (sttKeyField && sttSecretInput.trim()) {
                                  saveKey(sttKeyField, sttSecretInput)
                                  setSttSecretInput('')
                                }
                              }}
                              className="btn-ghost px-4 py-2 text-xs"
                            >
                              Commit key
                            </button>
                          </div>
                        )}
                      </div>

                      {sttProvider === 'groq' && (
                        <ModelSelect
                          label="STT model"
                          value={snap.groqWhisperModel || 'whisper-large-v3-turbo'}
                          models={GROQ_WHISPER}
                          onChange={(v) => {
                            patchSnap('groqWhisperModel', v)
                            save('groqWhisperModel', v)
                          }}
                        />
                      )}
                      {sttProvider === 'together' && (
                        <ModelSelect
                          label="STT model"
                          value={snap.togetherWhisperModel || 'openai/whisper-large-v3'}
                          models={TOGETHER_WHISPER_MODELS}
                          onChange={(v) => {
                            patchSnap('togetherWhisperModel', v)
                            save('togetherWhisperModel', v)
                          }}
                        />
                      )}
                      {sttProvider === 'mistral' && (
                        <ModelSelect
                          label="STT model"
                          value={snap.mistralSttModel || 'voxtral-mini-latest'}
                          models={MISTRAL_STT_MODELS}
                          onChange={(v) => {
                            patchSnap('mistralSttModel', v)
                            save('mistralSttModel', v)
                          }}
                        />
                      )}
                      {sttProvider === 'fireworks' && (
                        <ModelSelect
                          label="STT model"
                          value={snap.fireworksSttModel || 'whisper-v3-turbo'}
                          models={FIREWORKS_STT_MODELS}
                          onChange={(v) => {
                            patchSnap('fireworksSttModel', v)
                            save('fireworksSttModel', v)
                          }}
                        />
                      )}
                      {sttProvider === 'nvidia' && (
                        <ModelSelect
                          label="STT model"
                          value={snap.nvidiaSttModel || 'parakeet-1.1b-rnnt-multilingual-asr'}
                          models={NVIDIA_STT_MODELS}
                          onChange={(v) => {
                            patchSnap('nvidiaSttModel', v)
                            save('nvidiaSttModel', v)
                          }}
                        />
                      )}
                      {sttProvider === 'openai' && (
                        <div className="settings-row-tile">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-mist-400">STT model</span>
                          <p className="mt-1 font-mono text-sm text-gray-300">whisper-1</p>
                        </div>
                      )}
                    </>
                  )}
                  {sttMode === 'local' && (
                    <p className="text-xs text-zinc-500">
                      Local transcription runs on-device (Moonshine). No cloud API key required.
                    </p>
                  )}
                </div>
              </details>

              {showSetupBanner && (
                <button type="button" onClick={launchFromSetup} className="btn-glow w-full py-4 text-base">
                  Launch ShadowAssist
                </button>
              )}
            </div>
          )}

          {activeTab === 'meetings' && (
            <div className="mx-auto max-w-3xl animate-fade-in space-y-5">
              <section className="glass-panel p-8">
                <h2 className="font-display text-lg font-bold text-white">Meeting detection</h2>
                <p className="mt-1 text-sm text-gray-500">
                  When enabled, ShadowAssist watches the foreground window on Windows and can notify you when Google
                  Meet or Microsoft Teams is active (desktop app or browser tab).
                </p>
                <label className="settings-row-tile mt-6 flex cursor-pointer items-center justify-between gap-4">
                  <div>
                    <span className="font-medium text-gray-200">Detect Meet & Teams</span>
                    <p className="mt-1 text-xs text-gray-600">
                      Shows a one-time toast per meeting window. Does not use your calendar or microphone.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={meetingForegroundDetectionEnabled}
                    onChange={(e) => {
                      const v = e.target.checked
                      setMeetingForegroundDetectionEnabled(v)
                      save('meetingForegroundDetectionEnabled', v)
                    }}
                    className="h-5 w-5 shrink-0 rounded border-white/20 accent-accent"
                  />
                </label>
              </section>

              <section className="glass-panel p-8">
                <div className="flex items-center gap-3">
                  <img
                    src="https://ssl.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_31_2x.png"
                    alt="Google Calendar"
                    className="h-[34px] w-[34px] rounded-lg border border-white/15 object-cover shadow-[0_8px_24px_-16px_rgba(0,0,0,0.65)]"
                  />
                  <h2 className="font-display text-lg font-bold text-white">Google Calendar</h2>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Connect Google Calendar to sync accepted upcoming meetings and keep this list updated.
                </p>
                <div className="mt-6 space-y-4">
                  <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
                      Quick connect
                    </p>
                    <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-zinc-300">
                      <li>Click <span className="font-semibold text-white">Connect Google Calendar</span>.</li>
                      <li>Choose the Google account email you want to sync.</li>
                      <li>Approve read-only calendar access.</li>
                    </ol>
                    <p className="mt-3 text-[11px] text-zinc-500">
                      If you see a Google 403 / access denied screen, that email must be added in OAuth consent screen <span className="font-mono">Test users</span> by the app owner.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void connectGoogleCalendar()}
                      disabled={calendarConnectBusy}
                      className="btn-ghost px-4 py-2.5"
                    >
                      {calendarConnectBusy ? 'Connecting…' : 'Connect Google Calendar'}
                    </button>
                    {calendarConnectBusy && (
                      <button
                        type="button"
                        onClick={() => void cancelGoogleCalendarConnect()}
                        className="btn-ghost px-4 py-2.5 text-amber-200"
                      >
                        Cancel connect
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void disconnectGoogleCalendar()}
                      disabled={calendarConnectBusy || !googleCalendarConnectedEmail}
                      className="btn-ghost px-4 py-2.5 text-rose-200"
                    >
                      Disconnect
                    </button>
                    <button
                      type="button"
                      onClick={() => void refreshCalendarMeetings()}
                      disabled={calendarEventsLoading}
                      className="btn-ghost px-4 py-2.5"
                    >
                      {calendarEventsLoading ? 'Refreshing…' : 'Refresh meetings'}
                    </button>
                  </div>
                  <div className="settings-row-tile flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-gray-200">Start-time reminders</span>
                      <p className="mt-1 text-xs text-gray-600">
                        Show a one-time notification before accepted meetings start.
                      </p>
                    </div>
                    <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
                      <input
                        type="checkbox"
                        checked={calendarRemindersEnabled}
                        onChange={(e) => {
                          const v = e.target.checked
                          setCalendarRemindersEnabled(v)
                          save('calendarRemindersEnabled', v)
                        }}
                        className="h-5 w-5 rounded border-white/20 accent-accent"
                      />
                      <select
                        value={String(calendarReminderMinutes)}
                        onChange={(e) => {
                          const v = Math.max(0, Number(e.target.value || 0))
                          setCalendarReminderMinutes(v)
                          save('calendarReminderMinutes', v)
                        }}
                        className="input-shadow px-3 py-2 text-xs"
                        disabled={!calendarRemindersEnabled}
                      >
                        <option value="0" className="bg-void-900">At start time</option>
                        <option value="5" className="bg-void-900">5 min before</option>
                        <option value="10" className="bg-void-900">10 min before</option>
                        <option value="15" className="bg-void-900">15 min before</option>
                      </select>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-black/25 p-4">
                    <p className="text-xs text-gray-400">
                      Connected account:{' '}
                      <span className="font-mono text-zinc-200">{googleCalendarConnectedEmail || 'Not connected'}</span>
                    </p>
                    {googleCalendarUsingEmbeddedOAuth && (
                      <p className="mt-1 text-[11px] text-zinc-500">
                        OAuth client is configured by ShadowAssist. Only Google sign-in is required.
                      </p>
                    )}
                    {calendarConnectBusy && (
                      <p className="mt-1 text-[11px] text-amber-200/90">
                        Waiting for Google approval in your browser. If Google shows a tester-access 403 page, this email is not approved in your OAuth test users yet.
                      </p>
                    )}
                    {!!calendarErr && (
                      <p className="mt-2 text-xs text-rose-300">{calendarErr}</p>
                    )}
                    <p className="mt-2 text-[11px] text-zinc-600">
                      If sync fails on corporate networks, allow: <span className="font-mono">accounts.google.com</span>, <span className="font-mono">oauth2.googleapis.com</span>, <span className="font-mono">www.googleapis.com</span>, <span className="font-mono">calendar.google.com</span>.
                    </p>
                  </div>

                  {!googleCalendarOAuthReady && (
                    <details className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
                      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.2em] text-mist-400">
                        Advanced setup (for app owners)
                      </summary>
                      <div className="mt-3 space-y-3">
                        <div className="space-y-1 text-xs">
                          <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="block text-accent hover:underline">1) Open Google Cloud Console</a>
                          <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank" rel="noopener noreferrer" className="block text-accent hover:underline">2) Enable Google Calendar API</a>
                          <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="block text-accent hover:underline">3) Create OAuth client credentials (Desktop app)</a>
                          <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" rel="noopener noreferrer" className="block text-accent hover:underline">4) Add user emails in OAuth consent -&gt; Test users</a>
                        </div>
                        <div className="settings-row-tile">
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-mist-400">
                            Google OAuth Client ID
                          </label>
                          <input
                            type="text"
                            value={googleCalendarClientId}
                            onChange={(e) => setGoogleCalendarClientId(e.target.value)}
                            onBlur={() => save('googleCalendarClientId', String(googleCalendarClientId || '').trim())}
                            placeholder="From Google Cloud OAuth Desktop app"
                            className="input-shadow w-full px-3 py-2.5 font-mono text-xs"
                          />
                        </div>
                        <div className="settings-row-tile">
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-mist-400">
                            Google OAuth Client Secret
                          </label>
                          <input
                            type="password"
                            value={googleCalendarClientSecret}
                            onChange={(e) => setGoogleCalendarClientSecret(e.target.value)}
                            placeholder="Stored encrypted on this device"
                            className="input-shadow w-full px-3 py-2.5 font-mono text-xs"
                          />
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              </section>

              <section className="glass-panel p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-gray-300">
                    Meeting Summary
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void refreshListenSummaries()}
                      className="btn-ghost px-3 py-1.5 text-xs"
                    >
                      Refresh sessions
                    </button>
                    <button
                      type="button"
                      onClick={() => void clearMeetingSummaries()}
                      className="btn-ghost px-3 py-1.5 text-xs text-rose-200"
                    >
                      Clear summaries
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Summaries are generated from Listen sessions only (Start Listen - Stop Listen).
                </p>

                {listenSummaries.length > 0 ? (
                  <div className="mt-4 space-y-4">
                    <div className="settings-row-tile">
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-mist-400">
                        Session time range
                      </label>
                      <select
                        value={selectedSummaryId}
                        onChange={(e) => setSelectedSummaryId(e.target.value)}
                        className="input-shadow w-full px-3 py-2.5 text-sm"
                      >
                        {listenSummaries.map((s) => (
                          <option key={s.id} value={s.id} className="bg-void-900">
                            {formatSessionRange(s.startedAt, s.endedAt)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedSummary && (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-white/[0.08] bg-black/25 p-4 text-xs text-zinc-400">
                          <p>
                            <span className="text-zinc-200">Duration:</span>{' '}
                            {formatSessionRange(selectedSummary.startedAt, selectedSummary.endedAt)}
                          </p>
                          <p className="mt-1">
                            <span className="text-zinc-200">LLM summary:</span>{' '}
                            {selectedSummary.llmSummary?.status || 'idle'}
                          </p>
                        </div>

                        <details className="rounded-xl border border-white/[0.08] bg-black/20 p-4" open>
                          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.2em] text-mist-400">
                            LLM Meeting Summary
                          </summary>
                          <div className="mt-3">
                            {selectedSummary.llmSummary?.status === 'generating' && (
                              <p className="text-xs text-amber-200">Generating summary in background…</p>
                            )}
                            {selectedSummary.llmSummary?.status === 'error' && (
                              <p className="text-xs text-rose-300">{selectedSummary.llmSummary?.error || 'Summary generation failed'}</p>
                            )}
                            {selectedSummary.llmSummary?.status === 'ready' && (
                              <div className="rounded-lg border border-white/[0.06] bg-black/30 p-3">
                                <p className="mb-2 text-[11px] text-zinc-500">
                                  Generated {formatMeetingWhen(selectedSummary.llmSummary?.generatedAt)}
                                </p>
                                {summaryBullets.length > 0 ? (
                                  <ul className="space-y-1.5 text-xs text-zinc-200">
                                    {summaryBullets.map((b, i) => (
                                      <li key={`${i}-${b.slice(0, 18)}`} className="rounded-md border border-white/[0.04] bg-white/[0.02] px-2.5 py-1.5">
                                        {b}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="whitespace-pre-wrap text-xs text-zinc-300">
                                    {selectedSummary.llmSummary?.text}
                                  </p>
                                )}
                              </div>
                            )}
                            {!selectedSummary.llmSummary || selectedSummary.llmSummary?.status === 'idle' ? (
                              <p className="text-xs text-zinc-500">
                                Summary will be generated automatically after Listen is stopped.
                              </p>
                            ) : null}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-zinc-500">
                    No Listen sessions found yet. Start Listen, interact, then stop to create a summary session.
                  </p>
                )}
              </section>

              <section className="glass-panel p-6">
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-zinc-200">
                    Calendar meetings ({calendarMeetings.length})
                  </summary>
                  <div className="mt-4 space-y-2">
                    {!calendarMeetings.length && (
                      <p className="text-sm text-zinc-500">
                        {googleCalendarConnectedEmail
                          ? 'No accepted upcoming meetings found.'
                          : 'Connect Google Calendar to load meetings.'}
                      </p>
                    )}
                    {calendarMeetings.length > 0 && (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr]">
                        <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-mist-400">
                            Date
                          </label>
                          <select
                            value={effectiveDateKey}
                            onChange={(e) => setSelectedCalendarDate(e.target.value)}
                            className="input-shadow w-full px-2.5 py-2 text-xs"
                          >
                            {availableDateKeys.map((k) => (
                              <option key={k} value={k} className="bg-void-900">
                                {formatDateKeyLabel(k)}
                              </option>
                            ))}
                          </select>
                          <p className="mt-2 text-[11px] text-zinc-500">
                            {meetingsForSelectedDate.length} meeting{meetingsForSelectedDate.length === 1 ? '' : 's'} on selected date
                          </p>
                        </div>
                        <div className="space-y-2">
                          {meetingsForSelectedDate.map((m) => (
                            <div key={m.id} className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
                              <p className="text-sm font-semibold text-white">{m.title}</p>
                              <p className="mt-1 text-xs text-zinc-400">
                                {formatMeetingWhen(m.start)} {m.end ? `→ ${formatMeetingWhen(m.end)}` : ''}
                              </p>
                              {m.organizer && (
                                <p className="mt-1 text-xs text-zinc-500">Organizer: {m.organizer}</p>
                              )}
                              {m.meetLink && (
                                <a
                                  href={m.meetLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 inline-block text-xs text-accent hover:underline"
                                >
                                  Open meeting link
                                </a>
                              )}
                            </div>
                          ))}
                          {meetingsForSelectedDate.length === 0 && (
                            <p className="text-xs text-zinc-500">No meetings on selected date.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              </section>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="mx-auto max-w-3xl animate-fade-in space-y-5">
              <section className="glass-panel p-8">
                <h2 className="font-display text-lg font-bold text-white">Privacy &amp; Data</h2>
                <p className="mt-1 text-sm text-indigo-200/70">Local meeting assistant data stays on this device. Disclose use where policies or participants require it.</p>
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
                <p className="mt-2 text-xs text-indigo-300/80">AI overlay for live meetings</p>
                <p className="mt-3 text-sm text-gray-400">On-screen assistant for calls and live meetings. Disclosure is your responsibility where required.</p>
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
