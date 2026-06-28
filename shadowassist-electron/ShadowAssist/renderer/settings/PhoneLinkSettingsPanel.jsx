// Copyright (c) 2026 VeilAssist. All rights reserved.
// Phase 10 — Phone Link (QR) + Android mirror (scrcpy).

import React, { useCallback, useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { MonitorSmartphone, Smartphone } from 'lucide-react'
import { createIpcShim } from '../shared/ipcShim'
import AppIcon from '../shared/AppIcon'
import {
  SettingsPage,
  SettingsRow,
  SettingsSection,
  ToggleSwitch,
} from './SettingsComponents'

const ipc = createIpcShim()

export default function PhoneLinkSettingsPanel({
  phoneLinkEnabled,
  onPhoneLinkEnabledChange,
  phoneLinkRemoteMicEnabled,
  onPhoneLinkRemoteMicChange,
  phoneMirrorDeviceId,
  onPhoneMirrorDeviceIdChange,
  phoneMirrorMaxSize,
  onPhoneMirrorMaxSizeChange,
  phoneMirrorIncludeInAsk,
  onPhoneMirrorIncludeInAskChange,
}) {
  const [status, setStatus] = useState(null)
  const [mirrorProbe, setMirrorProbe] = useState(null)
  const [mirrorStatus, setMirrorStatus] = useState(null)
  const [devices, setDevices] = useState([])
  const [mirrorErr, setMirrorErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [mirrorBusy, setMirrorBusy] = useState(false)

  const refreshStatus = useCallback(async () => {
    if (!ipc) return
    try {
      const [s, ms] = await Promise.all([
        ipc.invoke('phone-link:status'),
        ipc.invoke('phone-mirror:status'),
      ])
      setStatus(s && typeof s === 'object' ? s : null)
      setMirrorStatus(ms && typeof ms === 'object' ? ms : null)
    } catch {
      setStatus(null)
      setMirrorStatus(null)
    }
  }, [])

  const refreshMirrorTools = useCallback(async () => {
    if (!ipc) return
    setMirrorErr('')
    try {
      const [probe, listed] = await Promise.all([
        ipc.invoke('phone-mirror:probe'),
        ipc.invoke('phone-mirror:list-devices'),
      ])
      setMirrorProbe(probe && typeof probe === 'object' ? probe : null)
      setDevices(Array.isArray(listed?.devices) ? listed.devices : [])
      if (listed?.error && !listed?.devices?.length) setMirrorErr(listed.error)
    } catch (e) {
      setMirrorErr(e?.message || 'Could not list devices')
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
    void refreshMirrorTools()
    const id = window.setInterval(() => {
      void refreshStatus()
    }, 4000)
    return () => window.clearInterval(id)
  }, [refreshStatus, refreshMirrorTools, phoneLinkEnabled])

  const primaryUrl = status?.urls?.[0] || ''

  const regenerateToken = async () => {
    if (!ipc) return
    setBusy(true)
    try {
      await ipc.invoke('phone-link:regenerate-token')
      await refreshStatus()
    } finally {
      setBusy(false)
    }
  }

  const startMirror = async () => {
    if (!ipc) return
    setMirrorBusy(true)
    setMirrorErr('')
    try {
      const out = await ipc.invoke('phone-mirror:start', phoneMirrorDeviceId || undefined)
      if (!out?.ok) setMirrorErr(out?.error || 'Could not start mirror')
      await refreshStatus()
    } finally {
      setMirrorBusy(false)
    }
  }

  const stopMirror = async () => {
    if (!ipc) return
    setMirrorBusy(true)
    try {
      await ipc.invoke('phone-mirror:stop')
      await refreshStatus()
    } finally {
      setMirrorBusy(false)
    }
  }

  const toolsReady = mirrorProbe?.adbFound && mirrorProbe?.scrcpyFound

  return (
    <SettingsPage
      title="Phone"
      description="Phone Link (QR companion) and Android USB mirror (scrcpy). Desktop Listen, STT, and screen capture stay unchanged unless you opt in below."
    >
      <SettingsSection
        title="Phone Link — companion"
        description="Scan a QR code to read transcript and AI answers on your phone (same Wi‑Fi)."
      >
        <SettingsRow
          label="Enable Phone Link"
          hint="Starts a small LAN server on this PC. Off by default."
        >
          <ToggleSwitch checked={phoneLinkEnabled} onChange={onPhoneLinkEnabledChange} />
        </SettingsRow>

        <SettingsRow
          label="Remote microphone"
          hint="Phone sends voice to the PC during Listen. Desktop mic is not disabled."
        >
          <ToggleSwitch
            checked={phoneLinkRemoteMicEnabled}
            onChange={onPhoneLinkRemoteMicChange}
            disabled={!phoneLinkEnabled}
          />
        </SettingsRow>

        {phoneLinkEnabled && (
          <>
            <SettingsRow
              label="Server status"
              hint={
                status?.running
                  ? `Port ${status.port} · ${status.connectedClients || 0} phone(s) connected`
                  : 'Check Windows Firewall if pairing fails.'
              }
            >
              <span className={`text-sm ${status?.running ? 'text-emerald-400' : 'text-amber-400'}`}>
                {status?.running ? 'Running' : 'Stopped'}
              </span>
            </SettingsRow>

            {primaryUrl ? (
              <SettingsRow
                label="Scan to connect"
                hint="Point your phone camera at this QR (same Wi‑Fi as this PC)."
              >
                <div className="flex flex-col gap-3 items-end">
                  <div className="rounded-xl bg-white p-3 shadow-inner">
                    <QRCode value={primaryUrl} size={168} level="M" />
                  </div>
                  <button
                    type="button"
                    className="settings-btn-secondary text-sm"
                    disabled={busy}
                    onClick={() => void regenerateToken()}
                  >
                    {busy ? 'Refreshing…' : 'New QR code'}
                  </button>
                </div>
              </SettingsRow>
            ) : null}
          </>
        )}
      </SettingsSection>

      <SettingsSection
        title="Android mirror — scrcpy"
        description="Show your Android screen in a separate window (USB debugging). Same approach as scrcpy and PhoneMirror-style apps."
      >
        <SettingsRow
          label="adb / scrcpy"
          hint="Install Android Platform Tools (adb) and scrcpy, both on your PATH."
        >
          <span className="text-sm text-zinc-400">
            {toolsReady
              ? 'Ready'
              : [
                  !mirrorProbe?.adbFound && 'adb missing',
                  !mirrorProbe?.scrcpyFound && 'scrcpy missing',
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Checking…'}
          </span>
        </SettingsRow>

        <SettingsRow label="Android device" hint="USB debugging on · approve this PC on the phone.">
          <div className="flex flex-col gap-2 items-end min-w-[200px]">
            <select
              className="input-shadow w-full max-w-xs px-3 py-2 text-sm"
              value={phoneMirrorDeviceId}
              onChange={(e) => onPhoneMirrorDeviceIdChange(e.target.value)}
            >
              <option value="">Auto (single device)</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.model ? `${d.model} (${d.id})` : d.id}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="settings-btn-secondary text-sm"
              onClick={() => void refreshMirrorTools()}
            >
              Refresh devices
            </button>
          </div>
        </SettingsRow>

        <SettingsRow label="Max width (px)" hint="scrcpy --max-size (default 1080).">
          <input
            type="number"
            min={480}
            max={2560}
            step={120}
            className="input-shadow w-28 px-3 py-2 text-sm text-right"
            value={phoneMirrorMaxSize}
            onChange={(e) => onPhoneMirrorMaxSizeChange(Number(e.target.value) || 1080)}
          />
        </SettingsRow>

        <SettingsRow
          label="Include phone screen in Ask AI"
          hint="When mirror is running, adds an adb screencap alongside the normal desktop screenshot. Off by default."
        >
          <ToggleSwitch checked={phoneMirrorIncludeInAsk} onChange={onPhoneMirrorIncludeInAskChange} />
        </SettingsRow>

        <SettingsRow
          label="Mirror window"
          hint={
            mirrorStatus?.mirroring
              ? `Mirroring ${mirrorStatus.serial || 'device'} — scrcpy window on desktop`
              : 'Starts scrcpy in its own window (control phone with mouse/keyboard there).'
          }
        >
          <div className="flex gap-2">
            {mirrorStatus?.mirroring ? (
              <button
                type="button"
                className="settings-btn-secondary text-sm"
                disabled={mirrorBusy}
                onClick={() => void stopMirror()}
              >
                {mirrorBusy ? '…' : 'Stop mirror'}
              </button>
            ) : (
              <button
                type="button"
                className="settings-btn-secondary text-sm"
                disabled={mirrorBusy || !toolsReady}
                onClick={() => void startMirror()}
              >
                {mirrorBusy ? 'Starting…' : 'Start mirror'}
              </button>
            )}
          </div>
        </SettingsRow>

        {mirrorErr ? (
          <p className="text-sm text-red-400/90 m-0 px-1">{mirrorErr}</p>
        ) : null}
      </SettingsSection>

      <SettingsSection title="Setup">
        <div className="flex gap-3 items-start text-sm text-zinc-400 leading-relaxed">
          <AppIcon icon={Smartphone} size={18} className="mt-0.5 shrink-0 opacity-80" />
          <div className="space-y-3">
            <div>
              <p className="m-0 font-medium text-zinc-300">Phone Link</p>
              <ol className="list-decimal list-inside space-y-1 m-0 mt-1">
                <li>Same Wi‑Fi · enable Phone Link · scan QR</li>
                <li>Start Listen on PC for live sync</li>
              </ol>
            </div>
            <div className="flex gap-2 items-start">
              <AppIcon icon={MonitorSmartphone} size={18} className="mt-0.5 shrink-0 opacity-80" />
              <div>
                <p className="m-0 font-medium text-zinc-300">Android mirror</p>
                <ol className="list-decimal list-inside space-y-1 m-0 mt-1">
                  <li>Install adb + scrcpy · USB-connect phone</li>
                  <li>Enable USB debugging · tap Start mirror</li>
                  <li>iOS not supported on Windows for USB mirror</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>
    </SettingsPage>
  )
}
