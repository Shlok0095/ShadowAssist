// Copyright (c) 2026 VeilAssist. All rights reserved.
// macOS Dock-visibility regression harness. Runs inside REAL Electron
// (same binary the app ships with) and exercises every interaction that
// previously made the Dock icon reappear ~1s after app.dock.hide().
//
// Usage (macOS only): node_modules/.bin/electron scripts/verify-dock.cjs
// Exit code 0 = all assertions passed, 1 = regression detected.

const { app, BrowserWindow, Tray, nativeImage, clipboard, Notification } = require('electron')
const path = require('path')

const { setDockVisibility, isDockHidden } = require('../main/dockPolicy.js')

// macOS-only: the Dock API does not exist on Windows/Linux — skip cleanly
// instead of failing the pipeline with misleading results.
if (process.platform !== 'darwin') {
  console.log('verify-dock: SKIPPED (Dock APIs are macOS-only)')
  app.exit(0)
}

const results = []
let failures = 0

function record(name, ok, detail) {
  results.push({ name, ok, detail })
  if (!ok) failures += 1
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitFor(desc, fn, timeoutMs = 4000, stepMs = 100) {
  const deadline = Date.now() + timeoutMs
  let last
  while (Date.now() < deadline) {
    try {
      last = fn()
    } catch (e) {
      last = e
    }
    if (last === true) return true
    await sleep(stepMs)
  }
  return last
}

function assertHiddenEventually(desc, timeoutMs = 4000) {
  return waitFor(desc, () => isDockHidden() && app.dock.isVisible() === false, timeoutMs)
}

async function main() {
  await app.whenReady()

  // ---- Fixtures -----------------------------------------------------------
  const win = new BrowserWindow({ width: 300, height: 200, show: false })
  await win.loadURL(
    'data:text/html,<html><body><input id="t" value="" style="width:250px"></body></html>'
  )

  const trayIcon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  )

  // ---- 1. Baseline: dock shown --------------------------------------------
  setDockVisibility(true)
  await waitFor('baseline show', () => app.dock.isVisible() === true)
  await sleep(800) // let the OS settle the show (mirrors real toggle timing)
  setDockVisibility(false)
  record('1. disable -> dock hidden at runtime', await assertHiddenEventually('hide', 5000),
    `isDockHidden=${isDockHidden()}`)

  // ---- 2. THE REGRESSION: activation storm (old code failed here) ---------
  // app.dock.hide() + regular policy -> icon returns on first activation.
  for (let i = 0; i < 3; i++) {
    app.focus({ steal: true })
    win.show()
    win.focus()
    win.moveTop()
    await sleep(450)
  }
  record('2. activation storm (app.focus/win.show/focus) keeps icon hidden',
    await assertHiddenEventually('storm', 3000))

  // ---- 3. Minimize / restore ----------------------------------------------
  win.minimize()
  await sleep(400)
  const h1 = await assertHiddenEventually('minimize', 3000)
  win.restore()
  win.focus()
  await sleep(400)
  record('3. minimize + restore keeps icon hidden', h1 && (await assertHiddenEventually('restore', 3000)))

  // ---- 4. Tray creation + tooltip -----------------------------------------
  const tray = new Tray(trayIcon)
  tray.setToolTip('VeilAssist dock test')
  record('4. tray creation keeps icon hidden', await assertHiddenEventually('tray', 3000))

  // ---- 5. dock.setIcon (branding path) does not re-show --------------------
  try {
    app.dock.setIcon(trayIcon)
    await sleep(500)
  } catch (_) {}
  record('5. dock.setIcon (runtime branding) keeps icon hidden', await assertHiddenEventually('setIcon', 3000))

  // ---- 6. Notification while hidden ---------------------------------------
  let notifOk = true
  try {
    new Notification({ title: 'VeilAssist dock test', body: 'notification while dock hidden' }).show()
    await sleep(500)
  } catch (e) {
    notifOk = false
  }
  record('6. notification while hidden does not re-show icon', notifOk && (await assertHiddenEventually('notif', 3000)))

  // ---- 7. Clipboard paste still works while dock hidden (accessory policy) --
  // The menu bar is present while the app is active; Cmd+V resolves through
  // the Edit menu accelerator. webContents.paste() is the same code path the
  // accelerator invokes — assert it end-to-end, and report the menu presence.
  win.show()
  win.focus()
  await sleep(300)
  clipboard.writeText('DOCK_PASTE_OK')
  await win.webContents.executeJavaScript(`document.getElementById('t').focus()`)
  win.webContents.paste()
  await sleep(400)
  const pasteValue = await win.webContents.executeJavaScript(`document.getElementById('t').value`)
  const menu = require('electron').Menu.getApplicationMenu()
  record('7. clipboard paste works while dock hidden (accessory policy)', pasteValue === 'DOCK_PASTE_OK',
    `input value = "${pasteValue}" | app menu ${menu ? 'present' : 'MISSING'}`)

  // ---- 8. Re-enable: icon comes back --------------------------------------
  setDockVisibility(true)
  const shownAgain = await waitFor('re-show', () => app.dock.isVisible() === true, 5000)
  record('8. disable setting -> dock icon reappears', shownAgain)

  // ---- 9. Hide again and verify prolonged stability ------------------------
  await sleep(800) // let the show settle before re-hiding (realistic toggle pattern)
  setDockVisibility(false)
  await assertHiddenEventually('hide again', 5000)
  await sleep(1500) // > the ~1s window where the icon used to come back
  record('9. stays hidden >1.5s after re-hide (no delayed reappear)',
    isDockHidden() && app.dock.isVisible() === false)

  tray.destroy()
  win.destroy()
}

main()
  .then(() => {
    console.log('\n=== Dock visibility verification (Electron ' + process.versions.electron + ') ===')
    for (const r of results) {
      console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? ` — ${r.detail}` : ''}`)
    }
    console.log(failures === 0 ? '\nRESULT: ALL PASS' : `\nRESULT: ${failures} FAILURE(S)`)
    app.exit(failures === 0 ? 0 : 1)
  })
  .catch((err) => {
    console.error('verify-dock crashed:', err)
    app.exit(1)
  })
