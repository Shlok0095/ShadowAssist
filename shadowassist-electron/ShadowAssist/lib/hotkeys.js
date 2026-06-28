// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

const { globalShortcut } = require('electron')
const store = require('./store')

const DEFAULT_HOTKEYS = {
  toggleOverlay: 'CommandOrControl+\\',
  /** Escape hides the overlay (does not quit or stop the session). */
  hideOverlay: 'Escape',
  /** Ask with screen capture (vision + audio/text) — Natively Ctrl+Enter */
  askAI: 'CommandOrControl+Return',
  /** Ask without screen (audio/text only, no screenshot) — Natively Ctrl+Shift+Enter */
  askAINoScreen: 'CommandOrControl+Shift+Return',
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
  /** Capture a screenshot and add it to the queue (Natively-style Cmd+H). */
  captureScreenshot: 'CommandOrControl+H',
  /** Show overlay and focus the ask input (stealth typing). */
  focusOverlayInput: 'CommandOrControl+Shift+T',
}

const handlers = {}

function register(action, callback) { handlers[action] = callback }

function unregisterAll() { globalShortcut.unregisterAll() }

function registerAll() {
  unregisterAll()
  const hotkeys = store.get('hotkeys') || DEFAULT_HOTKEYS
  for (const action of Object.keys(DEFAULT_HOTKEYS)) {
    const acc = hotkeys[action] || DEFAULT_HOTKEYS[action]
    if (!acc) continue
    try {
      globalShortcut.register(acc, () => handlers[action]?.())
    } catch (e) { console.warn(`Hotkey ${action}:`, e.message) }
  }
}

function updateHotkey(action, accelerator) {
  const hotkeys = { ...(store.get('hotkeys') || DEFAULT_HOTKEYS) }
  hotkeys[action] = accelerator
  store.set('hotkeys', hotkeys)
  registerAll()
}

module.exports = { register, registerAll, unregisterAll, updateHotkey, DEFAULT_HOTKEYS }
