// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

const { app, BrowserWindow, ipcMain, globalShortcut, Tray, nativeImage, screen, dialog, Menu, clipboard, desktopCapturer } = require('electron')
const path = require('path')
const fs = require('fs')
const fsPromises = require('fs').promises

app.setPath('userData', path.join(app.getPath('appData'), 'ShadowAssist-v2'))
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
/** Skip default menu work when using frameless windows (Electron performance checklist). */
Menu.setApplicationMenu(null)

/** Windows: taskbar / Task Manager identity for the packaged app (not the generic Electron entry). */
if (process.platform === 'win32') {
  app.setAppUserModelId('com.local.shadowassist.v2')
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  // Second launch: first instance still holds the lock (often still in tray after “closing” the overlay)
  app.whenReady().then(() => {
    try {
      dialog.showMessageBoxSync({
        type: 'info',
        title: 'ShadowAssist',
        message: 'ShadowAssist is already running.',
        detail:
          'Closing the overlay does not quit the app — it stays in the system tray.\n\n' +
          '• Click ^ near the clock → find the ShadowAssist icon → right-click → Show\n' +
          '• Or press Ctrl+\\ to toggle the overlay\n' +
          '• Tray menu → Quit to fully exit\n\n' +
          'If you are sure it should not be running: close it from the tray, or run:\n' +
          '  npm run kill-electron\n' +
          'then npm start again. (kill-electron stops all electron.exe processes.)',
      })
    } catch (_) {}
    app.quit()
  })
} else {
const store = require('../lib/store')
const hotkeys = require('../lib/hotkeys')
const screenCapture = require('../lib/screenCapture')
const providers = require('../lib/providers')
const {
  getTranscriptionRequestConfig,
  NATIVE_STT_PROVIDER_IDS,
  STT_VENDOR_NOTES,
} = require('../lib/transcriptionRouting')
const sessionMemory = require('../lib/sessionMemory')

let aiClientModule = null
function getAiClient() {
  if (!aiClientModule) aiClientModule = require('../lib/aiClient')
  return aiClientModule
}
let listRemoteModelsFn = null
function getListRemoteModels() {
  if (!listRemoteModelsFn) listRemoteModelsFn = require('../lib/remoteModels').listRemoteModels
  return listRemoteModelsFn
}

const CONSENT_VERSION = '2.0'
const preloadPath = path.join(__dirname, '..', 'preload.js')

const useBuilt = fs.existsSync(path.join(__dirname, '..', 'out', 'overlay', 'index.html'))

/** Window / taskbar icon: dev uses repo root logo.png; packaged uses extraResources copy. */
function resolveAppIconPath() {
  if (app.isPackaged) {
    const p = path.join(process.resourcesPath, 'logo.png')
    return fs.existsSync(p) ? p : undefined
  }
  const p = path.join(__dirname, '..', 'logo.png')
  return fs.existsSync(p) ? p : undefined
}
const APP_ICON = resolveAppIconPath()

let overlayWindow = null
let settingsWindow = null
let tray = null
let sessionActive = false
let overlayVisible = true
let savedOpacity = 0.92
let screenOcrText = ''
let lastOcrTime = 0
let lastUsedOcrText = ''
let lastResponse = ''
let ocrIntervalId = null
let currentAbortController = null
let consentWindow = null
let onboardingWindow = null
let appCoreStarted = false

function createTrayIcon(active = false) {
  const size = 16
  const canvas = Buffer.alloc(size * size * 4)
  const color = active ? [34, 197, 94, 255] : [55, 65, 81, 255]
  for (let i = 0; i < size * size; i++) {
    const offset = i * 4
    const x = i % size
    const y = Math.floor(i / size)
    const r = Math.sqrt((x - size / 2) ** 2 + (y - size / 2) ** 2)
    const a = r < size / 2 - 1 ? 255 : 0
    canvas[offset] = color[0]; canvas[offset + 1] = color[1]
    canvas[offset + 2] = color[2]; canvas[offset + 3] = a
  }
  return nativeImage.createFromBuffer(canvas, { width: size, height: size })
}

function getDisplayBounds() {
  const d = screen.getPrimaryDisplay()
  const wa = d.workArea
  return { x: wa.x, y: wa.y, width: wa.width, height: wa.height }
}

/** Top-right of work area when x/y missing or window would be off-screen */
function seedOverlayPositionIfNeeded() {
  const display = getDisplayBounds()
  const prev = store.get('overlayBounds') || {}
  const w = Math.min(860, Math.max(280, prev.width || 400))
  const h = Math.min(940, Math.max(180, prev.height || 540))
  const defX = display.x + display.width - w - 40
  const defY = display.y + 80
  const hasXY = typeof prev.x === 'number' && !Number.isNaN(prev.x) && typeof prev.y === 'number' && !Number.isNaN(prev.y)
  let x = hasXY ? prev.x : defX
  let y = hasXY ? prev.y : defY
  const onScreen =
    x + 80 >= display.x &&
    x < display.x + display.width &&
    y + 40 >= display.y &&
    y < display.y + display.height
  if (!hasXY || !onScreen) {
    store.set('overlayBounds', { ...prev, x: defX, y: defY, width: w, height: h })
  }
}

function createOverlayWindow() {
  if (overlayWindow) return overlayWindow
  const savedBounds = store.get('overlayBounds') || {}
  const display = getDisplayBounds()
  const w = savedBounds.width || 400
  const h = savedBounds.height || 540
  const maxX = Math.max(display.x, display.x + display.width - Math.min(w, display.width))
  const maxY = Math.max(display.y, display.y + display.height - Math.min(h, display.height))
  let x = typeof savedBounds.x === 'number' ? savedBounds.x : display.x + display.width - w - 40
  let y = typeof savedBounds.y === 'number' ? savedBounds.y : display.y + Math.floor((display.height - h) / 2)
  if (x < display.x || x > maxX) x = maxX
  if (y < display.y || y > maxY) y = maxY
  savedOpacity = store.get('overlayOpacity') ?? 0.92

  // 'toolbar' can fail or behave oddly on some Windows setups — match stable shadowassist window
  const winOpts = {
    width: w, height: h, x, y,
    transparent: true, frame: false, alwaysOnTop: true, skipTaskbar: true,
    focusable: true, hasShadow: false, resizable: true,
    minWidth: 280, minHeight: 180, maxWidth: 860, maxHeight: 940,
    show: false,
    ...(APP_ICON ? { icon: APP_ICON } : {}),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      /** Avoid timer/animation throttling when the window loses focus (Chromium default). */
      backgroundThrottling: false,
    },
  }
  try {
    overlayWindow = new BrowserWindow(process.platform === 'darwin' ? { ...winOpts, type: 'toolbar' } : winOpts)
  } catch (e) {
    console.error('createOverlayWindow failed:', e)
    try {
      overlayWindow = new BrowserWindow(winOpts)
    } catch (e2) {
      console.error('createOverlayWindow retry failed:', e2)
      return null
    }
  }
  overlayWindow.setMenuBarVisibility(false)
  overlayWindow.loadFile(useBuilt
    ? path.join(__dirname, '..', 'out', 'overlay', 'index.html')
    : path.join(__dirname, '..', 'renderer', 'overlay', 'index.html'))

  overlayWindow.once('ready-to-show', () => {
    overlayWindow.show()
    applyContentProtectionAllWindows()
    overlayWindow.setAlwaysOnTop(true, 'screen-saver')
    overlayWindow.setVisibleOnAllWorkspaces(true)
    overlayWindow.setFullScreenable(false)
    // Opacity only after show — setting before first show breaks transparency on some Windows builds
    overlayWindow.setOpacity(overlayVisible ? savedOpacity : 0)
    syncOverlayMouseCapture()
  })
  overlayWindow.webContents.on('dom-ready', () => applyContentProtectionAllWindows())
  overlayWindow.webContents.on('did-fail-load', (_, code, desc, url) => {
    console.error('[overlay] did-fail-load', code, desc, url)
  })
  overlayWindow.on('closed', () => { overlayWindow = null })
  return overlayWindow
}

/** Stealth Mode ON → setContentProtection(true). On Windows this maps to WDA_EXCLUDEFROMCAPTURE. */
function isStealthModeEnabled() {
  return store.get('stealth_mode') === true
}

function applyContentProtectionAllWindows() {
  const enabled = isStealthModeEnabled()
  ;[overlayWindow, settingsWindow, consentWindow, onboardingWindow].forEach((win) => {
    if (win && !win.isDestroyed()) {
      try {
        win.setContentProtection(enabled)
      } catch (_) {}
    }
  })
}

/**
 * Desktop thumbnails pick up the overlay like any other window. Stealth already uses
 * setContentProtection to hide from capture; in normal mode we briefly enable it on the overlay
 * only while grabbing the screen so OCR/vision match “no overlay in shot” without full Stealth.
 */
async function withOverlayExcludedFromScreenCapture(fn) {
  if (!overlayWindow || overlayWindow.isDestroyed()) return fn()
  if (isStealthModeEnabled()) return fn()
  try {
    overlayWindow.setContentProtection(true)
    await new Promise((r) => setTimeout(r, 80))
    return await fn()
  } finally {
    applyContentProtectionAllWindows()
  }
}

function showOverlay() {
  overlayVisible = true
  if (tray?.updateTrayMenu) tray.updateTrayMenu()
  if (!overlayWindow) {
    createOverlayWindow()
    return
  }
  // Don't setOpacity before the window has been shown once — ready-to-show handles first paint
  if (!overlayWindow.isDestroyed() && overlayWindow.isVisible()) {
    overlayWindow.setOpacity(savedOpacity)
    syncOverlayMouseCapture()
    applyContentProtectionAllWindows()
  }
}

function hideOverlay() {
  overlayVisible = false
  if (tray?.updateTrayMenu) tray.updateTrayMenu()
  if (overlayWindow) {
    overlayWindow.setOpacity(0)
    syncOverlayMouseCapture()
    applyContentProtectionAllWindows()
  }
}

function toggleOverlay() { overlayVisible ? hideOverlay() : showOverlay() }

/**
 * While the overlay is shown, capture all mouse input on the window (no forward).
 * `forward: true` lets hover reach Chromium but often lets wheel / interaction leak to apps behind
 * (misaligned with “floating assistant” UX — cf. Electron issues on setIgnoreMouseEvents + wheel).
 */
function syncOverlayMouseCapture() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  if (overlayVisible) overlayWindow.setIgnoreMouseEvents(false)
  else overlayWindow.setIgnoreMouseEvents(true)
}

function hasValidConsent() {
  const r = store.get('consentRecord')
  return !!(r && r.given === true && r.version === CONSENT_VERSION)
}

function hasCompletedOnboardingFlag() {
  return store.get('hasCompletedOnboarding') === true
}

function finalizeBootstrap() {
  if (appCoreStarted) return
  appCoreStarted = true
  initApp().catch((err) => {
    console.error('[ShadowAssist-v2] initApp failed:', err)
    app.quit()
  })
}

/** After legal consent: run onboarding (BYOK + API test) or start tray/overlay. */
function continueAfterConsent() {
  if (appCoreStarted) return
  if (!hasCompletedOnboardingFlag()) {
    createOnboardingWindow()
    return
  }
  finalizeBootstrap()
}

function createConsentWindow() {
  if (consentWindow && !consentWindow.isDestroyed()) {
    consentWindow.focus()
    return
  }
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize
  const w = Math.min(520, Math.max(400, Math.floor(sw * 0.45)))
  const h = Math.min(700, Math.max(560, Math.floor(sh * 0.78)))
  consentWindow = new BrowserWindow({
    width: w,
    height: h,
    center: true,
    minWidth: 380,
    minHeight: 520,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    roundedCorners: true,
    ...(APP_ICON ? { icon: APP_ICON } : {}),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  })
  consentWindow.setMenuBarVisibility(false)
  consentWindow.loadFile(useBuilt
    ? path.join(__dirname, '..', 'out', 'consent', 'index.html')
    : path.join(__dirname, '..', 'renderer', 'consent', 'index.html'))
  consentWindow.on('closed', () => {
    consentWindow = null
    if (!appCoreStarted && !hasValidConsent()) app.quit()
  })
}

function createOnboardingWindow() {
  if (onboardingWindow && !onboardingWindow.isDestroyed()) {
    onboardingWindow.focus()
    return
  }
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize
  const w = Math.min(480, Math.max(400, Math.floor(sw * 0.46)))
  const h = Math.min(860, Math.max(620, Math.floor(sh * 0.88)))
  onboardingWindow = new BrowserWindow({
    width: w,
    height: h,
    center: true,
    minWidth: 380,
    minHeight: 560,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    roundedCorners: true,
    ...(APP_ICON ? { icon: APP_ICON } : {}),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  })
  onboardingWindow.setMenuBarVisibility(false)
  onboardingWindow.loadFile(useBuilt
    ? path.join(__dirname, '..', 'out', 'onboarding', 'index.html')
    : path.join(__dirname, '..', 'renderer', 'onboarding', 'index.html'))
  onboardingWindow.on('closed', () => {
    onboardingWindow = null
    if (!appCoreStarted && !hasCompletedOnboardingFlag()) app.quit()
  })
  onboardingWindow.once('ready-to-show', () => applyContentProtectionAllWindows())
}

function requestSessionStart() {
  if (sessionActive) return
  if (!overlayWindow || overlayWindow.isDestroyed()) createOverlayWindow()
  sendToOverlay('prompt-audio-consent')
}

function moveOverlay(dx, dy) {
  if (!overlayWindow) return
  const [x, y] = overlayWindow.getPosition()
  const [w, h] = overlayWindow.getSize()
  const d = getDisplayBounds()
  overlayWindow.setPosition(
    Math.max(d.x, Math.min(d.x + d.width - w, x + dx)),
    Math.max(d.y, Math.min(d.y + d.height - h, y + dy))
  )
  store.set('overlayBounds', { ...store.get('overlayBounds'), ...overlayWindow.getBounds() })
}

function createSettingsWindow() {
  if (settingsWindow) { settingsWindow.focus(); return }
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize
  const w = Math.min(1320, Math.max(1024, Math.floor(sw * 0.88)))
  const h = Math.min(760, Math.max(560, Math.floor(sh * 0.82)))
  settingsWindow = new BrowserWindow({
    width: w,
    height: h,
    minWidth: 1024,
    minHeight: 560,
    center: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    roundedCorners: true,
    ...(APP_ICON ? { icon: APP_ICON } : {}),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  })
  settingsWindow.loadFile(useBuilt
    ? path.join(__dirname, '..', 'out', 'settings', 'index.html')
    : path.join(__dirname, '..', 'renderer', 'settings', 'index.html'))
  settingsWindow.on('closed', () => { settingsWindow = null })
  settingsWindow.once('ready-to-show', () => applyContentProtectionAllWindows())
}

function setupTray() {
  tray = new Tray(createTrayIcon(false))
  tray.setToolTip('ShadowAssist — undetectable AI for meetings (tray: Show / Quit)')
  const updateTrayMenu = () => {
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: overlayVisible ? 'Hide' : 'Show', click: toggleOverlay },
      { type: 'separator' },
      { label: sessionActive ? 'Stop Session' : 'Start Session', click: () => (sessionActive ? stopSession() : requestSessionStart()) },
      { type: 'separator' },
      { label: 'Settings', click: createSettingsWindow },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]))
  }
  updateTrayMenu()
  tray.updateTrayMenu = updateTrayMenu
  tray.on('double-click', toggleOverlay)
}

function updateTrayIcon() { if (tray) tray.setImage(createTrayIcon(sessionActive)) }

function startOcrLoop() {
  if (ocrIntervalId) return
  const interval = Math.max(store.get('ocrInterval') || 8000, 5000)
  const runOcr = async () => {
    if (store.get('ocrEnabled') === false) return
    try {
      screenOcrText = await withOverlayExcludedFromScreenCapture(() => screenCapture.captureScreenText())
      lastOcrTime = Date.now()
      sessionMemory.addOcrSnapshot(screenOcrText)
      sendToOverlay('ocr-update', screenOcrText)
    } catch (e) { console.warn('OCR:', e.message) }
  }
  setTimeout(runOcr, 3000)
  ocrIntervalId = setInterval(runOcr, interval)
}

function stopOcrLoop() { if (ocrIntervalId) { clearInterval(ocrIntervalId); ocrIntervalId = null } }

function startSession() {
  if (sessionActive) return
  sessionActive = true
  sessionMemory.wipe()
  updateTrayIcon()
  if (tray?.updateTrayMenu) tray.updateTrayMenu()
  sendToOverlay('session-status', true)
}

function stopSession() {
  if (!sessionActive) return
  sessionActive = false
  sessionMemory.wipe()
  screenOcrText = ''
  lastUsedOcrText = ''
  sendToOverlay('session-purge')
  updateTrayIcon()
  if (tray?.updateTrayMenu) tray.updateTrayMenu()
  sendToOverlay('session-status', false)
}

/** Session lines included when overlay did not pass a buffer (shorter = less stale replay). */
const SESSION_TRANSCRIPT_MAX_AGE_MS = 12000
/** "Just spoke" — if within this, keep audio even when OCR was just refreshed. */
const VERY_RECENT_SPEECH_MS = 5000

const CONTEXT_ROUTING_RULES = `

---
## CONTEXT ROUTING (automatic)
- Treat ## AUDIO, ## SCREEN, and ## QUESTION as the authoritative inputs for this turn. Prefer AUDIO when it is present and answers a live question; prefer SCREEN when AUDIO is absent or TASK says to use the screen.
- If ## SCREEN is present without ## AUDIO, or AUDIO was omitted for this turn, base your answer on SCREEN (and the image if any), not on earlier conversation.
- If the screenshot likely includes this assistant's own overlay or a previous answer, do not repeat that answer unless the user clearly asks again.
- When ## QUESTION is present, it overrides generic TASK lines.`

/** Labels the overlay by what was actually included in the model request (session audio often arrives only on the main process). */
function deriveDisplayAskSource({ hasQuestion, hasAudio, includeScreen, hasVision }) {
  const vis = !!hasVision
  const scr = !!includeScreen || vis
  if (hasQuestion && hasAudio && scr) return 'prompt_audio_screen'
  if (hasQuestion && hasAudio) return 'prompt_audio'
  if (hasQuestion && scr && !hasAudio) return 'prompt_screen'
  if (hasQuestion) return 'prompt'
  if (hasAudio && scr) return 'audio_screen'
  if (hasAudio) return 'audio'
  if (scr) return 'screen'
  return 'context'
}

async function handleAskAI(userQuestion, audioTranscript, _askMeta = {}) {
  if (currentAbortController) { currentAbortController.abort(); currentAbortController = null }
  const abortController = new AbortController()
  currentAbortController = abortController

  const provider = store.get('provider') || 'groq'
  const keyField = providers.getApiKeyField(provider)
  const apiKey = store.get(keyField)
  if (!apiKey) {
    sendToOverlay('ai-error', 'No API key. Settings → paste your key.')
    currentAbortController = null
    return
  }

  sendToOverlay('ai-thinking', true)
  sessionMemory.touch()

  let ocrRefreshedThisAsk = false
  const ocrEnabled = store.get('ocrEnabled') !== false
  const ocrStale = !screenOcrText || (Date.now() - lastOcrTime) > 10000
  const wantVision = providers.supportsVision(provider)
  let visionB64 = null

  if ((ocrEnabled && ocrStale) || wantVision) {
    await withOverlayExcludedFromScreenCapture(async () => {
      if (ocrEnabled && ocrStale) {
        try {
          screenOcrText = await screenCapture.captureScreenText()
          lastOcrTime = Date.now()
          ocrRefreshedThisAsk = true
          sessionMemory.addOcrSnapshot(screenOcrText)
          sendToOverlay('ocr-update', screenOcrText)
        } catch (e) {
          console.warn('OCR:', e.message)
        }
      }
      if (wantVision) {
        try {
          visionB64 = await screenCapture.captureScreenForVision()
        } catch (_) {}
      }
    })
  }

  const systemPrompt = store.get('systemPrompt') || ''
  const resumeCtx = (store.get('resumeContext') || '').trim()
  const jdCtx = (store.get('jdContext') || '').trim()
  const playbookText = (store.get('playbooks') || []).filter(p => p.enabled).map(p => p.content).join('\n\n')
  const profileParts = []
  if (resumeCtx) profileParts.push(`## YOUR BACKGROUND (from uploaded profile)\nUse this to align meeting suggestions with your real experience, skills, and history. Do not invent employers or dates beyond this text.\n\n${resumeCtx}`)
  if (jdCtx) profileParts.push(`## ROLE / MEETING CONTEXT (notes or JD)\nTailor talking points to this team, product, or role when relevant.\n\n${jdCtx}`)
  const profileBlock = profileParts.length ? `\n\n---\n${profileParts.join('\n\n---\n')}` : ''
  let fullSystem = `${systemPrompt}${profileBlock}${CONTEXT_ROUTING_RULES}`
  if (playbookText) fullSystem = `${fullSystem}\n\n---\n## REFERENCE PLAYBOOKS\n${playbookText}`

  const getStore = (k) => store.get(k)
  const model = providers.getModelForProvider(provider, getStore)

  const overlayAudio = (audioTranscript || '').trim()
  const userQ = (userQuestion || '').trim()
  const veryRecent = sessionMemory.getTranscriptIfRecent(VERY_RECENT_SPEECH_MS)

  let audioCombined = overlayAudio
  if (!audioCombined && userQ) {
    audioCombined = sessionMemory.getTranscriptIfRecent(SESSION_TRANSCRIPT_MAX_AGE_MS)
  }
  if (!audioCombined && !userQ) {
    audioCombined = veryRecent
  }

  const screenT = (screenOcrText || '').trim()
  const ocrChanged = !!screenT && screenT !== (lastUsedOcrText || '').trim()

  if (!overlayAudio && !userQ && ocrRefreshedThisAsk && screenT && !veryRecent) {
    audioCombined = ''
  }

  const contextParts = []
  if (audioCombined) contextParts.push(`## AUDIO\n${audioCombined}`)

  const includeScreen = !!(
    screenT &&
    (ocrChanged || ocrRefreshedThisAsk || !audioCombined)
  )
  if (includeScreen) {
    contextParts.push(`## SCREEN\n${screenT}`)
    lastUsedOcrText = screenOcrText
  }

  const hasAudio = !!audioCombined
  const hasQuestion = !!userQ
  contextParts.push(
    hasQuestion
      ? `## QUESTION\n${userQ}`
      : hasAudio
        ? '## TASK\nAnswer based on the audio above.'
        : includeScreen
          ? '## TASK\nAnswer based on the screen content (text and image). Do not repeat a prior answer unless the screen shows a new question.'
          : '## TASK\nAnswer using the available context.',
  )

  const content = [{ type: 'text', text: contextParts.join('\n\n') }]
  if (visionB64) {
    content.unshift({ type: 'image_url', image_url: { url: `data:image/png;base64,${visionB64}` } })
  }

  const hasVision = !!visionB64
  const displayAskSource = deriveDisplayAskSource({
    hasQuestion,
    hasAudio,
    includeScreen,
    hasVision,
  })
  const MAX_TRANSCRIPT_ECHO = 8000
  const transcriptEcho =
    hasAudio && audioCombined
      ? (() => {
          const t = String(audioCombined).trim()
          if (!t) return null
          return t.length > MAX_TRANSCRIPT_ECHO ? `${t.slice(0, MAX_TRANSCRIPT_ECHO)}\n\n… (truncated)` : t
        })()
      : null
  sendToOverlay('ai-start', { askSource: displayAskSource, transcriptEcho })

  try {
    const messages = [{ role: 'system', content: fullSystem }, { role: 'user', content: content.length === 1 ? content[0].text : content }]
    let fullText = ''
    for await (const token of getAiClient().streamChat(provider, apiKey, { messages, model, maxTokens: 1024, signal: abortController.signal }, getStore)) {
      if (abortController.signal.aborted) break
      fullText += token
      sendToOverlay('ai-token', token)
    }
    if (!abortController.signal.aborted) lastResponse = fullText
  } catch (err) {
    if (err.name === 'AbortError' || abortController.signal.aborted) sendToOverlay('ai-aborted')
    else sendToOverlay('ai-error', err.message || 'Request failed')
  } finally {
    if (currentAbortController === abortController) currentAbortController = null
    sendToOverlay('ai-thinking', false)
  }
}

function sendToOverlay(channel, ...args) {
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.webContents.send(channel, ...args)
}

const UI_ACCENT_THEME_IDS = new Set([
  'neon', 'mint', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'fuchsia', 'pink', 'rose', 'red',
  'orange', 'amber', 'lime', 'copper', 'bronze', 'mocha', 'walnut', 'chocolate', 'espresso',
])
function isValidUiAccentThemeId(id) {
  return typeof id === 'string' && UI_ACCENT_THEME_IDS.has(id)
}

function sendToSettingsWindow(channel, ...args) {
  if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.webContents.send(channel, ...args)
}

function setupHotkeys() {
  hotkeys.register('toggleOverlay', toggleOverlay)
  hotkeys.register('askAI', () => sendToOverlay('trigger-ask-ai'))
  hotkeys.register('clearChat', () => { sendToOverlay('clear-conversation'); lastResponse = ''; lastUsedOcrText = '' })
  hotkeys.register('toggleSession', () => (sessionActive ? stopSession() : requestSessionStart()))
  hotkeys.register('moveUp', () => moveOverlay(0, -40))
  hotkeys.register('moveDown', () => moveOverlay(0, 40))
  hotkeys.register('moveLeft', () => moveOverlay(-40, 0))
  hotkeys.register('moveRight', () => moveOverlay(40, 0))
  hotkeys.register('scrollUp', () => sendToOverlay('scroll', -1))
  hotkeys.register('scrollDown', () => sendToOverlay('scroll', 1))
  hotkeys.register('settings', createSettingsWindow)
  hotkeys.register('copyResponse', () => { if (lastResponse) clipboard.writeText(lastResponse) })
  hotkeys.registerAll()
}

function setupIPC() {
  ipcMain.handle('protection:set', (_, enabled) => {
    const v = !!enabled
    store.set('stealth_mode', v)
    applyContentProtectionAllWindows()
    sendToOverlay('stealth-mode-update', v)
    return v
  })
  ipcMain.handle('protection:get', () => !!store.get('stealth_mode'))

  const windowFromSender = (e) => BrowserWindow.fromWebContents(e.sender)
  ipcMain.handle('window:minimize', (e) => {
    windowFromSender(e)?.minimize()
  })
  ipcMain.handle('window:maximize-toggle', (e) => {
    const win = windowFromSender(e)
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.handle('window:close', (e) => {
    windowFromSender(e)?.close()
  })
  ipcMain.handle('consent:complete', (_, payload) => {
    const ok = payload && payload.c1 && payload.c2 && payload.c3 && payload.c4
    if (!ok) return { ok: false }
    const record = { version: CONSENT_VERSION, date: new Date().toISOString(), given: true }
    store.set('consentRecord', record)
    store.set('consent_v1', true)
    continueAfterConsent()
    if (consentWindow && !consentWindow.isDestroyed()) consentWindow.close()
    return { ok: true }
  })
  ipcMain.handle('consent:decline', () => {
    app.quit()
    return true
  })
  ipcMain.handle('session-start-confirmed', () => {
    if (!sessionActive) startSession()
    return true
  })
  ipcMain.handle('path-basename', (_, p) => path.basename(String(p || '')))
  ipcMain.handle('clipboard-write-text', (_, text) => {
    clipboard.writeText(String(text ?? ''))
    return true
  })
  ipcMain.handle('session-transcript-append', (_, segment) => {
    sessionMemory.appendTranscriptSegment(segment)
    return true
  })
  ipcMain.handle('delete-all-data-relaunch', () => {
    store.clear()
    hotkeys.registerAll()
    app.relaunch()
    app.exit(0)
    return true
  })
  ipcMain.handle('export-user-data', async () => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: 'shadowassist_data_export.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (canceled || !filePath) return { ok: false, canceled: true }
    const payload = {
      exportedAt: new Date().toISOString(),
      systemPrompt: store.get('systemPrompt'),
      resumeContext: store.get('resumeContext'),
      jdContext: store.get('jdContext'),
      resumeSourceName: store.get('resumeSourceName'),
      consentRecord: store.get('consentRecord'),
      consent_v1: store.get('consent_v1'),
      playbooks: (store.get('playbooks') || []).map((p) => ({
        title: p.title,
        enabled: p.enabled,
        name: p.name,
      })),
    }
    await fsPromises.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8')
    return { ok: true, path: filePath }
  })

  ipcMain.handle('get-store', (_, key) => store.get(key))
  ipcMain.handle('set-store', (_, key, value) => {
    let stored = value
    if (key === 'stealth_mode') {
      store.set('stealth_mode', !!value)
      applyContentProtectionAllWindows()
      sendToOverlay('stealth-mode-update', !!value)
      return true
    }
    if (key === 'uiAccentTheme') {
      stored = isValidUiAccentThemeId(value) ? value : store.schema.uiAccentTheme.default
    }
    store.set(key, stored)
    if (key === 'uiAccentTheme') {
      sendToOverlay('ui-accent-update', stored)
      sendToSettingsWindow('ui-accent-update', stored)
    }
    if (key === 'ocrInterval') {
      stopOcrLoop()
      startOcrLoop()
    }
    if (key === 'ocrInterval' || key === 'audioChunkSize') {
      sendToOverlay('session-timing-update', {
        ocrInterval: store.get('ocrInterval'),
        audioChunkSize: store.get('audioChunkSize'),
      })
    }
    return true
  })
  ipcMain.handle('reset-session-timing-defaults', () => {
    const ocrDef = store.schema.ocrInterval.default
    const audioDef = store.schema.audioChunkSize.default
    store.set('ocrInterval', ocrDef)
    store.set('audioChunkSize', audioDef)
    stopOcrLoop()
    startOcrLoop()
    sendToOverlay('session-timing-update', { ocrInterval: ocrDef, audioChunkSize: audioDef })
    return { ocrInterval: ocrDef, audioChunkSize: audioDef }
  })
  ipcMain.handle('get-all-settings', () => store.getAll())
  ipcMain.handle('test-api', async (_, provider, key) => {
    return getAiClient().testConnection(provider, key, (k) => store.get(k))
  })
  ipcMain.handle('get-provider-metadata', () => require('../lib/providers').getProviderMetadataForUI())
  ipcMain.handle('get-transcription-config', () => getTranscriptionRequestConfig((k) => store.get(k)))
  ipcMain.handle('list-remote-models', async (_, provider) => getListRemoteModels()(provider, (k) => store.get(k)))
  ipcMain.handle('get-stt-policy', () => ({
    nativeSttProviderIds: NATIVE_STT_PROVIDER_IDS,
    vendorNotes: STT_VENDOR_NOTES,
  }))
  ipcMain.handle('get-chat-model-catalog', () => require('../lib/chatModelCatalog.json'))
  ipcMain.handle('ask-ai-with-transcript', (_, q, t, meta) => handleAskAI(q, t, meta))
  ipcMain.handle('session-active', () => sessionActive)
  ipcMain.handle('get-hotkeys', () => store.get('hotkeys') || hotkeys.DEFAULT_HOTKEYS)
  ipcMain.handle('update-hotkey', (_, action, acc) => hotkeys.updateHotkey(action, acc))
  ipcMain.handle('clear-all-data', () => { store.clear(); hotkeys.registerAll() })
  ipcMain.handle('get-desktop-source-id', () => screenCapture.getDesktopSourceId())
  ipcMain.handle('show-open-dialog', (_, opts) => dialog.showOpenDialog(opts))
  ipcMain.handle('parse-playbook', (_, p) => require('../lib/playbookParser').parsePlaybookFile(p))
  ipcMain.handle('get-window-bounds', () => overlayWindow ? overlayWindow.getBounds() : store.get('overlayBounds'))
  ipcMain.handle('save-window-bounds', () => { if (overlayWindow) store.set('overlayBounds', overlayWindow.getBounds()) })
  /** Optional `x` keeps the right edge fixed when resizing from the left (frameless overlay). */
  ipcMain.handle('resize-window', (_, w, h, xOpt) => {
    if (!overlayWindow) return
    const b = overlayWindow.getBounds()
    const safeW = Math.max(280, Math.min(860, Math.round(w)))
    const useX = typeof xOpt === 'number' && !Number.isNaN(xOpt)
    if (h <= 40) {
      overlayWindow.setMinimumSize(safeW, 1)
      const safeH = Math.max(35, Math.min(940, Math.round(h)))
      if (useX) {
        overlayWindow.setBounds({ x: Math.round(xOpt), y: b.y, width: safeW, height: safeH })
      } else {
        overlayWindow.setSize(safeW, safeH)
      }
    } else {
      overlayWindow.setMinimumSize(280, 180)
      const safeH = Math.max(180, Math.min(940, Math.round(h)))
      if (useX) {
        overlayWindow.setBounds({ x: Math.round(xOpt), y: b.y, width: safeW, height: safeH })
      } else {
        overlayWindow.setSize(safeW, safeH)
      }
    }
  })
  ipcMain.handle('set-overlay-position-preset', (_, preset) => {
    const d = getDisplayBounds()
    const w = store.get('overlayBounds')?.width || 400
    const h = store.get('overlayBounds')?.height || 540
    const m = 20
    const pos = {
      'Top-Right': { x: d.x + d.width - w - m, y: d.y + m },
      'Top-Left': { x: d.x + m, y: d.y + m },
      'Bottom-Right': { x: d.x + d.width - w - m, y: d.y + d.height - h - m },
      'Bottom-Left': { x: d.x + m, y: d.y + d.height - h - m },
      'Center-Right': { x: d.x + d.width - w - m, y: d.y + Math.floor((d.height - h) / 2) },
    }[preset] || { x: d.x + d.width - w - m, y: d.y + Math.floor((d.height - h) / 2) }
    store.set('overlayBounds', { ...store.get('overlayBounds'), ...pos, width: w, height: h })
    if (overlayWindow) overlayWindow.setPosition(pos.x, pos.y)
  })
  ipcMain.on('overlay-resize-end', () => { if (overlayWindow) store.set('overlayBounds', overlayWindow.getBounds()) })
  ipcMain.on('overlay-hide', hideOverlay)
  ipcMain.on('open-settings', createSettingsWindow)
  ipcMain.on('ui-toggle-session', () => (sessionActive ? stopSession() : requestSessionStart()))
  ipcMain.on('overlay-opacity-change', (_, o) => {
    const clamped = Math.min(1, Math.max(0.35, Number(o) || 0.92))
    savedOpacity = clamped
    store.set('overlayOpacity', clamped)
    if (overlayWindow && overlayVisible && !overlayWindow.isDestroyed()) overlayWindow.setOpacity(clamped)
    sendToOverlay('overlay-display-update', { overlayOpacity: clamped })
  })

  /** Persist + push to overlay window/renderer (opacity, font, size) */
  ipcMain.handle('apply-overlay-display', (_, opts) => {
    if (!opts || typeof opts !== 'object') return { ok: false, error: 'invalid' }
    try {
      if (typeof opts.overlayOpacity === 'number') {
        const o = Math.min(1, Math.max(0.35, opts.overlayOpacity))
        store.set('overlayOpacity', o)
        savedOpacity = o
        if (overlayWindow && !overlayWindow.isDestroyed()) {
          if (overlayVisible) overlayWindow.setOpacity(o)
        }
        sendToOverlay('overlay-display-update', { overlayOpacity: o })
      }
      if (opts.overlayFontSize && ['small', 'medium', 'large'].includes(opts.overlayFontSize)) {
        store.set('overlayFontSize', opts.overlayFontSize)
        sendToOverlay('overlay-display-update', { overlayFontSize: opts.overlayFontSize })
      }
      if (typeof opts.width === 'number' || typeof opts.height === 'number') {
        const prev = store.get('overlayBounds') || {}
        const w = typeof opts.width === 'number'
          ? Math.min(860, Math.max(280, Math.round(opts.width)))
          : (prev.width || 400)
        const h = typeof opts.height === 'number'
          ? Math.min(940, Math.max(180, Math.round(opts.height)))
          : (prev.height || 540)
        store.set('overlayBounds', { ...prev, width: w, height: h })
        if (overlayWindow && !overlayWindow.isDestroyed()) {
          const curH = overlayWindow.getSize()[1]
          // Collapsed bar (~38px) — only change width so we don't pop the panel open
          if (curH <= 48) overlayWindow.setSize(w, curH)
          else overlayWindow.setSize(w, h)
        }
        sendToOverlay('overlay-display-update', { width: w, height: h })
      }
      if (opts.uiAccentTheme !== undefined) {
        const v = isValidUiAccentThemeId(opts.uiAccentTheme)
          ? opts.uiAccentTheme
          : (store.get('uiAccentTheme') || store.schema.uiAccentTheme.default)
        store.set('uiAccentTheme', v)
        sendToOverlay('ui-accent-update', v)
        sendToSettingsWindow('ui-accent-update', v)
      }
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })
  ipcMain.on('complete-onboarding', () => {
    store.set('hasCompletedOnboarding', true)
    if (!appCoreStarted) finalizeBootstrap()
    if (onboardingWindow && !onboardingWindow.isDestroyed()) {
      onboardingWindow.close()
      onboardingWindow = null
    }
    if (!overlayWindow || overlayWindow.isDestroyed()) createOverlayWindow()
    showOverlay()
  })
}

async function initApp() {
  const { session } = require('electron')
  session.defaultSession.setPermissionRequestHandler((_, permission, cb) => cb(['media', 'display-capture', 'screen'].includes(permission)))
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then(s => callback({ video: s[0], audio: 'loopback' })).catch(() => callback({}))
  })
  // Start Tesseract init in background — don't block UI startup
  screenCapture.initTesseract().catch(() => {})
  seedOverlayPositionIfNeeded()
  setupTray()
  setupHotkeys()
  sessionMemory.startInactivityWatcher(() => {
    sendToOverlay('session-purge')
    lastResponse = ''
    lastUsedOcrText = ''
    screenOcrText = ''
  })
  createOverlayWindow()
  showOverlay()
  startOcrLoop()
}

app.whenReady().then(() => {
  setupIPC()
  if (!hasValidConsent()) createConsentWindow()
  else continueAfterConsent()
}).catch((err) => {
  console.error('[ShadowAssist-v2] bootstrap failed:', err)
  app.quit()
})

app.on('window-all-closed', () => { hotkeys.unregisterAll(); stopOcrLoop(); screenCapture.terminateTesseract() })
app.on('will-quit', () => hotkeys.unregisterAll())
app.on('second-instance', () => {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    createOverlayWindow()
    showOverlay()
  } else {
    showOverlay()
    try {
      overlayWindow.focus()
    } catch (_) {}
  }
})
}
