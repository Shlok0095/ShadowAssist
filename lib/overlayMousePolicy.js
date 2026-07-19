// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

/**
 * Pure helpers for overlay mouse capture (Electron setIgnoreMouseEvents).
 * Passthrough mode must NOT leave forward:true while the cursor is over the overlay —
 * otherwise clicks never reach the renderer (mic / settings / quit become dead).
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
 * @param {{ overlayVisible: boolean, passthroughEnabled: boolean, cursorInsideOverlay?: boolean }} opts
 * @returns {{ ignore: boolean, forward?: boolean, usePassthroughPoll: boolean }}
 */
function resolveOverlayMouseCapture(opts) {
  const { overlayVisible, passthroughEnabled, cursorInsideOverlay = false } = opts || {}

  if (!overlayVisible) {
    return { ignore: true, forward: false, usePassthroughPoll: false }
  }

  if (passthroughEnabled === true) {
    if (cursorInsideOverlay) {
      return { ignore: false, usePassthroughPoll: true }
    }
    return { ignore: true, forward: true, usePassthroughPoll: true }
  }

  return { ignore: false, usePassthroughPoll: false }
}

module.exports = {
  isPointInBounds,
  resolveOverlayMouseCapture,
}
