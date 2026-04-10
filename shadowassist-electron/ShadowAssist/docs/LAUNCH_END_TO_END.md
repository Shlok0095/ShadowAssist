# ShadowAssist — launch from zero to live

This guide walks through shipping the Windows app and a small public site, in order.

## 1. Repository and versioning

1. Put the project on GitHub (or another host) so you can point downloads and docs at stable URLs.
2. Bump `version` in `package.json` before each public release. The NSIS installer filename includes that version (`ShadowAssist-Setup-<version>.exe`).

## 2. Build artifacts locally

From the project root (Windows):

```powershell
npm install
npm run dist:release
npm run dist:checksums
```

Outputs in `dist/`:

- `ShadowAssist.exe` — portable (no installer)
- `ShadowAssist-Setup-<version>.exe` — installer (user can pick install folder)
- `SHA256SUMS.txt` — SHA-256 of those `.exe` files (publish next to downloads)

**Faster iteration:** `Launch-ShadowAssist-Fast.cmd` runs the existing portable exe without rebuilding. Use `npm run dist` when you only need the portable exe.

## 3. Code signing (optional, recommended for Windows)

Unsigned builds show SmartScreen warnings. To reduce friction:

1. Obtain a **Windows code signing** certificate (commercial CA or your org’s process).
2. Configure `electron-builder` with your certificate (env vars or `win.certificateFile` / `certificatePassword`). See [electron-builder code signing](https://www.electron.build/code-signing).
3. Set `forceCodeSigning: true` only when your CI or machine can sign reliably.

Signing is not automated in this repo because it requires your secret material.

## 4. GitHub Releases (automated)

The workflow `.github/workflows/release-windows.yml`:

- On **push** to **`stag`** (and **workflow_dispatch**): builds NSIS + portable, uploads workflow artifacts, and creates/updates the prerelease **`latest-stag`** with **`ShadowAssist-Setup.exe`**, **`ShadowAssist.exe`**, and checksums. Direct installer URL:  
  `https://github.com/<owner>/<repo>/releases/download/latest-stag/ShadowAssist-Setup.exe`
- On **push** of a tag **`v*.*.*`**: builds and publishes a **versioned** GitHub Release (non-prerelease path) via `softprops/action-gh-release`.

Versioned release (optional):

```powershell
git tag v1.0.1
git push origin v1.0.1
```

## 5. Landing page (`landing/`)

1. Download URLs live in **`landing/src/config/site.ts`** (`rollingTag`, `downloadSetupExeUrl`, `downloadPortableExeUrl`). They target **`latest-stag`** so the site stays in sync with CI without using `releases/latest` (which skips prereleases).
2. Copy legal files next to the site if you do not use GitHub raw URLs:

   ```powershell
   New-Item -ItemType Directory -Force -Path landing\legal | Out-Null
   Copy-Item legal\*.txt landing\legal\
   ```

3. **GitHub Pages:** Settings → **Pages** → Source: **GitHub Actions**. Pushes to **`stag`** run `.github/workflows/deploy-landing.yml`. Example URL: `https://shlok0095.github.io/ShadowAssist/`.

4. Or deploy **`landing/dist`** from any static host after `npm run build` inside `landing/`.

**Stable download pattern:** Use **`releases/download/latest-stag/ShadowAssist-Setup.exe`** (and the portable name) so every stag push replaces the same URLs.

## 6. Legal and policy

- Host or link to `legal/terms.txt` and `legal/privacy.txt` from the same domain as your marketing page when possible.
- Keep in-app copy and site copy aligned with your actual product behavior (e.g. meetings-only positioning).

## 7. Checklist before you announce

- [ ] `npm run dist:release` succeeds on a clean machine or CI.
- [ ] `SHA256SUMS.txt` published alongside binaries; optional: tweet/post the hashes.
- [ ] Landing `src/config/site.ts` URLs match your repo/tag; legal links work.
- [ ] GitHub Pages uses **GitHub Actions**; **Deploy landing** workflow has run at least once.
- [ ] Release notes mention Windows version, API keys (BYOK), and support channel.
- [ ] SmartScreen / antivirus: expect false positives on new unsigned builds; signing helps.

## 8. Competitors (positioning reference)

- **Cluely** — polished commercial product, installer, calendar-oriented flow, hosted docs.
- **Pluely** — open distribution model, per-OS downloads, BYOK and optional API keys.

Use them as benchmarks for clarity of download paths and docs, not as a template for claims you cannot substantiate.
