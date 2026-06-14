// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Overlay OCR delegates to main-process screenCapture (same pipeline, no renderer canvas work).

export async function captureScreenTextLocal(ipc, opts = {}) {
  if (!ipc) return ''
  try {
    const out = await ipc.invoke('ocr:capture-screen-text', opts)
    return String(out?.text ?? '')
  } catch (_) {
    return ''
  }
}

export async function warmupLocalOcr() {
  try {
    const ipc = typeof window !== 'undefined' ? window.shadowAPI : null
    if (ipc?.invoke) await ipc.invoke('ocr:warmup')
  } catch (_) {}
}

export async function terminateLocalOcr() {
  try {
    const ipc = typeof window !== 'undefined' ? window.shadowAPI : null
    if (ipc?.invoke) await ipc.invoke('ocr:terminate')
  } catch (_) {}
}
