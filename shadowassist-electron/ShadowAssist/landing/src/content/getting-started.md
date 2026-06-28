# Getting started

Everything below is served on this site — no GitHub wiki or raw files to open.

## Download

Use **Download** in the header or the home page. It points at the rolling **stag** build on GitHub (tag **`latest-stag`**), not the generic “Latest” release (GitHub ignores prereleases there).

- **Installer (`VeilAssist-Setup.exe`)** — stable filename from CI; classic wizard: license, folder, Start menu entry, optional desktop shortcut on the last page.
- **Portable (`VeilAssist.exe`)** — one file, no install. Good for USB or locked-down machines.

Assets and **SHA256SUMS.txt** for that build: [VeilAssist releases (latest-stag)](https://github.com/Shlok0095/VeilAssist/releases/tag/latest-stag). Verify hashes when SmartScreen or AV makes you nervous.

## First launch

1. **Consent** — All legal checkboxes are required. You can open Terms, Privacy, and License from the app.
2. **Onboarding** — Pick a provider (e.g. Groq, OpenAI, NVIDIA NIM), paste **your** API key, run **Test** until it succeeds.
3. **BYOK confirmations** — Acknowledge that you supply keys and traffic goes to your vendor.
4. **Overlay** — The floating panel appears; the app also lives in the **system tray** (^ near the clock).

Closing the overlay does **not** quit the app. Right-click the tray icon → **Quit** to fully exit.

## After install

- **Listen** — Mic button or `Ctrl+Shift+\` starts session capture; **Stop** ends it.
- **Ask AI** — `Ctrl+Enter` with screen, `Ctrl+Shift+Enter` without screen, or type in the input bar.
- **Settings** — `Ctrl+Shift+S` — providers, profile, audio, intelligence, keybinds, privacy.
- **Tray** — Launcher, Global Chat, Phone Mirror, and Quit live in the tray menu.

## Uninstall

- **Installer build** — Settings → Apps → VeilAssist, or `Uninstall VeilAssist` from the install folder.
- **Portable** — Delete `VeilAssist.exe` and optionally remove `%AppData%\VeilAssist-v2` for a clean slate.

## Full documentation

Every feature is documented in the guides below (same content as **Settings → Help** in the app):

| Topic | Guide |
|-------|-------|
| Product overview | [Overview](/docs/overview) |
| Install, tray, first launch | [Install and first launch](/docs/install-and-first-launch) |
| Floating panel | [Overlay](/docs/overlay) |
| Speech capture & STT | [Listen and transcription](/docs/listen-and-transcription) |
| Questions, chips, skills | [Asking AI](/docs/asking-ai) |
| Personas & `/skills` | [Profile and skills](/docs/profile-and-skills) |
| LLM providers & models | [AI providers](/docs/ai-providers) |
| Memory & smart routing | [Intelligence and memory](/docs/intelligence-and-memory) |
| Google Calendar & recaps | [Calendar and recaps](/docs/calendar-and-recaps) |
| Phone Link & USB mirror | [Phone companion](/docs/phone) |
| Extra windows | [Global Chat and Launcher](/docs/global-chat-and-launcher) |
| All hotkeys | [Keyboard shortcuts](/docs/keybinds) |
| Data & privacy | [Privacy and data](/docs/privacy-and-data) |
| Fixes | [Troubleshooting](/docs/troubleshooting) |

- [Shipping & releases](/docs/shipping) — Tags, CI builds, Pages deploy (for contributors).
- [Terms](/legal/terms) · [Privacy](/legal/privacy) — Legal text mirrored from the app.
