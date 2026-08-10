// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

const { contextBridge, ipcRenderer } = require('electron')

let verboseLogging = false

function setVerboseLoggingFlag(v) {
  verboseLogging = !!v
}

ipcRenderer.invoke('get-store', 'verboseDebugLogging').then((v) => setVerboseLoggingFlag(v === true)).catch(() => {})
ipcRenderer.on('verbose-logging-changed', (_e, v) => setVerboseLoggingFlag(v))

function patchConsoleForward() {
  const orig = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  }
  const forward = (level, origFn, args) => {
    origFn(...args)
    if (!verboseLogging) return
    try {
      const text = args
        .map((a) => {
          if (a instanceof Error) return a.stack || a.message
          if (typeof a === 'object') {
            try {
              return JSON.stringify(a)
            } catch {
              return String(a)
            }
          }
          return String(a)
        })
        .join(' ')
      ipcRenderer.send('debug-log:forward', level, text)
    } catch (_) {}
  }
  console.log = (...args) => forward('LOG', orig.log, args)
  console.warn = (...args) => forward('WARN', orig.warn, args)
  console.error = (...args) => forward('ERROR', orig.error, args)
}

patchConsoleForward()

contextBridge.exposeInMainWorld('shadowAPI', {
  setProtection: (enabled) => ipcRenderer.invoke('protection:set', enabled),
  getProtection: () => ipcRenderer.invoke('protection:get'),
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  /** Synchronous brand snapshot (sendSync) so first paint shows the custom brand. */
  getBrandingSync: () => {
    try {
      return ipcRenderer.sendSync('branding:get-sync')
    } catch (_) {
      return null
    }
  },
  on: (channel, listener) => {
    const wrapped = (_event, ...args) => listener(...args)
    ipcRenderer.on(channel, wrapped)
    return () => {
      try {
        ipcRenderer.removeListener(channel, wrapped)
      } catch (_) {}
    }
  },
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
})
