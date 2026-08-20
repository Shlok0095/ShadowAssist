# Floating overlay

The overlay is a always-on-top floating panel above your other windows. It has two states: a **collapsed notch** (status bar) and an **expanded panel** (chat, transcript, input).

## Notch (collapsed bar)

The slim bar shows at a glance:

- App logo and status
- **Listen** button (mic) — start/stop the listening session
- **Settings** — opens the settings window
- **Quit** — fully exits VeilAssist

The notch is designed without obvious hover tooltips during screen sharing.

## Expand and collapse

The panel **expands** automatically when you:

- Start Listen
- Send a question or use an Ask hotkey
- Receive a streaming AI response

**Collapse** manually or press **Stop Listen** to end the session view.

| Action | Default shortcut |
|--------|------------------|
| Show / hide overlay | `Ctrl+\` |
| Hide overlay | `Escape` |
| Focus overlay input (stealth typing) | `Ctrl+Shift+T` |

## Move and resize

- **Move** — drag the top strip (notch or panel header) to reposition anywhere on screen.
- **Resize** — drag edges and corners when expanded (within min/max limits).
- **Nudge position** — `Ctrl+Arrow keys` (customizable in Settings → Keybinds).
- **Snap to corner/edge** — Settings → General → Snap position (Top-Right, Top-Left, Bottom-Right, Bottom-Left, Center-Right).

## Live transcript panel

When Listen is active, the overlay can show **Me** and **Participant** columns for the running transcript.

- **Settings → General → Live transcript panel** — turn on/off.
- **Transcript auto-scroll** — follows new speech automatically.

Speaker labels use a heuristic (your mic vs system/loopback audio) — not true diarization.

## Reading modes

| Setting | Location | Effect |
|---------|----------|--------|
| **Teleprompter mode** | Advance → Overlay | Larger type, minimal chrome for reading answers aloud |
| **Focus mode** | Advance → Overlay | Hides input until you tap — less visual clutter |
| **Pin answers to top** | General | Streaming answers stay pinned at the top while scrolling history |

## Appearance

**Settings → General → Overlay appearance:**

| Control | What it does |
|---------|--------------|
| **Accent color** | Applies to overlay and Global Chat (settings UI stays neutral) |
| **Window opacity** | Subtle (65%), Balanced (85%), Clear (92%), or custom slider |
| **Answer text size** | Small, medium, or large |
| **Panel width / height** | Advance → Overlay — set dimensions and click Apply |

## Stealth and discretion

| Setting | What it does |
|---------|--------------|
| **Hide from screen capture** | Windows content protection — harder to capture in shares and recordings |
| **Mouse passthrough** | Clicks pass through outside the overlay; move cursor over the notch/panel to interact |
| **Hide from taskbar** | No taskbar icon for the overlay window |

## Audio consent

The first time you start Listen, a modal reminds you to disclose AI use to meeting participants when required.

## Scroll answers

When the response panel has long content:

| Action | Default shortcut |
|--------|------------------|
| Scroll answers up | `Ctrl+Shift+Up` |
| Scroll answers down | `Ctrl+Shift+Down` |
