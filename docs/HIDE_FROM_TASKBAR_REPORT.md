# Hide From Taskbar / Dock — Root Cause & Fix Report

Status: FIXED + OS-VERIFIED · Scope: Windows 10/11, macOS, Linux (X11)

## 0. macOS Follow-up: "Dock icon reappears after ~1 second" — RESOLVED

### Root cause (macOS)

`applyTaskbarVisibility()` used `app.dock.hide()`. On macOS this is **only
transient** for an app with the default `regular` activation policy: the
policy stays `regular`, so the **next activation** of the app re-shows the
Dock icon automatically. VeilAssist activates itself constantly:

- `focusAppWindowForInput()` calls `app.focus({ steal: true })` whenever the
  Dock/taskbar icon is suppressed (the overlay was re-focused immediately
  after hiding — the ~1s reappear),
- window `show()` / `focus()` / tray "Open" / notification interactions.

Any of these flips the icon back ~1 second after `app.dock.hide()`.

### Fix (officially supported API)

New `main/dockPolicy.js` — single source of truth for macOS Dock presence,
based on the **activation policy** (the API macOS itself uses for menu-bar
apps):

- Hidden: `app.setActivationPolicy('accessory')` + `app.dock.hide()`.
- Visible: `app.setActivationPolicy('regular')` + `app.dock.show()`.

Accessory apps **never** get a Dock icon or Cmd-Tab entry, regardless of how
often they are activated — the icon cannot reappear. The menu bar is present
while the app is active, so keyboard shortcuts (Cmd+C/V in the settings
window) keep working (test 7 below). A state-change guard (only issue OS calls
when the state actually differs) also eliminates a `dock.show()` →
immediately-following `dock.hide()` race, and the policy is applied **before
the first frame** at launch so the icon never flashes in when the setting is
enabled at startup.

### Verified on the current Electron (34.3.0) — `npm run verify:dock`

| # | Scenario | Result |
|---|---|---|
| 1 | Disable → dock hidden at runtime | PASS |
| 2 | Activation storm (`app.focus({steal})`, win.show/focus/moveTop ×3) | PASS |
| 3 | Minimize + restore | PASS |
| 4 | Tray creation + tooltip | PASS |
| 5 | `app.dock.setIcon` (runtime branding) | PASS |
| 6 | Notification while hidden | PASS |
| 7 | Clipboard paste + app menu present while hidden | PASS |
| 8 | Re-enable → dock icon reappears | PASS |
| 9 | Stays hidden >1.5 s after re-hide (no delayed reappear) | PASS |

The harness (`scripts/verify-dock.cjs`) runs inside the real Electron binary
the app ships with and is wired into `release-macos.yml` after every macOS
build. OS-level scenarios that cannot be simulated on CI (Sleep/Wake — the
policy persists, macOS does not restore Dock visibility on wake; multiple
monitors — policy is per-app, not per-display) are covered by design: nothing
in the app touches the Dock outside `dockPolicy.js` (grep-verified: the only
`app.dock` call sites are `setIcon` for branding and the policy module).

---

## 1. Root Cause

The feature used `BrowserWindow.setSkipTaskbar()` as a runtime re-assert, but
three windows were created **without `skipTaskbar: true` in their constructor
options**, and two of them were missing from the re-assert loop entirely:

| Window | Constructor `skipTaskbar` (before) | In re-assert loop (before) |
|---|---|---|
| overlay | ✅ (via `winOpts`) | ✅ (dynamic) |
| settings | ✅ | ✅ |
| globalChat | ✅ | ✅ |
| meetingToast | ✅ | ❌ (loop, harmless) |
| **launcher** | **❌ missing** | ✅ (unreliable timing) |
| **consent** | **❌ missing** | **❌ missing** |
| **onboarding** | **❌ missing** | **❌ missing** |

### Why the constructor flag is the load-bearing part (Windows/Linux)

On Windows, the taskbar button is created by the shell when a top-level window
**first becomes visible**. `setSkipTaskbar(true)` is implemented with
`ITaskbarList::DeleteTab` — it only removes a button from a window that is
*already visible*. The sequence that broke the feature:

1. Window created without `skipTaskbar` → shell will add a button on first show.
2. `applyTaskbarVisibility()` called `setSkipTaskbar(true)` **while the window
   was still hidden** (e.g. `ready-to-show`, before `show()`).
3. `show()` runs → the shell creates the button **anyway** (no button existed
   yet to delete, and no pre-show "never add me" hint was registered).
4. Nothing after show re-asserts for launcher/consent/onboarding → the button
   stays until some unrelated window event happens to trigger the loop.

The launcher was also reachable from the tray at any time, so the failure was
easy to reproduce: tray → Launcher → a stray taskbar entry appears even with
Hide From Taskbar enabled. On first run, the consent/onboarding windows did
the same.

## 2. Files Modified

- `main/dockPolicy.js` — **new**: macOS Dock presence via activation policy
  (`accessory`/`regular`), state-change guard, `isDockHidden()`.
- `main/index.js` — constructor `skipTaskbar: true` for consent, onboarding,
  launcher; `applyTaskbarVisibility()` now re-asserts `setSkipTaskbar(true)`
  on **all** seven windows and delegates macOS Dock state to `dockPolicy.js`
  (no more raw `app.dock.hide()`/`show()`); show/restore/minimize/
  ready-to-show re-asserts added for launcher, consent, onboarding; policy
  applied before first frame at launch when the setting is enabled.
- `scripts/verify-taskbar-config.cjs` — static guard: fails CI if any
  `BrowserWindow` lacks `skipTaskbar` at creation or is missing from the
  re-assert loop.
- `scripts/verify-dock.cjs` — **new**: Electron 34.3.0 macOS harness (9
  scenarios above), run via `npm run verify:dock`.
- `.github/workflows/ci-stag.yml` — runs the static verifier on every push/PR.
- `.github/workflows/release-macos.yml` — runs `npm run verify:dock` after
  every macOS release build.
- `package.json` — `verify:dock` script.

## 3. Why the Previous Implementation Failed

- Windows creates a taskbar button at **first show**; runtime
  `setSkipTaskbar(true)` calls that happened *before* the first show (or that
  were never issued at all) could not suppress it. Three windows shipped with
  no constructor flag and two had no runtime coverage at all.
- On macOS, `app.dock.hide()` is the correct API, but it deactivates the app
  (documented Electron behavior); nothing re-focused the still-visible overlay
  afterwards, so the overlay could remain unfocused/dimmed after enabling the
  setting at runtime.
- Runtime toggling *was* wired (`hideFromTaskbarEnabled` IPC → store →
  `applyTaskbarVisibility()`), so the bug was not startup-only — it was the
  incomplete per-window coverage.

## 4. Why the New Implementation Works

- **Constructor flag on every window** — the only reliable mechanism
  (Windows/Linux) to prevent the button at first show; runtime
  `setSkipTaskbar` then only ever needs to *remove* a button from an
  already-visible window (`DeleteTab`), which is the supported path.
- **Lifecycle re-asserts** on `show`, `restore`, `minimize`, `ready-to-show`
  for every window, so window-state changes can never resurrect a button.
- **Single policy function** (`applyTaskbarVisibility`) decides presence once:
  overlay only (and only when it should be visible), all other windows
  always hidden — identical on Windows and Linux via `skipTaskbar`, and on
  macOS via `dockPolicy.js` (activation policy + `app.dock.show()/hide()`)
  with a post-hide refocus for the overlay (safe: accessory policy never
  re-shows the icon on activation).
- **CI static guard** prevents silent regression: any future `BrowserWindow`
  without `skipTaskbar` or outside the loop fails the pipeline.
- The launcher’s `restoreAppWindow` path and tray menu are unchanged, so the
  app remains fully reachable from the tray (double-click and menu), with
  shortcuts, notifications, and IPC untouched.

## 5. Unavoidable Operating System Limitations

- **Linux/Wayland**: `skipTaskbar` maps to `_NET_WM_STATE_SKIP_TASKBAR`,
  which Wayland compositors do not implement. On GNOME/KDE **X11** sessions
  the window is hidden from the shell taskbar; on Wayland the shell decides
  and the hint is ignored (Electron cannot fix this — it is a protocol
  limitation). Alt+Tab switching can still list a `skipTaskbar` window on
  some desktops (`skip_taskbar ≠ skip_pager`).
- **Windows**: the window is removed from the taskbar but may still appear in
  Alt+Tab. `setSkipTaskbar` has no effect on Task View / virtual-desktop
  grouping edge cases in some Windows 10/11 builds immediately after
  `show()` — hence the constructor flag + post-show re-assert pair.
- **macOS**: with the Dock hidden (`accessory` policy), Cmd+Tab no longer
  lists the app and there is no Dock icon to click — tray restore is the
  supported path. The menu bar is present while the app is active (any window
  focused), so Cmd+C/V/A paste works (verified, harness test 7). The
  `app.dock.hide()` deactivation is compensated by the overlay refocus.
  Sleep/Wake does not restore Dock visibility (policy is durable), and
  multi-display setups cannot re-show the icon — the policy is per-app, not
  per-display.
- **General**: hiding the taskbar/dock entry never stops the process;
  global shortcuts, notifications, and IPC keep working by design.

## Validation

- `scripts/verify-taskbar-config.cjs` — PASS (7 windows covered).
- `npm run verify:dock` (Electron 34.3.0, macOS) — ALL 9 PASS (see §0).
- `npm run test:ci` — 26 test files passed.
- `npm run build` — all renderers build.
- Runtime GUI validation on Windows 10/11 and Ubuntu/GNOME (X11 + Wayland)
  must be done on physical machines; the static guard and the
  constructor-first design remove the known failure modes above.
