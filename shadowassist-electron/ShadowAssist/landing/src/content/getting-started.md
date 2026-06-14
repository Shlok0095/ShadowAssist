# Getting started

Everything below is served on this site — no GitHub wiki or raw files to open.

## Download

Use **Download** in the header or the home page. It points at the rolling **stag** build on GitHub (tag **`latest-stag`**), not the generic “Latest” release (GitHub ignores prereleases there).

- **Installer (`VeilAssist-Setup.exe`)** — stable filename from CI; classic wizard: license, folder, Start menu entry, optional desktop shortcut on the last page.
- **Portable (`VeilAssist.exe`)** — one file, no install. Good for USB or locked-down machines.

Assets and **SHA256SUMS.txt** for that build: [VeilAssist releases (latest-stag)](https://github.com/Shlok0095/VeilAssist/releases/tag/latest-stag). Verify hashes when SmartScreen or AV makes you nervous.

## First launch

1. **Consent** — All legal checkboxes are required. You can open Terms, Privacy, and License from the app.
2. **Onboarding** — Pick a provider (e.g. Groq, OpenAI-compatible, NVIDIA NIM), paste **your** API key, run **Test** until it succeeds.
3. **BYOK confirmations** — Acknowledge that you supply keys and traffic goes to your vendor.
4. **Overlay** — The floating panel appears; the app also lives in the **system tray** (^ near the clock).

Closing the overlay does **not** quit the app. Right-click the tray icon → **Quit** to fully exit.

## After install

- **Hotkeys** — Defaults are shown in Settings (toggle overlay, ask, clear, etc.).
- **Listen** — Starts session capture when you enable it; **Stop** ends it.
- **Settings** — Models, persona, appearance, stealth / content protection, and data reset.
- **Meetings & recaps** (optional) — Connect Google Calendar if you want a combined view and reminders. Stopping a listen session can save a **bullet recap** locally (full LLM when your provider is configured, otherwise a short text summary from the captured session).

## Uninstall

- **Installer build** — Settings → Apps → VeilAssist, or `Uninstall VeilAssist` from the install folder.
- **Portable** — Delete `VeilAssist.exe` and optionally remove `%AppData%\VeilAssist-v2` for a clean slate.

## Where to read more

- [How it works](/docs/how-it-works) — Full product behavior, tray, session, screen context, and disclosures.
- [Shipping & releases](/docs/shipping) — Tags, CI builds, Pages deploy (for contributors).
- [Terms](/legal/terms) · [Privacy](/legal/privacy) — Legal text mirrored from the app.
