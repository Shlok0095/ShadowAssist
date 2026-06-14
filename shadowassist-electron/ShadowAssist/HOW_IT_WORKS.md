# How VeilAssist Works

VeilAssist is an **undetectable AI assistant for live meetings**: it stays on your screen, listens when you enable it, reads on-screen content when you allow it, and answers in a compact floating panel so you can follow meetings without switching apps. It is **positioned for meetings only** (not hiring interviews); you must still disclose AI use wherever your organization or participants require it.

---

## Task Manager shows “Electron” (development)

If you start the app with **`npm start`** or **`npm run dev`**, Windows runs **`electron.exe`** from `node_modules`. Task Manager will list **Electron** (often several processes) and the **Electron logo**. That is normal: you are running the generic Electron runtime, not the packaged VeilAssist binary.

To see **VeilAssist** with **your icon** in Task Manager:

1. Build the Windows app: **`npm run dist`** (portable `dist\VeilAssist.exe`) or **`npm run dist:dir`** (unpacked `dist\win-unpacked\VeilAssist.exe`).
2. **Quit** any dev session (`npm run kill-electron`).
3. Run **`dist\VeilAssist.exe`** (or **`npm run open:portable`** after a portable build), or **`dist\win-unpacked\VeilAssist.exe`** (or **`npm run open:unpacked`** after `dist:dir`).

The tray build uses **`VeilAssist.exe`**; use **`npm run kill-veilassist`** if you need to force-close that process.

---

## Starting and staying in the background

When you launch the app, it places an icon near the system clock (notification area). Closing the floating panel does **not** quit the program; it keeps running from that icon. Use the icon’s menu to show the panel again or to exit completely. Only one copy of the app is meant to run at a time—if you try to open it twice, you are reminded that it is already running.

### First launch: consent and API keys

On a **new install** (or after a consent- or data-epoch update), you must complete a **legal consent** screen (all checkboxes) before anything else runs. Use **Open Terms / Privacy / License** to view the bundled text files in your default app. Then **onboarding** opens: you choose a provider, paste **your own** API key (nothing is bundled), run **Test** until it succeeds, acknowledge **BYOK** statements, and only then can you start the overlay.

The **NSIS installer** shows **Terms** from `legal/terms.txt`, lets you pick the install folder and **per-user vs all users**, then creates **Start menu** and **desktop** shortcuts. **`runAfterFinish` is off** — the wizard closes when you click Finish; you start VeilAssist from the shortcut (not auto-launched). The **portable** `VeilAssist.exe` has **no** wizard and opens the app as soon as you run it. Keys live under your Windows user profile (`AppData`); they are never downloaded from GitHub—only you paste them.

If you still see old keys after an update, the app may have run a one-time **data migration** that clears secrets—otherwise uninstall / delete app data in Settings to reset.

---

## The floating panel

The panel sits above your other windows. You can:

- **Expand and collapse** — A slim bar shows status at a glance; expanding opens the conversation area and input.
- **Move it** — Drag the top strip to reposition it on your screen.
- **Resize it** — Use the edges and corners when the panel is expanded (within allowed minimum and maximum sizes).
- **Hide it** — The close control on the bar hides the panel; use the tray icon or the keyboard shortcut to bring it back.
- **Adjust appearance** — In settings you can change transparency, text size, default size, accent color, and snap the panel to a corner or edge of your main display.

The panel is designed to avoid obvious “help” cues during screen sharing (for example, no hover pop-up labels on the bar controls).

---

## Session: Listen

**Listen** turns the session **on**. While the session is active, the app can capture **microphone** audio and, when possible, **system audio** (what is playing on the computer). Audio is processed in short segments. When speech is detected, it is turned into text and accumulated as a running transcript.

**Stop** ends the session and stops capturing audio.

If your chosen connection does not support microphone transcription on the same account, settings may ask you to add a **fallback** key from a provider that does—so the mic can still be transcribed while you use another service for answers.

### Meetings, calendar, and recaps (optional)

In **Settings → Meetings** you can:

- **Connect Google Calendar (OAuth)** — after you add Google Cloud desktop-app credentials, VeilAssist can list **upcoming accepted meetings** (the same kind you see in Calendar after you accept an invite from email).
- **Reminders** — optional Windows notifications a few minutes before a meeting (or at start time, depending on your setting).
- **Meeting summary** — when you end a Listen session with **Stop**, VeilAssist can generate a **short bullet summary** of what was captured in that session (transcript, asks, and overlay activity in the app). The summary is **stored on your computer** in app settings, so it remains available after you close or restart the app. If a full model request cannot run (for example, no API key is configured for your active provider, or the provider call fails), the app falls back to a **simple text recap** built from the captured session so you still get bullets instead of an empty “error” state.

This path does **not** require calendar integration: summaries come from the Listen session only. Calendar is an optional convenience layer for seeing scheduled meetings in one place.

---

## Asking for help

You can ask in two main ways:

1. **Type** a question in the input area and send it.
2. Use the **keyboard shortcut** configured in settings (defaults are listed there) to ask using the current transcript and screen context without typing a question.

When a request starts, the panel expands and the assistant **streams** the reply so words appear as they are produced. You can scroll the answer area and, where offered, copy code blocks.

---

## What the assistant “sees” and “hears”

Each request is built from pieces you control:

| Source | What it does |
|--------|----------------|
| **Your persona** | Text you define (and optional quick presets) describing how answers should sound and behave. |
| **Resume** | Optional: text extracted from a file you upload, so answers can align with your real background. |
| **Role / job notes** | Optional: job description or notes so answers can match a target role. |
| **Playbooks** | Optional reference material you attach; only enabled playbooks are included. |
| **Audio transcript** | Recent speech from the session, when Listen has been on. |
| **Screen text** | If screen reading is enabled, text taken from the display on a timer; before each question, a fresh read may run if the last one is too old. |
| **Screen picture** | If your chosen provider supports it, a still image of the screen may be attached so the assistant can interpret visuals, not only text. |

The assistant is instructed to treat **what was said** as especially important when both audio and screen content exist. If you send only audio, it answers from that; if you send only a question, it uses screen text (and image if applicable) as context.

---

## Settings overview

Settings open in a separate window (also reachable from the tray and via shortcut). Typical sections:

- **Connection** — Pick which provider you use, enter your key, choose the chat model, test the connection, and refresh model lists where supported. Speech-to-text options appear for providers that include them on the same account.
- **Profile** — Persona text, resume upload, and role/job notes; saved when you finish editing fields or upload.
- **Display** — Accent color, panel opacity, answer text size, width and height, and snap positions on the primary monitor.
- **Session** — Turn screen reading and microphone pipelines on or off, adjust how often the screen is read and how long audio segments are, with a control to restore default timings.
- **Meetings** — Optional Google Calendar connection (OAuth + your own client ID/secret), meeting reminders, and **Listen session** summaries. Summaries are stored locally on your device.
- **Shortcuts** — Global shortcuts for toggling the panel, asking, clearing the chat, starting or stopping the session, moving and scrolling the panel, opening settings, and copying the last full reply.

Keys for providers are stored on your machine in encrypted form when your computer supports secure storage.

---

## Tray icon

The tray icon can reflect whether the listening session is active. Its menu offers quick actions such as showing the panel, opening settings, and quitting the app.

---

## First run

The first time you use the app, onboarding walks you through choosing a connection and basic profile options. After that, the full settings window is available anytime.

---

## Practical summary

1. Put the panel where you want it and set appearance in **Display**.
2. Connect your account under **Connection** and pick models.
3. Optionally fill **Profile** and playbooks for richer, role-specific answers.
4. Press **Listen** when you want speech captured; type or use the ask shortcut when you want an answer.
5. Use **Stop** when you are done listening; hide the panel or toggle it with shortcuts when you need discretion.

That is the full loop: background presence, optional listening, optional screen reading, one combined request to your chosen provider, and answers in the floating panel.
