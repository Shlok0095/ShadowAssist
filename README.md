# ShadowAssist v2

Undetectable AI for live meetings — discreet on-screen meeting assistant (React, Tailwind, Electron).

## Quick start (Windows)

**Option A — double-click**

`Launch-ShadowAssist.cmd` (in this folder)

**Option B — terminal**

```powershell
cd shadowassist-v2
npm install
npm start
```

**If “nothing happens” when you run again**

The app often **stays in the system tray** after you close the overlay. Either:

- Tray **^** → ShadowAssist icon → **Show** or **Quit**
- Or: `npm run start:force` (kills all `electron.exe`, then starts fresh)

## Scripts

| Command | What it does |
|--------|----------------|
| `npm install` | Dependencies |
| `npm start` | Build + run app |
| `npm run dev` | Build + run with extra logging |
| `npm run kill-electron` | Force-stop all `electron.exe` (also closes other Electron apps) |
| `npm run start:force` | Kill electron + `npm start` |
| `npm run dist` | Portable `ShadowAssist.exe` in `dist/` |
| `npm run dist:release` | Portable + NSIS installer (`ShadowAssist-Setup-<version>.exe`) |
| `npm run dist:checksums` | Writes `dist/SHA256SUMS.txt` for `.exe` files (after a dist) |

## Go live (website & releases)

End-to-end checklist: [docs/LAUNCH_END_TO_END.md](docs/LAUNCH_END_TO_END.md).

- **Landing page:** static files in `landing/` — edit `site-config.js`, then deploy the folder to any host.
- **CI:** push the repo to GitHub and use `.github/workflows/release-windows.yml` (tag `v*.*.*` to attach binaries to a release).

## Hotkeys (defaults)

- **Ctrl+\\** — Toggle overlay visibility  
- **Ctrl+Enter** — Ask AI  
- **Ctrl+R** — Clear chat  
- **Ctrl+Shift+\\** — Toggle session (listen)  
- **Ctrl+Shift+S** — Settings  
- **Ctrl+Arrows** — Move overlay  

## Structure

```
shadowassist-v2/
├── main/           # Electron main process
├── lib/            # Store, AI client, hotkeys, screen capture
├── renderer/       # React + Tailwind
│   ├── overlay/
│   ├── settings/
│   └── onboarding/
├── out/            # Vite build (generated)
├── landing/        # Static marketing page (deploy as-is)
├── docs/           # Launch & ops notes
└── Launch-ShadowAssist.cmd
```

## Providers

Groq (default), OpenAI, NVIDIA NIM — keys in onboarding or Settings.

## Notes

- **Do not** add a strict `Content-Security-Policy` meta that uses `script-src 'self'` with `file://` — it blocks bundled scripts. CSP was removed for that reason.
- Single-instance lock: only one ShadowAssist v2 at a time; a second launch shows a dialog if the first is still in the tray.
