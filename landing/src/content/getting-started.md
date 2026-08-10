# Getting started

Everything below is served on this site — no GitHub wiki or raw files to open.

## Download

Open the **Download** page (header button or [direct link](/download)) and pick the build for your device — Windows, macOS, or Linux. The page lists every artifact currently published to GitHub Releases, with the rolling **stag** build highlighted when it is the newest.

- **Windows** — `VeilAssist-Setup.exe` installer or portable `VeilAssist.exe`.
- **macOS** — `VeilAssist-mac.dmg` (drag-and-drop install) or zip archive.
- **Linux** — `VeilAssist-linux.AppImage` (portable) or `.deb` package.

Assets and **SHA256SUMS.txt** for a build: [VeilAssist releases](https://github.com/Shlok0095/VeilAssist/releases). Verify hashes when SmartScreen or AV makes you nervous.

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
