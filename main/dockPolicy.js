// Copyright (c) 2026 VeilAssist. All rights reserved.
// macOS Dock visibility policy — single source of truth.
//
// WHY THIS MODULE EXISTS
// `app.dock.hide()` alone is NOT permanent: the app keeps the "regular"
// activation policy, so the NEXT time the app is activated (window focus,
// `app.focus({ steal: true })`, tray restore, notification interaction, ...)
// macOS re-shows the Dock icon. This is the root cause of the
// "hides for ~1 second, then reappears" bug.
//
// THE OFFICIALLY SUPPORTED SOLUTION
// When the Dock icon must stay hidden, the app switches to the "accessory"
// activation policy (the policy used by menu-bar apps such as Spotify/Spotlight
// clones). Accessory apps never get a Dock icon or Cmd-Tab entry, no matter
// how often they are activated. The menu bar appears while the app is active
// (any of its windows focused), so keyboard shortcuts (Cmd+C/V in the
// settings window) keep working — verified by scripts/verify-dock.cjs.
//
// Show  : setActivationPolicy('regular')  + app.dock.show()
// Hide  : setActivationPolicy('accessory') + app.dock.hide()
// (Policy change first, dock.show()/hide() second: the policy is the durable
// state, the dock call forces the immediate shell update.)
//
// No-op on every non-macOS platform.

const { app } = require('electron')

let desiredVisible = true
let appliedPolicy = 'regular'

function isMac() {
  return process.platform === 'darwin'
}

/**
 * Make the Dock icon visible (true) or permanently hidden (false).
 *
 * State-change guard: app.dock.show() posts an asynchronous macOS activation
 * that can win a race against an immediately-following app.dock.hide()
 * (icon reappears ~1s later). To make the policy deterministic, OS calls are
 * only issued when the current state actually differs, and the activation
 * policy is only switched when it differs. First-run with the icon already
 * visible therefore becomes a no-op instead of a show()/hide() race.
 * @param {boolean} visible
 */
function setDockVisibility(visible) {
  if (!isMac()) return
  desiredVisible = !!visible
  try {
    if (visible) {
      if (appliedPolicy !== 'regular') {
        app.setActivationPolicy('regular')
        appliedPolicy = 'regular'
      }
      if (app.dock.isVisible() === false) app.dock.show()
    } else {
      if (appliedPolicy !== 'accessory') {
        app.setActivationPolicy('accessory')
        appliedPolicy = 'accessory'
      }
      if (app.dock.isVisible() !== false) app.dock.hide()
    }
  } catch (err) {
    console.error('[dockPolicy] setDockVisibility failed:', err?.message || err)
  }
}

/**
 * Current effective state: true when the Dock icon is hidden.
 * Prefers the live OS answer, falls back to the desired state.
 * @returns {boolean}
 */
function isDockHidden() {
  if (!isMac()) return false
  try {
    if (typeof app.dock?.isVisible === 'function') return !app.dock.isVisible()
  } catch (_) {}
  return appliedPolicy === 'accessory' || !desiredVisible
}

/** @returns {boolean} */
function isDockShown() {
  return !isDockHidden()
}

module.exports = { setDockVisibility, isDockHidden, isDockShown, isMac }
