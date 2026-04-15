// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Minimal preload for the meeting-toast BrowserWindow only.

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('meetingToast', {
  onPayload(cb) {
    const fn = (_e, data) => {
      try {
        cb(data)
      } catch (_) {}
    }
    ipcRenderer.on('meeting-toast-payload', fn)
  },
  dismiss(eventId) {
    ipcRenderer.send('meeting-toast:dismiss', eventId || '')
  },
})
