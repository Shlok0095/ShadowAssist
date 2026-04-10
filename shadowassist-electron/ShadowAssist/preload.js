// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('shadowAPI', {
  setProtection: (enabled) => ipcRenderer.invoke('protection:set', enabled),
  getProtection: () => ipcRenderer.invoke('protection:get'),
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
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
