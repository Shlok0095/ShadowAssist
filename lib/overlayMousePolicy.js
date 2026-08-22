// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

/**
 * Pure helpers for overlay mouse capture (Electron setIgnoreMouseEvents).
 *
 * Passthrough uses the Natively / Electron pattern: ignore + forward by default so
 * transparent window pixels click through; the renderer re-enables capture on
 * mouseenter over interactive UI (notch, panel).
 */

/** @typedef {{ x: number, y: number }} Point */
/** @typedef {{ x: number, y: number, width: number, height: number }} Bounds */

/**
 * @param {Point} point
 * @param {Bounds} bounds
 */
function isPointInBounds(point, bounds) {
  if (!point || !bounds) return false
  const { x, y, width, height } = bounds
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
    return false
  }
  return point.x >= x && point.x < x + width && point.y >= y && point.y < y + height
}

/**
 * Resolve setIgnoreMouseEvents args for the current overlay state.
 *
 * @param {{ overlayVisible: boolean, passthroughEnabled: boolean }} opts
 * @returns {{ ignore: boolean, forward?: boolean, useRendererPassthrough: boolean }}
 */
function resolveOverlayMouseCapture(opts) {
  const { overlayVisible, passthroughEnabled } = opts || {}

  if (!overlayVisible) {
    return { ignore: true, forward: false, useRendererPassthrough: false }
  }

  if (passthroughEnabled === true) {
    return { ignore: true, forward: true, useRendererPassthrough: true }
  }

  return { ignore: false, useRendererPassthrough: false }
}

module.exports = {
  isPointInBounds,
  resolveOverlayMouseCapture,
}
