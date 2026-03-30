// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

/** Adapts preload `shadowAPI` to the legacy `(event, ...args)` ipcRenderer listener shape. */
export function createIpcShim() {
  const raw = typeof window !== 'undefined' ? window.shadowAPI : null
  if (!raw) return null
  return {
    invoke: (...args) => raw.invoke(...args),
    send: (...args) => raw.send(...args),
    on: (channel, listener) => raw.on(channel, (...args) => listener(null, ...args)),
    removeAllListeners: (channel) => raw.removeAllListeners(channel),
  }
}
