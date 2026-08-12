// Copyright (c) 2026 VeilAssist. All rights reserved.
// Extract Windows system icons into resources/brand-presets/ (Windows only).
//
// Host-process icons (taskhostw-style generic window): embedded in System32 EXEs.
// App icons: Calculator, Notepad, etc. from their install paths.
// imageres.dll / shell32.dll indices live under C:\Windows\SystemResources\*.mun on Win10/11
// (use Resource Hacker or ExtractIconEx — .NET Icon() index API often fails on .mun files).
'use strict'

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const root = path.join(__dirname, '..')
const outDir = path.join(root, 'resources', 'brand-presets')

const SYSTEM32 = 'C:\\Windows\\System32'

/** @type {{ id: string, label: string, paths: string[] }[]} */
const HOST_SOURCES = [
  { id: 'taskhostw', label: 'Task Host', paths: [`${SYSTEM32}\\taskhostw.exe`] },
  { id: 'svchost', label: 'Service Host', paths: [`${SYSTEM32}\\svchost.exe`] },
  { id: 'dllhost', label: 'COM Surrogate', paths: [`${SYSTEM32}\\dllhost.exe`] },
  { id: 'rundll32', label: 'Run DLL', paths: [`${SYSTEM32}\\rundll32.exe`] },
  { id: 'conhost', label: 'Console Host', paths: [`${SYSTEM32}\\conhost.exe`] },
  { id: 'runtimebroker', label: 'Runtime Broker', paths: [`${SYSTEM32}\\RuntimeBroker.exe`] },
  { id: 'sihost', label: 'Shell Infrastructure Host', paths: [`${SYSTEM32}\\sihost.exe`] },
  { id: 'fontdrvhost', label: 'Font Driver Host', paths: [`${SYSTEM32}\\fontdrvhost.exe`] },
  { id: 'ctfmon', label: 'CTF Loader', paths: [`${SYSTEM32}\\ctfmon.exe`] },
  { id: 'spoolsv', label: 'Print Spooler', paths: [`${SYSTEM32}\\spoolsv.exe`] },
  { id: 'dwm', label: 'Desktop Window Manager', paths: [`${SYSTEM32}\\dwm.exe`] },
  { id: 'wininit', label: 'Windows Init', paths: [`${SYSTEM32}\\wininit.exe`] },
  { id: 'services', label: 'Services', paths: [`${SYSTEM32}\\services.exe`] },
]

/** @type {{ id: string, label: string, paths: string[] }[]} */
const APP_SOURCES = [
  { id: 'calc', label: 'Calculator', paths: [`${SYSTEM32}\\calc.exe`] },
  { id: 'notepad', label: 'Notepad', paths: [`${SYSTEM32}\\notepad.exe`, 'C:\\Windows\\notepad.exe'] },
  { id: 'explorer', label: 'File Explorer', paths: ['C:\\Windows\\explorer.exe'] },
  { id: 'control', label: 'Control Panel', paths: [`${SYSTEM32}\\control.exe`] },
  { id: 'mmc', label: 'Management Console', paths: [`${SYSTEM32}\\mmc.exe`] },
  { id: 'msinfo', label: 'System Information', paths: [`${SYSTEM32}\\msinfo32.exe`] },
  { id: 'settings', label: 'Settings', paths: ['C:\\Windows\\ImmersiveControlPanel\\SystemSettings.exe'] },
  { id: 'edge', label: 'Microsoft Edge', paths: ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'] },
  { id: 'cmd', label: 'Command Prompt', paths: [`${SYSTEM32}\\cmd.exe`] },
  { id: 'powershell', label: 'PowerShell', paths: [`${SYSTEM32}\\WindowsPowerShell\\v1.0\\powershell.exe`] },
  { id: 'photos', label: 'Photos', paths: ['C:\\Program Files\\Windows Photo Viewer\\PhotoViewer.dll'] },
]

const SOURCES = [...HOST_SOURCES, ...APP_SOURCES]

function extractWithPowerShell(srcPath, destIco) {
  const ps = `
Add-Type -AssemblyName System.Drawing
$icon = [System.Drawing.Icon]::ExtractAssociatedIcon('${srcPath.replace(/'/g, "''")}')
$fs = New-Object System.IO.FileStream('${destIco.replace(/'/g, "''")}', [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
`
  const r = spawnSync(
    'powershell',
    ['-NoProfile', '-NonInteractive', '-Command', ps],
    { encoding: 'utf8' },
  )
  return r.status === 0
}

function main() {
  if (process.platform !== 'win32') {
    console.log('[fetch-system-icon-presets] Skipped — Windows only.')
    return
  }
  fs.mkdirSync(outDir, { recursive: true })
  let ok = 0
  for (const src of SOURCES) {
    const dest = path.join(outDir, `${src.id}.ico`)
    const hit = src.paths.find((p) => fs.existsSync(p))
    if (!hit) {
      console.warn('[fetch-system-icon-presets] missing:', src.id)
      continue
    }
    if (extractWithPowerShell(hit, dest)) {
      console.log('[fetch-system-icon-presets] OK', src.id, '←', hit)
      ok += 1
    } else {
      console.warn('[fetch-system-icon-presets] failed:', src.id)
    }
  }
  console.log(`[fetch-system-icon-presets] ${ok}/${SOURCES.length} icons → resources/brand-presets/`)
}

main()
