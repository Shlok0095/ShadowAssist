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
let appliedPolicy = null

function isMac() {
  return process.platform === 'darwin'
}

/**
 * Make the Dock icon visible (true) or permanently hidden (false).
 *
 * The activation policy is the durable state; the dock.show()/hide() call
 * forces the immediate shell update. macOS OVERRIDES a policy applied before
 * the app finishes launching (LaunchServices applies the Info.plist value —
 * LSUIElement — at launch completion), so the policy is re-asserted once
 * after the app is ready. `appliedPolicy` starts unknown (null) to guarantee
 * the first post-ready call always re-applies the policy instead of trusting
 * a stale pre-ready state.
 *
 * macOS also re-shows the Dock icon whenever the app is activated while the
 * policy is regular, and `app.dock.hide()` called immediately after such a
 * re-show is silently ignored (the documented ~1s dock-call race). When the
 * icon is visible but should be hidden we therefore ALWAYS re-assert the
 * accessory policy (never trust the cached policy after an activation), and
 * schedule one deferred re-hide ~1.2s later to defeat the race.
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
      const iconVisible = app.dock.isVisible() !== false
      if (iconVisible || appliedPolicy !== 'accessory') {
        app.setActivationPolicy('accessory')
        appliedPolicy = 'accessory'
      }
      if (iconVisible) {
        app.dock.hide()
        setTimeout(() => {
          if (!desiredVisible && app.dock.isVisible() !== false) {
            try {
              app.setActivationPolicy('accessory')
              app.dock.hide()
            } catch (err) {
              console.error('[dockPolicy] deferred hide failed:', err?.message || err)
            }
          }
        }, 1200)
      }
    }
  } catch (err) {
    console.error('[dockPolicy] setDockVisibility failed:', err?.message || err)
  }
}

// LaunchServices re-applies the Info.plist activation policy (LSUIElement)
// when the app finishes launching, silently undoing a pre-ready accessory
// call. Reset the tracked policy at ready so the first post-ready call
// re-asserts the desired state at the OS level.
app.on('ready', () => {
  appliedPolicy = null
  try {
    setDockVisibility(desiredVisible)
  } catch (_) {}
})

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
