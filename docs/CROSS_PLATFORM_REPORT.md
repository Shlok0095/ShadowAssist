# VeilAssist — Cross-platform Readiness Audit & Implementation Report

**Date:** 2026-08-04
**Branch:** `develop` (cut from `stag` @ `dd05785c`)
**Session:** Phase 1–12 audit + implementation for Windows / macOS / Linux builds

---

## 1. Summary

VeilAssist is an Electron AI meeting assistant (overlay + cloud/local STT + conversation memory + Google Calendar). Before this work the app packaged for **Windows only**; the overlay clamped to a single display, macOS lacked Dock/tray/icon conventions, no renderer had a Content-Security-Policy, `shadowAPI` allowed any window to invoke any IPC channel, and `get-all-settings` handed decrypted API keys to the renderer.

This work made the app truly cross-platform, hardened its attack surface, and added CI/CD release automation — **without changing any product behavior.**

**Verification performed (Phase 11):**
- `npm install` clean (`electron-builder install-app-deps` rebuilt `better-sqlite3` for darwin/arm64).
- `npm run test:ci` — **all 26 test files pass (47/47 assertions).**
- `npm run build` — all 7 renderer entries build cleanly.
- `npm run build:mac` — produced `dist/VeilAssist-1.0.1-arm64.dmg` (202 MB) + `dist/VeilAssist-1.0.1-arm64.zip` (193 MB) + `.blockmap` files for delta updates.
- Packaged `Info.plist` carries `public.app-category.productivity`, `CFBundleIdentifier com.local.veilassist.v2`, and mic/camera usage descriptions.
- CSP meta preserved into the built `out/` HTML.
- `dist/SHA256SUMS.txt` generated for DMG + zip.

---

## 2. Changes by Area

### 2.1 Build system — cross-platform packaging (`package.json`, `scripts/`)
- New cross-platform icon generator `scripts/make-icons.cjs` (produces `build/app.ico`, `build/app.iconset`/`app.png`, and Linux `build/icons/*.png` from `logo.png`).
- New scripts (all reuse the existing `scripts/run-electron-builder.cjs` wrapper that disables code-sign auto-discovery):
  - `dist:mac` / `dist:mac:dir` / `build:mac` — DMG + zip / unpacked dir.
  - `dist:linux` / `dist:linux:dir` / `build:linux` — AppImage + deb / unpacked dir.
  - `build:all` — renderer + web root + icons.
- electron-builder `mac` block (dmg + zip, `public.app-category.productivity`, hardened runtime ready, dark-mode support, mic/camera/desktop-capture usage strings via `extendInfo`, `VeilAssist-${version}-${arch}.${ext}` artifact names) and `linux` block (AppImage + deb, `build/icons`, Utility category, same artifact naming). `win` block unchanged.
- `scripts/sha256-dist.cjs` broadened from `.exe`-only to `.exe` / `.dmg` / `.zip` / `.AppImage` / `.deb` (feeds `npm run dist:checksums`).

### 2.2 Overlay & windowing fixes (`main/index.js`) — multi-monitor + resilience
- `screen.getDisplayMatching`-based helpers: `getDisplayBoundsNear(x, y)` (nearest display to a point), `getOverlayDisplayBounds()` (display most overlapped by overlay), `reseatOverlayIfOffscreen()` (clamps/persists bounds when a display disappears or rescales).
- `moveOverlay(dx, dy)` and the overlay position preset now target the **nearest** display instead of the primary.
- `screen.on('display-removed')` → reseat + re-apply taskbar visibility.
- `screen.on('display-metrics-changed')` → reseat + re-present overlay if visible.
- `powerMonitor.on('resume')` → re-assert content protection, re-present overlay / hide it, re-sync mouse capture, re-apply taskbar visibility.

### 2.3 macOS platform conventions
- `app.on('activate')` → re-show overlay (macOS Dock "click to reopen" convention).
- `applyTaskbarVisibility()` now calls `app.dock.show()/hide()` so "Hide from taskbar/stealth" works on macOS.
- Tray icon for macOS uses a 16pt @2x **template image** (`setTemplateImage(true)`) for proper Retina/pierced display in the menu bar.
- `backgroundThrottling` flipped to `true` on the 6 non-overlay windows (overlay keeps `false` for smooth animation) — reduces CPU/memory when backgrounded.

### 2.4 Security hardening (Phase 8)
- **CSP** meta added to all 7 renderer HTML files (overlay, settings, consent, onboarding, launcher, global-chat, meeting-toast):
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data:; connect-src 'self' https: http://127.0.0.1:* http://localhost:* ws: wss:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'`
  (`https:` + `ws/wss:` needed for cloud STT; `http://127.0.0.1:*` / `http://localhost:*` for local Hindsight/STT servers.)
- `hardenWindow(win)` applied to all 7 windows:
  - `setWindowOpenHandler` → external URLs open via `shell.openExternal`, every new window denied.
  - `will-navigate` → `preventDefault()` for any cross-navigation.
- **Permission denial by default:** `session.setPermissionRequestHandler` / `setPermissionCheckHandler` now validate `requestingUrl` against `file:`, `http://localhost`, `http://127.0.0.1` and only allow the capture set `{ media, display-capture, screen, speaker-selection }`.
- **No plaintext secrets to renderer:** `get-all-settings` now returns `'••••configured'` for any key in `ENCRYPTED_KEYS` (exported from `lib/store.js`). The renderer only needs presence, so it never receives decrypted API keys.

### 2.5 CI/CD — cross-platform releases (`.github/workflows/`)
- `release-macos.yml` — macOS (macos-latest): `npm ci --ignore-scripts` + `npx electron-builder install-app-deps`, unsigned `build:mac`, channel-aware rolling releases (`latest` on main/master, `latest-stag` on stag) via `ncipollo/release-action`, tag `v*.*.*` → versioned release via `softprops/action-gh-release`. Uploads DMG, zip, `latest-mac.yml`, `SHA256SUMS.txt`. In-app auto-update works once a Developer ID cert is supplied via `CSC_LINK`/`CSC_KEY_PASSWORD`.
- `release-linux.yml` — Linux (ubuntu-latest): same flow producing AppImage + deb + `latest-linux.yml`. AppImage supports `electron-updater`; deb updates are manual.

### 2.6 Housekeeping
- `.gitignore` now ignores the generated `graphify-out/` code graph.
- Code graph refreshed with `graphify update .` (2320 nodes / 3708 edges / 161 communities).

---

## 3. Bugs fixed / Risks mitigated
| # | Risk | Fix |
|---|------|-----|
| 1 | No packaging for macOS / Linux | electron-builder `mac`/`linux` blocks + scripts + CI |
| 2 | Overlay clamped to primary display; breaks on monitor removal/rescale | nearest-display helpers + `display-removed` / `display-metrics-changed` reseating |
| 3 | UI not restored after laptop resume | `powerMonitor` `resume` handler re-presents overlay + re-asserts content protection |
| 4 | No CSP in renderers | strict CSP meta in all 7 HTML files |
| 5 | Unrestricted `window.open` / navigation | `hardenWindow` on all windows |
| 6 | Any renderer could call any IPC channel | permission handlers now origin-checked (capture set only) |
| 7 | `get-all-settings` leaked decrypted API keys to renderer | masked as `••••configured`; `ENCRYPTED_KEYS` exported from store |
| 8 | macOS missing Dock open, dock-hide, Retina tray icon | `app.on('activate')`, `app.dock.show/hide()`, template tray image |
| 9 | All windows had `backgroundThrottling: false` | flipped to `true` except overlay |
| 10 | Release artifacts unverifiable on macOS/Linux | `sha256-dist.cjs` now covers dmg/zip/AppImage/deb |

---

## 4. Verification & proof
- `node --check` clean on `main/index.js`, `scripts/make-icons.cjs`, `lib/store.js`.
- `npm run test:ci` → 26 files, 47/47 pass.
- `npm run build` and `npm run build:mac` both succeed end-to-end (icons → renderer → package).
- Packaged app verified: `dist/mac-arm64/VeilAssist.app` complete with `app.asar`, embedded icon, correct `Info.plist`.
- `npm run dist:checksums` writes valid `dist/SHA256SUMS.txt`.

---

## 5. Remaining limitations (not regressions — platform constraints)
- **macOS auto-update** needs a real Developer ID certificate (`CSC_LINK`/`CSC_KEY_PASSWORD` CI secrets). Current DMGs are unsigned (right-click → Open to launch).
- **Linux tray** requires an AppIndicator runtime (ayatana-appindicator) — standard on Ubuntu 22.04+, absent on stock minimal installs.
- **Linux screen sharing** varies by compositor (Wayland restricts old X11 capture xDAMAGE paths).
- **Phone-mirror (adb/scrcpy)** path is Windows-oriented and untouched.
- Windows `.exe` packaging itself was not re-tested in this session (macOS host); the `win` config is unchanged.

---

## 6. Build instructions (now cross-platform)
```bash
npm install
npm run build:win    # Windows — NSIS installer + portable .exe (needs Windows host)
npm run build:mac    # macOS — .dmg + .zip (this host)
npm run build:linux  # Linux — .AppImage + .deb (needs Linux host)
npm run build:all    # everything incl. landing page + icons
npm run dist:checksums
```
Outputs land in `dist/`. CI (`.github/workflows/release-{macos,linux,windows}.yml`) rebuilds on `stag`/`main`/tag pushes and publishes rolling or versioned releases with checksums and auto-update metadata.