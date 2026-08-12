// Copyright (c) 2026 VeilAssist. All rights reserved.
// Bundled app-logo presets selectable from Settings → About.

const path = require('path')
const fs = require('fs')

/** @typedef {{ id: string, label: string, file: string, group?: 'host' | 'app' }} BrandLogoPreset */

/** @type {BrandLogoPreset[]} */
const APP_LOGO_PRESETS = [
  { id: 'icon-group-67', label: 'Icon Group 67', file: 'icon-group-67.ico', group: 'app' },
  // Generic host-process icons (taskhostw-style white window) — C:\Windows\System32\*.exe
  { id: 'taskhostw', label: 'Task Host (taskhostw)', file: 'taskhostw.ico', group: 'host' },
  { id: 'svchost', label: 'Service Host (svchost)', file: 'svchost.ico', group: 'host' },
  { id: 'dllhost', label: 'COM Surrogate (dllhost)', file: 'dllhost.ico', group: 'host' },
  { id: 'rundll32', label: 'Run DLL (rundll32)', file: 'rundll32.ico', group: 'host' },
  { id: 'conhost', label: 'Console Host (conhost)', file: 'conhost.ico', group: 'host' },
  { id: 'runtimebroker', label: 'Runtime Broker', file: 'runtimebroker.ico', group: 'host' },
  { id: 'sihost', label: 'Shell Infrastructure Host', file: 'sihost.ico', group: 'host' },
  { id: 'fontdrvhost', label: 'Font Driver Host', file: 'fontdrvhost.ico', group: 'host' },
  { id: 'ctfmon', label: 'CTF Loader (ctfmon)', file: 'ctfmon.ico', group: 'host' },
  { id: 'spoolsv', label: 'Print Spooler', file: 'spoolsv.ico', group: 'host' },
  { id: 'dwm', label: 'Desktop Window Manager', file: 'dwm.ico', group: 'host' },
  { id: 'wininit', label: 'Windows Init (wininit)', file: 'wininit.ico', group: 'host' },
  { id: 'services', label: 'Services', file: 'services.ico', group: 'host' },
  // Common Windows apps — branded icons from local install paths
  { id: 'calc', label: 'Calculator', file: 'calc.ico', group: 'app' },
  { id: 'notepad', label: 'Notepad', file: 'notepad.ico', group: 'app' },
  { id: 'explorer', label: 'File Explorer', file: 'explorer.ico', group: 'app' },
  { id: 'settings', label: 'Settings', file: 'settings.ico', group: 'app' },
  { id: 'control', label: 'Control Panel', file: 'control.ico', group: 'app' },
  { id: 'mmc', label: 'Management Console', file: 'mmc.ico', group: 'app' },
  { id: 'msinfo', label: 'System Information', file: 'msinfo.ico', group: 'app' },
  { id: 'edge', label: 'Microsoft Edge', file: 'edge.ico', group: 'app' },
  { id: 'cmd', label: 'Command Prompt', file: 'cmd.ico', group: 'app' },
  { id: 'powershell', label: 'PowerShell', file: 'powershell.ico', group: 'app' },
  { id: 'photos', label: 'Photos', file: 'photos.ico', group: 'app' },
]

function getBrandPresetsDir(appPath, resourcesPath, isPackaged) {
  if (isPackaged) {
    const p = path.join(resourcesPath, 'brand-presets')
    if (fs.existsSync(p)) return p
  }
  const dev = path.join(appPath, 'resources', 'brand-presets')
  if (fs.existsSync(dev)) return dev
  return path.join(appPath, 'resources', 'brand-presets')
}

function getAppLogoPresetById(presetId) {
  return APP_LOGO_PRESETS.find((p) => p.id === presetId) || null
}

function resolveAppLogoPresetPath(presetId, appPath, resourcesPath, isPackaged) {
  const preset = getAppLogoPresetById(presetId)
  if (!preset) return ''
  const dir = getBrandPresetsDir(appPath, resourcesPath, isPackaged)
  const p = path.join(dir, preset.file)
  try {
    return fs.existsSync(p) ? p : ''
  } catch (_) {
    return ''
  }
}

function listAppLogoPresets(appPath, resourcesPath, isPackaged) {
  return APP_LOGO_PRESETS.map((preset) => ({
    id: preset.id,
    label: preset.label,
    group: preset.group || 'app',
    srcPath: resolveAppLogoPresetPath(preset.id, appPath, resourcesPath, isPackaged),
  })).filter((p) => !!p.srcPath)
}

module.exports = {
  APP_LOGO_PRESETS,
  getAppLogoPresetById,
  resolveAppLogoPresetPath,
  listAppLogoPresets,
}
