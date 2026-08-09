// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Windows-only: foreground window title + process for lightweight meeting detection (no calendar).

const fs = require('fs')
const path = require('path')
const { execFile } = require('child_process')

function getMeetingScanScriptPath() {
  const devPath = path.join(__dirname, 'meetingScanMeet.ps1')
  try {
    const { app } = require('electron')
    if (app && app.isPackaged) {
      const unpacked = path.join(process.resourcesPath, 'app.asar.unpacked', 'lib', 'meetingScanMeet.ps1')
      if (fs.existsSync(unpacked)) return unpacked
    }
  } catch (_) {}
  return devPath
}

const BROWSER_PROCS = new Set([
  'chrome',
  'msedge',
  'brave',
  'opera',
  'vivaldi',
  'firefox',
  'waterfox',
  'zen',
  'arc',
])

/** Installed PWAs (Google Meet desktop app uses chrome_proxy.exe / msedge_proxy.exe). */
const PWA_PROXY_PROCS = new Set(['chrome_proxy', 'msedge_proxy'])

/** Processes that can host Google Meet (browser tab or installed PWA). */
const MEET_HOST_PROCS = new Set([...BROWSER_PROCS, ...PWA_PROXY_PROCS])

/** New Teams desktop often hosts UI under msedgewebview2.exe — title still says Microsoft Teams. */
const TEAMS_DESKTOP_PROCS = new Set(['ms-teams', 'teams', 'msteams'])

/**
 * Foreground HWND → window title + owning process name.
 * Chrome/Edge foreground HWND usually does NOT equal any process MainWindowHandle,
 * so we resolve PID via GetWindowThreadProcessId and walk Win32_Process parents if needed.
 */
const PS_FOREGROUND = [
  "$ErrorActionPreference='SilentlyContinue';",
  'Add-Type -TypeDefinition "using System;using System.Runtime.InteropServices;using System.Text;',
  'using System.IO;',
  'public class SAFG{',
  '[DllImport(\\"user32.dll\\")]public static extern System.IntPtr GetForegroundWindow();',
  '[DllImport(\\"user32.dll\\",CharSet=CharSet.Unicode)]public static extern int GetWindowText(System.IntPtr h,StringBuilder s,int m);',
  '[DllImport(\\"user32.dll\\")]public static extern uint GetWindowThreadProcessId(System.IntPtr hWnd,out uint pid);',
  '}" -Language CSharp;',
  '$h=[SAFG]::GetForegroundWindow();$sb=New-Object System.Text.StringBuilder 512;',
  '[void][SAFG]::GetWindowText($h,$sb,$sb.Capacity);',
  '$pidOut=[uint32]0;[void][SAFG]::GetWindowThreadProcessId($h,[ref]$pidOut);',
  '$p=\"\";$browserHit=\"\";',
  'if($pidOut){',
  '$cur=[int]$pidOut;$steps=0;',
  'while($cur -gt 0 -and $steps++ -lt 18){',
  '$wp=Get-CimInstance Win32_Process -Filter \"ProcessId=$cur\" -ErrorAction SilentlyContinue;',
  'if(-not $wp){break};',
  '$exe=[IO.Path]::GetFileNameWithoutExtension([string]$wp.Name).ToLower();',
  'if($exe -eq \"ms-teams\" -or $exe -eq \"teams\" -or $exe -eq \"msteams\"){$p=$exe;break};',
  'if(@(\"chrome\",\"chrome_proxy\",\"msedge\",\"msedge_proxy\",\"brave\",\"opera\",\"vivaldi\",\"firefox\",\"waterfox\",\"zen\",\"arc\") -contains $exe){if(-not $browserHit){$browserHit=$exe}};',
  '$pp=[int]$wp.ParentProcessId;',
  'if($pp -le 0 -or $pp -eq $cur){break};',
  '$cur=$pp;',
  '};',
  'if((-not $p) -and $browserHit){$p=$browserHit};',
  '};',
  'Write-Output ($sb.ToString()+"`t"+$p)',
].join('')

/**
 * @param {(err: Error|null, info: { title: string, processName: string }) => void} cb
 */
function getForegroundWindowInfo(cb) {
  if (process.platform !== 'win32') {
    cb(null, { title: '', processName: '' })
    return
  }
  execFile(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', PS_FOREGROUND],
    { encoding: 'utf8', timeout: 8000, windowsHide: true },
    (err, stdout) => {
      if (err) return cb(err)
      const raw = String(stdout || '').trim()
      const tab = raw.indexOf('\t')
      if (tab === -1) {
        return cb(null, { title: raw, processName: '' })
      }
      cb(null, {
        title: raw.slice(0, tab).trim(),
        processName: raw.slice(tab + 1).trim().toLowerCase(),
      })
    },
  )
}

/**
 * @returns {null | { platform: string, headline: string, eventId: string }}
 */
function classifyForegroundMeeting(title, processName) {
  const t = String(title || '')
  const p = String(processName || '').toLowerCase().replace(/\.exe$/, '')

  // Zoom desktop client
  if (p === 'zoom') {
    const id = `zoom-${simpleId(t + p)}`
    return { platform: 'zoom', headline: 'Zoom meeting detected', eventId: id }
  }
  // Zoom in browser (join from web)
  if (BROWSER_PROCS.has(p) && /Zoom Meeting|zoom\.us\/[jw]\//i.test(t)) {
    const id = `zoom-web-${simpleId(t)}`
    return { platform: 'zoom', headline: 'Zoom meeting detected', eventId: id }
  }

  // Microsoft Teams — desktop, WebView2 shell, or browser (teams.microsoft.com / tab title)
  if (TEAMS_DESKTOP_PROCS.has(p)) {
    const id = stableTeamsEventId(t, p)
    return { platform: 'teams', headline: 'Microsoft Teams detected', eventId: id }
  }
  if (p === 'msedgewebview2' && looksLikeTeamsWindowTitle(t)) {
    const id = stableTeamsEventId(t, p)
    return { platform: 'teams', headline: 'Microsoft Teams detected', eventId: id }
  }
  if (BROWSER_PROCS.has(p) && looksLikeTeamsWindowTitle(t)) {
    const id = stableTeamsEventId(t, p)
    return { platform: 'teams', headline: 'Microsoft Teams detected', eventId: id }
  }

  // Webex
  if (p.includes('webex') || /\bwebex\b/i.test(t)) {
    const id = `webex-${simpleId(t + p)}`
    return { platform: 'webex', headline: 'Webex meeting detected', eventId: id }
  }

  // Google Meet in a browser tab or installed PWA (chrome_proxy.exe).
  // Empty processName: still classify if title clearly looks like Meet (PS PID path failed edge case).
  if (looksLikeGoogleMeetWindowTitle(t, p) && (MEET_HOST_PROCS.has(p) || p === '' || p === 'msedgewebview2')) {
    const id = stableMeetEventId(t, p)
    return { platform: 'meet', headline: 'Google Meet detected', eventId: id }
  }

  return null
}

function extractMeetCode(title) {
  const m = String(title).match(/\b([a-z]{3}-[a-z]{4}-[a-z]{3})\b/i)
  return m ? m[1].toLowerCase() : ''
}

function looksLikeGoogleMeetWindowTitle(t, processName = '') {
  const s = String(t)
  const trim = s.trim()
  const p = String(processName || '').toLowerCase().replace(/\.exe$/, '')
  if (!trim) return false
  if (/meet\.google/i.test(s)) return true
  if (/^meet\s*[-–—|]\s*/i.test(trim)) return true
  if (/\bgoogle meet\b/i.test(s)) return true
  if (/\|\s*Google Meet\s*$/i.test(trim)) return true
  if (/\s[-–—|]\s*Google Meet\s*$/i.test(trim)) return true
  if (/\b[a-z]{3}-[a-z]{4}-[a-z]{3}\b/i.test(s) && /\bmeet\b/i.test(s)) return true
  // Chrome sometimes uses ONLY the meeting code as the tab title (e.g. "oao-nxsu-sfy")
  if (/^\s*[a-z]{3}-[a-z]{4}-[a-z]{3}\s*$/i.test(trim)) return true
  // Installed Meet PWA: "Google Meet - In call" or bare "Google Meet"
  if (PWA_PROXY_PROCS.has(p)) {
    if (/^google meet(\s*[-–—|]|$)/i.test(trim)) return true
    if (/^in call\b/i.test(trim)) return true
  }
  return false
}

/** Stable id when Meet tab/PWA title flickers (timers, "In call", room name). */
function stableMeetEventId(title, processName) {
  const code = extractMeetCode(title)
  if (code) return `meet-${code}`
  const norm = String(title || '')
    .replace(/\s*[-–—|]\s*Google Chrome\s*$/i, '')
    .replace(/\s*[-–—|]\s*Microsoft\s+Edge\s*$/i, '')
    .replace(/\s*[-–—|]\s*Google Meet\s*$/i, '')
    .replace(/\|\s*Google Meet\s*$/i, '')
    .replace(/^google meet\s*[-–—|]\s*/i, '')
    .replace(/^meet\s*[-–—|]\s*/i, '')
    .replace(/^in call\s*[-–—|]\s*/i, '')
    .trim()
    .slice(0, 120)
  return `meet-${simpleId(`${norm}\0${processName}`)}`
}

function looksLikeTeamsWindowTitle(t) {
  const s = String(t)
  if (/microsoft teams/i.test(s)) return true
  if (/\bteams\.microsoft\.com\b|\bteams\.live\.com\b/i.test(s)) return true
  if (/\|\s*Microsoft Teams\b/i.test(s)) return true
  if (/^Microsoft Teams\s*\|/i.test(s.trim())) return true
  return false
}

/** Stable id when window title flickers (timers, presence) but meeting is the same. */
function stableTeamsEventId(title, processName) {
  const norm = String(title || '')
    .replace(/\s*-\s*Microsoft Teams\s*$/i, '')
    .replace(/\|\s*Microsoft Teams\s*$/i, '')
    .replace(/\s*\(Guest\)\s*$/i, '')
    .trim()
    .slice(0, 120)
  return `teams-${simpleId(`${norm}\0${processName}`)}`
}

function simpleId(s) {
  let h = 0
  const str = String(s).slice(0, 200)
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  return Math.abs(h).toString(36)
}

/**
 * When the overlay (or another app) is foreground, scan visible top-level windows for
 * Microsoft Teams (desktop / WebView2 / browser) or Google Meet.
 * @param {(err: Error|null, row: { title: string, processName: string }|null) => void} cb
 */
function scanFirstVisibleBrowserMeet(cb) {
  if (process.platform !== 'win32') {
    cb(null, null)
    return
  }
  const ps1 = getMeetingScanScriptPath()
  if (!fs.existsSync(ps1)) {
    cb(null, null)
    return
  }
  execFile(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', ps1],
    { encoding: 'utf8', timeout: 30000, windowsHide: true },
    (err, stdout) => {
      if (err) return cb(err)
      const raw = String(stdout || '').trim()
      if (!raw) return cb(null, null)
      const tab = raw.indexOf('\t')
      if (tab === -1) return cb(null, { title: raw, processName: '' })
      cb(null, {
        title: raw.slice(0, tab).trim(),
        processName: raw.slice(tab + 1).trim().toLowerCase(),
      })
    },
  )
}

/**
 * Prefer foreground classification; if none, any visible browser Meet window (overlay-friendly).
 * @param {(err: Error|null, hit: null | { platform: string, headline: string, eventId: string }) => void} cb
 */
function detectMeetingForegroundOrScan(cb) {
  getForegroundWindowInfo((err, info) => {
    const fgErr = err || null
    const fg = err || !info ? { title: '', processName: '' } : info
    const fgHit = classifyForegroundMeeting(fg.title, fg.processName)
    if (fgHit) return cb(null, fgHit)
    scanFirstVisibleBrowserMeet((e2, row) => {
      if (e2) return cb(e2)
      if (!row) {
        if (fgErr) return cb(fgErr)
        return cb(null, null)
      }
      const hit = classifyForegroundMeeting(row.title, row.processName)
      cb(null, hit)
    })
  })
}

module.exports = {
  getForegroundWindowInfo,
  classifyForegroundMeeting,
  scanFirstVisibleBrowserMeet,
  detectMeetingForegroundOrScan,
  MEETING_POLL_MS: 10000,
}
