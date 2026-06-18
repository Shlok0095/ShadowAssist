// Copyright (c) 2026 VeilAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import React, { useState, useEffect, useMemo, useId, memo } from 'react'
import { applyUiAccentTheme, normalizeUiAccentId } from '../shared/uiAccentThemes'
import { createIpcShim } from '../shared/ipcShim'
import ProfileModesPanel from './ProfileModesPanel'
import AppWindowFrame from '../shared/AppWindowFrame'
import logoSrc from '../../logo.png'

const ipc = createIpcShim()

const CONTENT_MAX = 12000
const NAME_MAX = 64
const REFERENCE_FILE_MAX_CHARS = 80000
const NOTE_TITLE_MAX = 80
const NOTE_INSTRUCTIONS_MAX = 400

function notesSectionsFromPrompt(p) {
  if (!p?.notesTemplate) return []
  const raw = p.notesTemplate
  const list = Array.isArray(raw) ? raw : raw.sections
  if (!Array.isArray(list)) return []
  return list.map((s) => ({
    id: s.id || `ns-${Date.now()}`,
    title: s.title || '',
    instructions: s.instructions || s.description || '',
  }))
}

function newNotesSectionId() {
  return `ns-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function basename(filePath) {
  const p = String(filePath || '').replace(/\\/g, '/')
  return p.split('/').pop() || 'file'
}

const GROQ_WHISPER = ['whisper-large-v3-turbo', 'whisper-large-v3']
const TOGETHER_WHISPER_MODELS = ['openai/whisper-large-v3', 'openai/whisper-large-v3-turbo']
const MISTRAL_STT_MODELS = ['voxtral-mini-latest', 'voxtral-mini-transcribe-realtime-2602']
const FIREWORKS_STT_MODELS = ['whisper-v3-turbo', 'whisper-v3']
const NVIDIA_STT_MODELS = ['parakeet-1.1b-rnnt-multilingual-asr']

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

const SETTINGS_TABS = [
  { id: 'profile', label: 'Profile', sub: 'Modes' },
  { id: 'display', label: 'Display', sub: 'Overlay layout' },
  { id: 'meetings', label: 'Meetings', sub: 'Calendar & detection' },
  { id: 'session', label: 'Session', sub: 'Chat, STT & capture' },
  { id: 'privacy', label: 'Privacy', sub: 'Data on this device' },
  { id: 'about', label: 'About', sub: 'Version & info' },
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
      <div className="absolute -left-[25%] top-[15%] h-[280px] w-[280px] rounded-full bg-indigo-500/[0.05] blur-[100px]" />
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
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-mist-400">{label}</label>
      {listbox && models.length > 6 ? (
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter models…"
          className="input-shadow mb-2 w-full px-3 py-2 font-mono text-xs"
          autoComplete="off"
        />
      ) : null}
      <select
        value={safeVal}
        onChange={(e) => onChange(e.target.value)}
        className="input-shadow w-full px-3 py-2.5 font-mono text-xs"
      >
        {display.map((m) => (
          <option key={m} value={m} className="bg-void-900">
            {m}
          </option>
        ))}
      </select>
      {filter.trim() && !filtered.length ? (
        <p className="mt-1 text-[10px] text-amber-400">No match — clear filter or type the model ID directly.</p>
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

const ToggleSwitch = memo(function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-[22px] w-[42px] shrink-0 cursor-pointer rounded-full transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-40 ${checked ? 'bg-accent focus-visible:ring-accent/60' : 'bg-white/[0.13] focus-visible:ring-white/30'}`}
      style={checked ? { boxShadow: '0 0 10px -2px rgb(var(--accent-rgb) / 0.55)' } : undefined}
    >
      <span className={`pointer-events-none mt-[3px] inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${checked ? 'translate-x-[23px]' : 'translate-x-[3px]'}`} />
    </button>
  )
})

const NAV_ICONS = {
  profile: (
    <>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="8" r="4"/>
    </>
  ),
  display: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
    </>
  ),
  meetings: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
    </>
  ),
  session: (
    <>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4"/>
    </>
  ),
  privacy: (
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  ),
  about: (
    <>
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 8v4M12 16h.01"/>
    </>
  ),
}

function NavIcon({ id }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[15px] w-[15px] shrink-0">
      {NAV_ICONS[id] ?? null}
    </svg>
  )
}

function SectionTitle({ children, as: Tag = 'h2', className = '' }) {
  return (
    <Tag className={`flex items-center gap-2.5 font-display font-semibold text-white ${className}`}>
      <span className="inline-block h-[18px] w-[3px] shrink-0 rounded-full bg-gradient-to-b from-accent to-accent/20" aria-hidden="true" />
      {children}
    </Tag>
  )
}

export default function Settings() {
  const isFirstRunWindow = useFirstRunQuery()

  const [providerMeta, setProviderMeta] = useState([])
  const [snap, setSnap] = useState(null)
  const [provider, setProvider] = useState('groq')
  const [sttProvider, setSttProvider] = useState('groq')
  const [secretByProvider, setSecretByProvider] = useState({})
  const [sttSecretInput, setSttSecretInput] = useState('')
  const [keySetMap, setKeySetMap] = useState({})
  const [testByProvider, setTestByProvider] = useState({})
  const [testingProvider, setTestingProvider] = useState(null)
  const [activeTab, setActiveTab] = useState('profile')
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true)
  const [ocrEnabled, setOcrEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [micSensitivity, setMicSensitivity] = useState('standard')
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
  const [contextPrompts, setContextPrompts] = useState([])
  const [activeContextPromptId, setActiveContextPromptId] = useState('')
  const [contextPromptHistory, setContextPromptHistory] = useState([])
  const [contextIndexing, setContextIndexing] = useState(false)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [showModeTemplates, setShowModeTemplates] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [draftNotesSections, setDraftNotesSections] = useState([])

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
  const [hotkeysMap, setHotkeysMap] = useState(() => ({ ...DEFAULT_HOTKEYS_MAP }))
  const [stealthModeUi, setStealthModeUi] = useState(false)
  const [appVersion, setAppVersion] = useState('')

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
        setHasCompletedOnboarding(!!s.hasCompletedOnboarding)
        setOcrEnabled(s.ocrEnabled !== false)
        setAudioEnabled(s.audioEnabled !== false)
        setMicSensitivity(s.micSensitivity === 'boost' ? 'boost' : 'standard')
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
        setContextPrompts(Array.isArray(s.contextPrompts) ? s.contextPrompts : [])
        setActiveContextPromptId(s.activeContextPromptId || '')
        setContextPromptHistory(Array.isArray(s.contextPromptHistory) ? s.contextPromptHistory : [])
        const activeP = (Array.isArray(s.contextPrompts) ? s.contextPrompts : []).find(
          (p) => p.id === s.activeContextPromptId,
        )
        if (activeP) {
          setDraftName(activeP.name || '')
          const merged = String(activeP.content || '').trim()
            || [activeP.instructions, activeP.knowledge].map((s) => String(s || '').trim()).filter(Boolean).join('\n\n')
          setDraftContent(merged)
          setDraftNotesSections(notesSectionsFromPrompt(activeP))
        }
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
        applyUiAccentTheme(document.documentElement, accentId)
        setStealthModeUi(s.stealth_mode === true)
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
    ipc.invoke('get-app-info')
      .then((info) => {
        if (info?.version) setAppVersion(String(info.version))
      })
      .catch(() => {})
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
      applyUiAccentTheme(document.documentElement, normalizeUiAccentId(id))
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

  useEffect(() => {
    if (!ipc) return
    const onStealth = (_, v) => setStealthModeUi(!!v)
    const unsub = ipc.on('stealth-mode-update', onStealth)
    return () => unsub?.()
  }, [])

  useEffect(() => {
    if (isFirstRunWindow && snap && !hasCompletedOnboarding) {
      setActiveTab('session')
    }
  }, [isFirstRunWindow, snap, hasCompletedOnboarding])

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

  const withIndexing = async (fn) => {
    setContextIndexing(true)
    try {
      await fn()
    } finally {
      setContextIndexing(false)
    }
  }

  const saveContextPrompts = async (next) => {
    setContextPrompts(next)
    await withIndexing(() => save('contextPrompts', next))
  }

  const selectContextPrompt = async (id, promptOverride) => {
    const p = promptOverride || contextPrompts.find((x) => x.id === id)
    if (!p) return
    setShowModeTemplates(false)
    setActiveContextPromptId(id)
    setDraftName(p.name || '')
    const merged = String(p.content || '').trim()
      || [p.instructions, p.knowledge].map((s) => String(s || '').trim()).filter(Boolean).join('\n\n')
    setDraftContent(merged)
    setDraftNotesSections(notesSectionsFromPrompt(p))
    await save('activeContextPromptId', id)
    const nextHist = [id, ...(contextPromptHistory || []).filter((h) => h !== id)].slice(0, 20)
    setContextPromptHistory(nextHist)
    await save('contextPromptHistory', nextHist)
  }

  const addContextPrompt = async () => {
    const now = Date.now()
    const p = {
      id: `cp-${now}-${Math.random().toString(36).slice(2, 9)}`,
      name: 'New mode',
      content: '',
      referenceFiles: [],
      notesTemplate: { sections: [] },
      createdAt: now,
      updatedAt: now,
    }
    const next = [...contextPrompts, p]
    await saveContextPrompts(next)
    setShowModeTemplates(false)
    setDraftNotesSections([])
    await selectContextPrompt(p.id, p)
  }

  const addModeFromTemplate = async (template) => {
    if (!template) return
    const now = Date.now()
    const noteSections = (template.notesTemplate || []).map((s, i) => ({
      id: `ns-${now}-${i}`,
      title: String(s.title || 'Section').slice(0, NOTE_TITLE_MAX),
      instructions: String(s.instructions || '').slice(0, NOTE_INSTRUCTIONS_MAX),
    }))
    const p = {
      id: `cp-${now}-${Math.random().toString(36).slice(2, 9)}`,
      name: String(template.name || 'New mode').slice(0, NAME_MAX),
      content: String(template.content || '').slice(0, CONTENT_MAX),
      referenceFiles: [],
      notesTemplate: { sections: noteSections },
      createdAt: now,
      updatedAt: now,
    }
    const next = [...contextPrompts, p]
    await saveContextPrompts(next)
    setShowModeTemplates(false)
    await selectContextPrompt(p.id, p)
  }

  const saveActivePrompt = async () => {
    if (!activeContextPromptId) return
    const name = String(draftName || 'New prompt').trim().slice(0, NAME_MAX) || 'New prompt'
    const content = String(draftContent || '').slice(0, CONTENT_MAX)
    const sections = draftNotesSections
      .map((s) => ({
        id: String(s.id || newNotesSectionId()).slice(0, 64),
        title: String(s.title || '').trim().slice(0, NOTE_TITLE_MAX) || 'Section',
        instructions: String(s.instructions || '').trim().slice(0, NOTE_INSTRUCTIONS_MAX),
      }))
      .filter((s) => s.title || s.instructions)
    const next = contextPrompts.map((p) =>
      p.id === activeContextPromptId
        ? { ...p, name, content, notesTemplate: { sections }, updatedAt: Date.now() }
        : p,
    )
    setDraftName(name)
    await saveContextPrompts(next)
  }

  const uploadReferenceFile = async () => {
    if (!activeContextPromptId || !ipc) return
    const { canceled, filePaths } = await ipc.invoke('show-open-dialog', {
      properties: ['openFile'],
      filters: [{ name: 'Documents', extensions: ['pdf', 'txt'] }],
    })
    if (canceled || !filePaths?.[0]) return
    setUploadBusy(true)
    try {
      const text = await ipc.invoke('parse-playbook', filePaths[0])
      if (!String(text || '').trim()) return
      const file = {
        id: `rf-${Date.now()}`,
        name: basename(filePaths[0]),
        text: String(text).slice(0, REFERENCE_FILE_MAX_CHARS),
      }
      const next = contextPrompts.map((p) =>
        p.id === activeContextPromptId
          ? { ...p, referenceFiles: [...(p.referenceFiles || []), file], updatedAt: Date.now() }
          : p,
      )
      await saveContextPrompts(next)
    } catch (e) {
      console.error('[profile] upload reference file:', e)
    } finally {
      setUploadBusy(false)
    }
  }

  const removeReferenceFile = async (fileId) => {
    if (!activeContextPromptId) return
    const next = contextPrompts.map((p) =>
      p.id === activeContextPromptId
        ? {
            ...p,
            referenceFiles: (p.referenceFiles || []).filter((f) => f.id !== fileId),
            updatedAt: Date.now(),
          }
        : p,
    )
    await saveContextPrompts(next)
  }

  const deletePromptById = async (id) => {
    if (!id) return
    const next = contextPrompts.filter((p) => p.id !== id)
    const nextHist = (contextPromptHistory || []).filter((h) => h !== id)
    setContextPromptHistory(nextHist)
    await save('contextPromptHistory', nextHist)
    await saveContextPrompts(next)
    if (activeContextPromptId === id) {
      if (next[0]) {
        await selectContextPrompt(next[0].id)
      } else {
        setActiveContextPromptId('')
        setDraftName('')
        setDraftContent('')
        setDraftNotesSections([])
        await save('activeContextPromptId', '')
      }
    }
  }

  const activePrompt = contextPrompts.find((p) => p.id === activeContextPromptId) || null

  const launchFromSetup = async () => {
    try {
      await save('contextPrompts', contextPrompts)
      await save('hasCompletedOnboarding', true)
      setHasCompletedOnboarding(true)
    } catch (e) {
      console.error(e)
    }
    ipc?.send('complete-onboarding')
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

  useEffect(() => {
    if (!ipc) return
    const onIndex = () => setContextIndexing(false)
    const onPrompt = (_, payload) => {
      if (payload?.activeContextPromptId != null) {
        setActiveContextPromptId(payload.activeContextPromptId)
      }
    }
    ipc.on('context-index-update', onIndex)
    ipc.on('context-prompt-update', onPrompt)
    return () => {
      ipc.removeAllListeners('context-index-update')
      ipc.removeAllListeners('context-prompt-update')
    }
  }, [])

  const connectGoogleCalendar = async () => {
    if (!ipc) return
    setCalendarErr('')
    setCalendarConnectBusy(true)
    try {
      // If credentials were typed into the dev section, save them first
      if (!googleCalendarOAuthReady) {
        const id = String(googleCalendarClientId || '').trim()
        const secret = String(googleCalendarClientSecret || '').trim()
        if (!id || !secret || secret === '••••••••') {
          throw new Error('No OAuth credentials configured. Use the Developer setup section to enter your client ID and secret.')
        }
        await save('googleCalendarClientId', id)
        await save('googleCalendarClientSecret', secret)
      }
      const res = await ipc.invoke('google-calendar:connect')
      setGoogleCalendarConnectedEmail(res?.connectedEmail || '')
      setGoogleCalendarOAuthReady(true)
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

  const applyStealthMode = async (v) => {
    setStealthModeUi(!!v)
    patchSnap('stealth_mode', !!v)
    await ipc?.invoke('protection:set', !!v)
  }

  const applyOpacityPreset = async (pct) => {
    const v = Math.min(1, Math.max(0.35, pct / 100))
    await applyOverlayOpacity(v)
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

      <header className="relative z-20 shrink-0 border-b border-white/[0.06] bg-black/30 px-5 py-3.5 backdrop-blur-xl lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-xl bg-accent/15 blur-xl" aria-hidden="true" />
            <img src={logoSrc} alt="" className="relative h-9 w-9 rounded-xl object-contain" draggable={false} />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-[17px] font-semibold leading-tight tracking-tight text-white">VeilAssist</h1>
            <p className="mt-0.5 text-[11px] text-zinc-500">Settings &amp; Configuration</p>
          </div>
        </div>
        {showSetupBanner && (
          <p className="mt-2 text-[12px] text-zinc-500">
            Finish first-time setup under Session: chat provider, API key, and model.
          </p>
        )}
      </header>

      {showSetupBanner && (
        <div className="relative z-20 shrink-0 border-b border-accent/20 bg-accent/[0.06] px-5 py-2 lg:px-8">
          <p className="text-[12px] font-medium text-accent-light/90">
            First run: open Session, set chat provider, API key, and model, then launch.
          </p>
        </div>
      )}

      <div className="relative z-20 flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <nav className="flex w-[196px] shrink-0 flex-col gap-0.5 border-r border-white/[0.06] bg-black/20 px-2 py-3">
          {SETTINGS_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`settings-nav-btn group flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left ${
                activeTab === t.id ? 'settings-nav-btn-active' : 'text-zinc-500'
              }`}
            >
              <NavIcon id={t.id} />
              <div className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">{t.label}</span>
                <span className="settings-nav-sub mt-0.5 block text-[10px] text-zinc-600 group-hover:text-zinc-500">{t.sub}</span>
              </div>
              {activeTab === t.id && (
                <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              )}
            </button>
          ))}
        </nav>

        <main className="settings-scroll-outer min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8">
          {activeTab === 'profile' && (
            <ProfileModesPanel
              contextPrompts={contextPrompts}
              activeContextPromptId={activeContextPromptId}
              activePrompt={activePrompt}
              draftName={draftName}
              draftContent={draftContent}
              draftNotesSections={draftNotesSections}
              onDraftNotesSectionsChange={setDraftNotesSections}
              contextIndexing={contextIndexing}
              uploadBusy={uploadBusy}
              showTemplates={showModeTemplates}
              onDraftNameChange={setDraftName}
              onDraftContentChange={setDraftContent}
              onSelectPrompt={selectContextPrompt}
              onAddEmptyMode={addContextPrompt}
              onAddFromTemplate={addModeFromTemplate}
              onDeletePrompt={deletePromptById}
              onSavePrompt={saveActivePrompt}
              onUploadFile={uploadReferenceFile}
              onRemoveFile={removeReferenceFile}
              onToggleTemplates={() => setShowModeTemplates((v) => !v)}
            />
          )}

          {activeTab === 'display' && (
            <div className="mx-auto max-w-3xl animate-fade-in space-y-5">
              <section className="glass-panel p-6">
                <SectionTitle className="text-base">Overlay</SectionTitle>

                <div className="mt-6 space-y-7">
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
                        <ToggleSwitch checked={overlayTeleprompterUi} onChange={applyOverlayTeleprompter} />
                      </label>
                      <label className="settings-row-tile flex cursor-pointer items-center justify-between gap-4">
                        <div>
                          <span className="font-medium text-gray-200">Focus mode</span>
                          <p className="text-xs text-gray-600">Hide the input bar until you tap — more room for answers.</p>
                        </div>
                        <ToggleSwitch checked={overlayFocusModeUi} onChange={applyOverlayFocusMode} />
                      </label>
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
                    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-mist-400">Stealth mode</label>
                    <label className="settings-row-tile flex cursor-pointer items-center justify-between gap-4">
                      <div>
                        <span className="font-medium text-gray-200">Hide from screen capture</span>
                        <p className="text-xs text-gray-600">
                          Uses OS content protection so the overlay is harder to pick up in screen shares and recordings.
                          Also toggled from the overlay visibility control.
                        </p>
                      </div>
                      <ToggleSwitch checked={stealthModeUi} onChange={applyStealthMode} />
                    </label>
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
              <section className="glass-panel overflow-hidden">
                <div className="border-b border-white/[0.06] px-6 py-4">
                  <SectionTitle className="text-sm">Capture</SectionTitle>
                </div>
                <div className="space-y-3 px-6 pb-6 pt-5">
                  <label className="settings-row-tile flex cursor-pointer items-center justify-between gap-4">
                    <div>
                      <span className="text-[13px] font-medium text-gray-200">Screen reading (OCR)</span>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-600">
                        Captured on-demand when you trigger the assistant — not continuously in the background.
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={ocrEnabled}
                      onChange={(v) => {
                        setOcrEnabled(v)
                        save('ocrEnabled', v)
                      }}
                    />
                  </label>
                  <label className="settings-row-tile flex cursor-pointer items-center justify-between gap-4">
                    <div>
                      <span className="text-[13px] font-medium text-gray-200">Microphone / audio</span>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-600">Transcribed in fixed-length chunks when Listen is active.</p>
                    </div>
                    <ToggleSwitch
                      checked={audioEnabled}
                      onChange={(v) => {
                        setAudioEnabled(v)
                        save('audioEnabled', v)
                      }}
                    />
                  </label>
                  <div className="settings-row-tile flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <span className="text-[13px] font-medium text-gray-200">Mic sensitivity</span>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-600">
                        Boost helps quiet microphones — restart Listen after changing.
                      </p>
                    </div>
                    <select
                      value={micSensitivity}
                      onChange={(e) => {
                        const v = e.target.value === 'boost' ? 'boost' : 'standard'
                        setMicSensitivity(v)
                        save('micSensitivity', v)
                      }}
                      className="input-shadow w-full shrink-0 px-3 py-2 text-sm sm:w-52"
                    >
                      <option value="standard" className="bg-void-900">Standard</option>
                      <option value="boost" className="bg-void-900">Boost (quiet mic)</option>
                    </select>
                  </div>
                </div>
              </section>

              <section className="glass-panel overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
                  <SectionTitle className="text-sm">Chat</SectionTitle>
                </div>
                <div className="space-y-5 px-6 pb-6 pt-5">
                  {!snap || !providerMeta.length ? (
                    <p className="text-sm text-gray-500">Loading providers…</p>
                  ) : (
                    <>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Provider
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
                        <div className="space-y-4 rounded-xl border border-white/[0.08] bg-black/25 px-4 py-4">
                          {/* Vendor header row */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-semibold text-white">{chatVendor.label}</span>
                              {chatKeySaved && (
                                <span className="rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-400">
                                  Key saved
                                </span>
                              )}
                            </div>
                            {chatVendor.docs ? (
                              <a
                                href={chatVendor.docs}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-zinc-500 transition-colors hover:text-zinc-300"
                              >
                                Get API key ↗
                              </a>
                            ) : null}
                          </div>

                          {chatVendor.kind === 'anthropic' && (
                            <p className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-[11px] leading-relaxed text-zinc-400">
                              Claude uses the Anthropic Messages API — not OpenAI-compatible. Model ID must match your Anthropic account.
                            </p>
                          )}

                          {chatVendor.usesCustomBase && (
                            <div>
                              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                                Base URL
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

                          {/* API key */}
                          <div>
                            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                              API Key
                            </label>
                            <div className="flex flex-wrap gap-2">
                              <input
                                type="password"
                                value={secretByProvider[chatVendor.id] ?? ''}
                                onChange={(e) =>
                                  setSecretByProvider((m) => ({ ...m, [chatVendor.id]: e.target.value }))
                                }
                                placeholder={chatKeySaved ? '••••••••' : 'Paste API key here'}
                                className="input-shadow min-w-[200px] flex-1 px-3 py-2.5"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  chatKf && saveKey(chatKf, secretByProvider[chatVendor.id] || '', chatVendor.id)
                                }
                                className="btn-ghost px-4 py-2.5 text-[13px]"
                              >
                                Save key
                              </button>
                            </div>
                          </div>

                          {/* Model selector */}
                          {chatMf && chatOpts.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-end gap-2">
                                <div className="min-w-[min(100%,320px)] flex-1">
                                  <ModelSelect
                                    label={`Model — ${chatOpts.length} available`}
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
                                  {chatListLoading ? 'Syncing…' : 'Sync models'}
                                </button>
                              </div>
                              {chatListErr ? (
                                <p className="text-[11px] text-rose-300/80">{chatListErr}</p>
                              ) : null}
                            </div>
                          )}

                          {chatMf && chatOpts.length === 0 && (
                            <div className="space-y-2">
                              <ModelInput
                                label={
                                  chatListLoading
                                    ? 'Loading models…'
                                    : chatKeySaved
                                      ? 'Model ID'
                                      : 'Model ID (save API key first)'
                                }
                                value={chatModel}
                                onChange={(v) => patchSnap(chatMf, v)}
                                onCommit={(v) => save(chatMf, v)}
                                suggestions={
                                  modelCatalog[chatVendor.id] ||
                                  (chatVendor.defaultModel ? [chatVendor.defaultModel] : [])
                                }
                                hint="Save your key, then use Sync models to load the full list."
                              />
                              {chatKeySaved ? (
                                <button
                                  type="button"
                                  onClick={() => syncRemoteModelsFor(chatVendor.id)}
                                  disabled={chatListLoading}
                                  className="btn-ghost whitespace-nowrap px-4 py-2.5 text-xs"
                                >
                                  {chatListLoading ? 'Syncing…' : 'Sync models'}
                                </button>
                              ) : null}
                              {chatListErr ? (
                                <p className="text-[11px] text-rose-300/80">{chatListErr}</p>
                              ) : null}
                            </div>
                          )}

                          {/* Divider + test row */}
                          <div className="border-t border-white/[0.06] pt-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              {chatTest ? (
                                <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] ${
                                  chatTest.success
                                    ? 'border-white/[0.08] bg-white/[0.04] text-zinc-300'
                                    : 'border-rose-500/20 bg-rose-500/[0.07] text-rose-300'
                                }`}>
                                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${chatTest.success ? 'bg-white/60' : 'bg-rose-400'}`} />
                                  {chatTest.success ? 'Connection verified' : chatTest.error}
                                </div>
                              ) : (
                                <span className="text-[11px] text-zinc-600">Run a test to verify your key.</span>
                              )}
                              <button
                                type="button"
                                onClick={() => testApiFor(chatVendor.id)}
                                disabled={chatTesting}
                                className="btn-ghost shrink-0 px-5 py-2 text-[13px] disabled:opacity-50"
                              >
                                {chatTesting ? 'Testing…' : 'Test connection'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>

              <section className="glass-panel overflow-hidden">
                <div className="border-b border-white/[0.06] px-6 py-4">
                  <SectionTitle className="text-sm">Transcription</SectionTitle>
                </div>
                <div className="space-y-5 px-6 pb-6 pt-5">
                  {snap && (
                    <>
                      <div className="space-y-4">
                        <div>
                          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                            Provider
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {sttCapableMeta.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setSttProvider(p.id)
                                  save('sttProvider', p.id)
                                }}
                                className={`settings-chip settings-chip-sm !normal-case ${sttProvider === p.id ? 'settings-chip-active' : ''}`}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {sttKeyField && (
                          <div>
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                                {currentSttMeta?.label || 'STT'} API Key
                              </label>
                              {sttKeySaved && (
                                <span className="rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-400">
                                  Key saved
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <input
                                type="password"
                                value={sttSecretInput}
                                onChange={(e) => setSttSecretInput(e.target.value)}
                                placeholder={sttKeySaved ? '••••••••' : `Paste ${currentSttMeta?.label || 'STT'} API key`}
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
                                Save key
                              </button>
                            </div>
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
                        <div className="rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">STT model</span>
                          <p className="mt-1 font-mono text-sm text-gray-300">whisper-1</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>

              {showSetupBanner && (
                <button type="button" onClick={launchFromSetup} className="btn-glow w-full py-4 text-base">
                  Launch VeilAssist
                </button>
              )}
            </div>
          )}

          {activeTab === 'meetings' && (
            <div className="mx-auto max-w-3xl animate-fade-in space-y-5">
              <section className="glass-panel p-8">
                <SectionTitle className="text-lg">Meeting detection</SectionTitle>
                <label className="settings-row-tile mt-6 flex cursor-pointer items-center justify-between gap-4">
                  <div>
                    <span className="font-medium text-gray-200">Detect Meet & Teams</span>
                    <p className="mt-1 text-xs text-gray-600">
                      Shows a one-time toast per meeting window. Does not use your calendar or microphone.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={meetingForegroundDetectionEnabled}
                    onChange={(v) => {
                      setMeetingForegroundDetectionEnabled(v)
                      save('meetingForegroundDetectionEnabled', v)
                    }}
                  />
                </label>
              </section>

              <section className="glass-panel p-8">
                <SectionTitle className="text-lg">Calendar</SectionTitle>
                <p className="mt-1 text-sm text-gray-500">
                  Manage the calendar account VeilAssist uses to show meetings and reminders.
                </p>

                {/* Google Calendar connect card */}
                <div className="mt-6 rounded-xl border border-white/[0.08] bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                        <img
                          src="https://ssl.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_31_2x.png"
                          alt="Google Calendar"
                          className="h-6 w-6 object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">Google Calendar</p>
                        <p className="text-xs text-gray-500">
                          {googleCalendarConnectedEmail
                            ? googleCalendarConnectedEmail
                            : 'Connect a Google personal or workspace account.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {googleCalendarConnectedEmail ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void refreshCalendarMeetings()}
                            disabled={calendarEventsLoading}
                            className="btn-ghost px-3 py-1.5 text-xs"
                          >
                            {calendarEventsLoading ? 'Refreshing…' : 'Refresh'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void disconnectGoogleCalendar()}
                            disabled={calendarConnectBusy}
                            className="btn-ghost px-3 py-1.5 text-xs text-rose-300"
                          >
                            Disconnect
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => void connectGoogleCalendar()}
                            disabled={calendarConnectBusy}
                            className="flex items-center gap-2 rounded-lg border border-white/15 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-100 disabled:opacity-60"
                          >
                            <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
                              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                              <path fill="none" d="M0 0h48v48H0z"/>
                            </svg>
                            {calendarConnectBusy ? 'Connecting…' : 'Connect'}
                          </button>
                          {calendarConnectBusy && (
                            <button
                              type="button"
                              onClick={() => void cancelGoogleCalendarConnect()}
                              className="btn-ghost px-3 py-1.5 text-xs text-amber-200"
                            >
                              Cancel
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status / error line */}
                  {calendarConnectBusy && (
                    <p className="mt-3 text-[11px] text-amber-200/80">
                      Waiting for Google sign-in in your browser…
                    </p>
                  )}
                  {!!calendarErr && (
                    <p className="mt-3 text-xs text-rose-300">{calendarErr}</p>
                  )}
                </div>

                {/* Start-time reminders */}
                <div className="mt-4 settings-row-tile flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-gray-200">Start-time reminders</span>
                    <p className="mt-1 text-xs text-gray-600">
                      Show a notification before accepted meetings start.
                    </p>
                  </div>
                  <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
                    <ToggleSwitch
                      checked={calendarRemindersEnabled}
                      onChange={(v) => {
                        setCalendarRemindersEnabled(v)
                        save('calendarRemindersEnabled', v)
                      }}
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

                {/* Dev-only: credential setup (hidden by default, shown only when no credentials are configured) */}
                {!googleCalendarOAuthReady && (
                  <details className="mt-4 rounded-xl border border-white/[0.06] bg-black/15 p-4">
                    <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600 hover:text-zinc-400">
                      Developer setup
                    </summary>
                    <div className="mt-3 space-y-3">
                      <p className="text-[11px] text-zinc-500">
                        Set <span className="font-mono">VEILASSIST_GOOGLE_CAL_CLIENT_ID</span> and <span className="font-mono">VEILASSIST_GOOGLE_CAL_CLIENT_SECRET</span> as GitHub Secrets, then rebuild — or paste credentials below for local testing.
                      </p>
                      <div className="settings-row-tile">
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-mist-400">
                          OAuth Client ID
                        </label>
                        <input
                          type="text"
                          value={googleCalendarClientId}
                          onChange={(e) => setGoogleCalendarClientId(e.target.value)}
                          onBlur={() => save('googleCalendarClientId', String(googleCalendarClientId || '').trim())}
                          placeholder="…apps.googleusercontent.com"
                          className="input-shadow w-full px-3 py-2.5 font-mono text-xs"
                        />
                      </div>
                      <div className="settings-row-tile">
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-mist-400">
                          OAuth Client Secret
                        </label>
                        <input
                          type="password"
                          value={googleCalendarClientSecret}
                          onChange={(e) => setGoogleCalendarClientSecret(e.target.value)}
                          placeholder="Stored on this device only"
                          className="input-shadow w-full px-3 py-2.5 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </details>
                )}
              </section>

              <section className="glass-panel p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <SectionTitle as="h3" className="text-sm">Meeting Summary</SectionTitle>
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
              <section className="glass-panel p-6">
                <SectionTitle as="h3" className="text-sm">What stays on this device</SectionTitle>
                <ul className="mt-4 space-y-2 text-sm leading-relaxed text-zinc-400">
                  <li className="flex gap-2">
                    <span className="text-accent">·</span>
                    <span>Profile notes, preferences, and encrypted API keys (Windows DPAPI).</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent">·</span>
                    <span>Session transcripts and OCR text in memory only — cleared when the session ends.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent">·</span>
                    <span>Audio is never stored. Only text sent to your chosen AI provider when you ask.</span>
                  </li>
                </ul>
              </section>

              <section className="glass-panel p-6">
                <SectionTitle as="h3" className="text-sm">Your data</SectionTitle>
                <p className="mt-2 text-xs text-zinc-500">
                  Export includes profile text, consent record, and preferences — not API keys, raw audio, or live buffers.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
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
                    Export my data
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!ipc) return
                      if (!window.confirm('Delete all local VeilAssist data and restart? This cannot be undone.')) return
                      await ipc.invoke('delete-all-data-relaunch')
                    }}
                    className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-5 py-2.5 text-sm font-semibold text-rose-200 hover:bg-rose-500/20"
                  >
                    Delete all my data
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="mx-auto max-w-xl animate-fade-in">
              <section className="glass-panel overflow-hidden">
                <div className="relative px-10 pb-8 pt-10 text-center">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" aria-hidden="true" />
                  <div className="relative mx-auto mb-5 h-20 w-20">
                    <div className="absolute inset-0 rounded-2xl bg-accent/20 blur-2xl" aria-hidden="true" />
                    <img
                      src={logoSrc}
                      alt="VeilAssist"
                      className="relative h-20 w-20 rounded-2xl object-contain"
                      draggable={false}
                    />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-white">VeilAssist</h2>
                  {appVersion ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 font-mono text-[11px] text-zinc-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                      v{appVersion}
                    </p>
                  ) : null}
                </div>
                <div className="border-t border-white/[0.06] px-8 pb-8 pt-6">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      { label: 'Undetectable', desc: 'Hidden from screen capture & shares' },
                      { label: 'AI-powered', desc: 'Answers from your chosen LLM provider' },
                      { label: 'Private', desc: 'Audio & OCR data never stored on disk' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3 text-center">
                        <p className="text-[11px] font-semibold text-white">{item.label}</p>
                        <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
      </div>
    </AppWindowFrame>
  )
}
