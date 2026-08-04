# Hide From Taskbar / Dock — Root Cause & Fix Report

Status: FIXED (commit pending) · Scope: Windows 10/11, macOS, Linux (X11)

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

- `main/index.js` — constructor `skipTaskbar: true` for consent, onboarding,
  launcher; `applyTaskbarVisibility()` now re-asserts `setSkipTaskbar(true)`
  on **all** seven windows and restores overlay focus on macOS after
  `app.dock.hide()`; show/restore/minimize/ready-to-show re-asserts added for
  launcher, consent, onboarding.
- `scripts/verify-taskbar-config.cjs` — new static guard: fails CI if any
  `BrowserWindow` lacks `skipTaskbar` at creation or is missing from the
  re-assert loop.
- `.github/workflows/ci-stag.yml` — runs the verifier on every push/PR.

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
  macOS via `app.dock.show()/hide()` with a post-hide refocus for the overlay.
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
- **macOS**: with the Dock icon hidden, Cmd+Tab no longer lists the app, and
  the app cannot be activated by clicking a Dock icon (there is none) — tray
  restore is the supported path. `app.dock.hide()` deactivates the app; the
  fix re-focuses the overlay. We intentionally keep the `regular` activation
  policy (not `accessory`) so the menu bar (and its Edit menu, required for
  Cmd+C/V/A paste) keeps working — with `accessory`, macOS hides the menu
  bar entirely, which would break keyboard paste in the settings window.
- **General**: hiding the taskbar/dock entry never stops the process;
  global shortcuts, notifications, and IPC keep working by design.

## Validation

- `scripts/verify-taskbar-config.cjs` — PASS (7 windows covered).
- `npm run test:ci` — 26 test files passed.
- `npm run build` — all renderers build.
- Runtime GUI validation on Windows 10/11, macOS (Intel + Apple Silicon), and
  Ubuntu/GNOME (X11 + Wayland) must be done on physical machines; the static
  guard and the constructor-first design remove the known failure modes above.
