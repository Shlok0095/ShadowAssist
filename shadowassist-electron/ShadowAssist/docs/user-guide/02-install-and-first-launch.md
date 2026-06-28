# Install and first launch

## Download options

- **Installer (`VeilAssist-Setup.exe`)** — Classic wizard: license, install folder, Start menu and optional desktop shortcut. Does not auto-launch when you click Finish; open VeilAssist from the shortcut.
- **Portable (`VeilAssist.exe`)** — Single file, no install wizard. Good for USB or locked-down machines.

Download from the website header or [GitHub Releases (latest-stag)](https://github.com/Shlok0095/VeilAssist/releases/tag/latest-stag). Verify **SHA256SUMS.txt** when SmartScreen or antivirus flags the file.

## First launch: consent

On a new install (or after a consent/data-epoch update), you must complete the **legal consent** screen before anything else runs.

1. Read and accept all required checkboxes.
2. Use **Open Terms / Privacy / License** to view bundled legal text in your default app.

## Onboarding: API keys

After consent, **onboarding** opens:

1. Choose a provider (Groq, OpenAI, NVIDIA NIM, and others available in full Settings later).
2. Paste **your own** API key — nothing is bundled or downloaded from GitHub.
3. Run **Test** until the connection succeeds.
4. Acknowledge BYOK statements.
5. The overlay appears and the app moves to the system tray.

Keys live under your Windows user profile (`AppData`). If you still see stale keys after an update, the app may have run a one-time **data migration** that clears secrets.

## System tray

Closing or hiding the overlay does **not** quit VeilAssist. The app keeps running from the tray icon near the clock.

**Tray menu actions:**

| Action | What it does |
|--------|--------------|
| **Open / Hide** | Toggle the floating overlay |
| **Start / Stop Session** | Toggle Listen (same as mic button) |
| **Settings** | Open the settings window |
| **Launcher** | Open the compact launcher window |
| **Global Chat** | Open standalone text chat (no screen capture) |
| **Start / Stop Phone Mirror** | Android USB mirror via scrcpy (when adb/scrcpy installed) |
| **Quit** | Fully exit the app |

Double-click the tray icon to toggle the overlay.

## Single instance

Only one copy of VeilAssist runs at a time. If you launch it again, a dialog reminds you it is already running in the tray.

## Open at login

**Settings → General → Open at login** — starts VeilAssist hidden in the tray when you sign in to Windows.

## Uninstall

- **Installer build** — Windows Settings → Apps → VeilAssist, or `Uninstall VeilAssist` from the install folder.
- **Portable** — Delete `VeilAssist.exe`. Optionally remove `%AppData%\VeilAssist-v2` for a clean slate (Settings → Privacy → Delete all data does this from inside the app).

## Task Manager shows “Electron” (development only)

If you run **`npm start`** or **`npm run dev`**, Task Manager lists **Electron** — that is the generic dev runtime, not the packaged app.

To see **VeilAssist** with your icon: build with **`npm run dist`** and run `dist\VeilAssist.exe`.
