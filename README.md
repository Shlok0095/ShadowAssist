# ShadowAssist v2

[![Latest release](https://img.shields.io/github/v/release/Shlok0095/ShadowAssist?label=release)](https://github.com/Shlok0095/ShadowAssist/releases/latest)
[![Landing site](https://img.shields.io/badge/site-landing-7c6cf0)](https://shlok0095.github.io/ShadowAssist/)

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

### Landing on GitHub Pages

1. Repo **Settings** → **Pages** → **Build and deployment** → Source: **GitHub Actions**.
2. Merge/push to **`stag`** (or run workflow **Deploy landing to GitHub Pages** manually). Workflow: `.github/workflows/deploy-landing.yml`.
3. Public URL (this repo): **https://shlok0095.github.io/ShadowAssist/** — download buttons work after you publish a **Release** with the `.exe` assets (see below).

### Windows release binaries

When `package.json` version matches your release (e.g. **2.0.1**), create and push a matching tag so CI builds and attaches artifacts:

```powershell
git tag v2.0.1
git push origin v2.0.1
```

Workflow: **Release Windows** (`.github/workflows/release-windows.yml`). You can also run it from the **Actions** tab without a tag to download artifacts only; tags create the GitHub Release with notes + portable + installer + `SHA256SUMS.txt`.

**Before tagging:** run `npm run dist:release` locally once if you want to sanity-check the build; CI does the official build.

### GitHub: make `stag` the default branch

The remote may still use **`main`** as default. To match this repo’s workflow:

1. **GitHub CLI** (installed as `GitHub CLI` on Windows — restart the terminal, then `gh auth login` once):

   ```powershell
   gh auth login
   gh repo edit Shlok0095/ShadowAssist --default-branch stag
   ```

2. **Or** a **personal access token** with repo admin (classic `repo`, or fine-grained **Administration** write on this repo):

   ```powershell
   $env:GITHUB_TOKEN = "ghp_your_token_here"
   .\scripts\set-github-default-branch.ps1
   ```

   To delete remote **`main`** after the default is `stag`:

   ```powershell
   .\scripts\set-github-default-branch.ps1 -DeleteRemoteMain
   ```

3. Refresh this clone: `git fetch origin` then `git remote set-head origin -a` (or keep `git remote set-head origin stag`).

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
