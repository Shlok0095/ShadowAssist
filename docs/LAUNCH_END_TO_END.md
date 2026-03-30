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

## 4. GitHub Releases (automated option)

The workflow `.github/workflows/release-windows.yml`:

- On **workflow_dispatch**: builds and uploads a **workflow artifact** (no release).
- On **push** of a tag matching `v*.*.*` (e.g. `v2.0.1`): builds, uploads artifacts, and creates/updates a **GitHub Release** with the portable exe, installer, and `SHA256SUMS.txt`.

Steps:

1. Commit and push the workflow to your default branch.
2. Tag and push:

   ```powershell
   git tag v2.0.1
   git push origin v2.0.1
   ```

3. On GitHub → **Releases**, confirm files attached. Users can use **Latest** or direct download URLs documented on your site.

## 5. Landing page (`landing/`)

1. Open `landing/site-config.js` — URLs point at **github.com/Shlok0095/ShadowAssist**; if you rename the repo or use a CDN, update them. Bump the installer URL when `package.json` version changes.
2. Copy legal files next to the site if you do not use GitHub raw URLs:

   ```powershell
   New-Item -ItemType Directory -Force -Path landing\legal | Out-Null
   Copy-Item legal\*.txt landing\legal\
   ```

3. Deploy the **contents** of `landing/` to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, S3 + CloudFront, etc.). No build step required.

4. After each release, if you hard-coded the installer URL with a version in `site-config.js`, update the version string to match `package.json`.

**Stable download pattern:** Linking to `https://github.com/<owner>/<repo>/releases/latest` avoids updating the portable filename if you always attach `ShadowAssist.exe` with that exact name.

## 6. Legal and policy

- Host or link to `legal/terms.txt` and `legal/privacy.txt` from the same domain as your marketing page when possible.
- Keep in-app copy and site copy aligned with your actual product behavior (e.g. meetings-only positioning).

## 7. Checklist before you announce

- [ ] `npm run dist:release` succeeds on a clean machine or CI.
- [ ] `SHA256SUMS.txt` published alongside binaries; optional: tweet/post the hashes.
- [ ] Landing `site-config.js` URLs updated; legal links work.
- [ ] Release notes mention Windows version, API keys (BYOK), and support channel.
- [ ] SmartScreen / antivirus: expect false positives on new unsigned builds; signing helps.

## 8. Competitors (positioning reference)

- **Cluely** — polished commercial product, installer, calendar-oriented flow, hosted docs.
- **Pluely** — open distribution model, per-OS downloads, BYOK and optional API keys.

Use them as benchmarks for clarity of download paths and docs, not as a template for claims you cannot substantiate.
