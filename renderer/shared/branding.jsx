// Copyright (c) 2026 VeilAssist. All rights reserved.
// Shared renderer branding — resolves the app display name + custom logos from
// the main process (sync seed on first paint, async refresh, live IPC updates).
// Imported by every renderer entry; safe to use in any component.

import React, { useEffect, useState, useCallback } from 'react'
import appLogoFallback from '../../logo.png'
import overlayLogoFallback from '../../overlaylogo.png'

const DEFAULT_BRAND = {
  name: 'VeilAssist',
  logoDataUrl: '',
  overlayLogoDataUrl: '',
  hasCustomLogo: false,
  hasOverlayLogo: false,
}

let state = { ...DEFAULT_BRAND }
const listeners = new Set()

function emit() {
  for (const listener of listeners) {
    try {
      listener()
    } catch (_) {}
  }
}

function apply(next) {
  if (!next || typeof next !== 'object') return
  const hasCustomLogo = typeof next.hasCustomLogo === 'boolean' ? next.hasCustomLogo : false
  const hasOverlayLogo = typeof next.hasOverlayLogo === 'boolean' ? next.hasOverlayLogo : false
  const name =
    typeof next.name === 'string' && next.name.trim() ? next.name : (state.name || DEFAULT_BRAND.name)
  state = {
    name,
    logoDataUrl: typeof next.logoDataUrl === 'string' ? next.logoDataUrl : '',
    overlayLogoDataUrl: typeof next.overlayLogoDataUrl === 'string' ? next.overlayLogoDataUrl : '',
    hasCustomLogo,
    hasOverlayLogo,
  }
  emit()
}

/** Blocking seed from preload so the very first paint already uses the custom brand. */
function trySeedSync() {
  try {
    if (typeof window === 'undefined' || !window.shadowAPI) return
    if (typeof window.shadowAPI.getBrandingSync !== 'function') return
    const seed = window.shadowAPI.getBrandingSync()
    if (seed && typeof seed === 'object') apply(seed)
  } catch (_) {}
}

trySeedSync()

let hydrated = false
let unsubscribeMain = null
function hydrateBranding() {
  if (hydrated) return
  hydrated = true
  const api = typeof window !== 'undefined' ? window.shadowAPI : null
  if (!api || typeof api.invoke !== 'function') return
  api
    .invoke('branding:get')
    .then((next) => {
      if (next && typeof next === 'object') apply(next)
    })
    .catch(() => {})
  if (typeof api.on === 'function') {
    try {
      unsubscribeMain = api.on('branding-updated', (next) => {
        if (next && typeof next === 'object') apply(next)
      })
    } catch (_) {}
  }
}

function getSnapshot() {
  return state
}

/** Reactive brand state: `{ name, logoDataUrl, overlayLogoDataUrl, hasCustomLogo, hasOverlayLogo }`. */
export function useBrand() {
  const [snapshot, setSnapshot] = useState(getSnapshot)
  useEffect(() => {
    hydrateBranding()
    const listener = () => setSnapshot(getSnapshot())
    listeners.add(listener)
    setSnapshot(getSnapshot())
    return () => listeners.delete(listener)
  }, [])
  return snapshot
}

/** `<img>` that resolves the active logo (custom brand → bundled fallback). */
export function BrandLogo({ overlay = false, alt = '', draggable = false, ...props }) {
  const brand = useBrand()
  const hasCustom = overlay ? brand.hasOverlayLogo : brand.hasCustomLogo
  const dataUrl = overlay ? brand.overlayLogoDataUrl : brand.logoDataUrl
  const fallback = overlay ? overlayLogoFallback : appLogoFallback
  return (
    <img
      src={hasCustom && dataUrl ? dataUrl : fallback}
      alt={alt}
      draggable={draggable}
      {...props}
    />
  )
}

/** `<span>` with the active display name (fallback text while seeding). */
export function BrandName({ fallback = '', ...props }) {
  const brand = useBrand()
  return <span {...props}>{brand.name}</span>
}

/** Imperative read for non-component code (e.g. meeting toast boot wiring). */
export function getBrandSnapshot() {
  return { ...state }
}

/** Imperative apply — lets a non-React surface (meeting toast) refresh brand state. */
export function applyBrandSnapshot(next) {
  apply(next)
}

/**
 * Synchronous brand resolution for non-React preloads (meeting toast):
 * tries shadowAPI.sendSync and meetingToast.getBranding, falls back to defaults.
 */
export function resolveBrandNow() {
  try {
    if (typeof window === 'undefined') return getBrandSnapshot()
    const api = window.shadowAPI
    if (api && typeof api.getBrandingSync === 'function') {
      const v = api.getBrandingSync()
      if (v && typeof v === 'object') apply(v)
    }
    const toastApi = window.meetingToast
    if (toastApi && typeof toastApi.getBranding === 'function') {
      const v = toastApi.getBranding()
      if (v && typeof v === 'object') apply(v)
    }
  } catch (_) {}
  return getBrandSnapshot()
}