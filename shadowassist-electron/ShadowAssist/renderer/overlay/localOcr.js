// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Overlay OCR delegates to main-process screenCapture (same pipeline, no renderer canvas work).

export async function captureScreenTextLocal(ipc, opts = {}) {
  if (!ipc) return ''
  try {
    const out = await ipc.invoke('ocr:capture-screen-text', opts)
    if (!out?.ok && out?.error) console.warn('[localOcr]', out.error)
    return String(out?.text ?? '')
  } catch (e) {
    console.warn('[localOcr]', e?.message || e)
    return ''
  }
}

export async function warmupLocalOcr() {
  try {
    const ipc = typeof window !== 'undefined' ? window.shadowAPI : null
    if (!ipc?.invoke) return { ok: false, error: 'no_ipc' }
    const out = await ipc.invoke('ocr:warmup')
    if (!out?.ok) console.warn('[localOcr] warmup failed:', out?.error || 'unknown')
    return out || { ok: false }
  } catch (e) {
    console.warn('[localOcr] warmup:', e?.message || e)
    return { ok: false, error: e?.message || String(e) }
  }
}

export async function terminateLocalOcr() {
  try {
    const ipc = typeof window !== 'undefined' ? window.shadowAPI : null
    if (ipc?.invoke) await ipc.invoke('ocr:terminate')
  } catch (_) {}
}
