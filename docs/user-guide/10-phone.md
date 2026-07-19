# Phone companion and mirror

**Settings → Phone** — optional Phone Link (QR companion on your phone) and Android USB screen mirror (scrcpy).

Desktop Listen, STT, and screen capture stay unchanged unless you opt in below.

## Phone Link (QR companion)

Shows live transcript and AI answers on your phone over the same Wi‑Fi network.

### Enable

1. **Settings → Phone → Enable Phone Link** — starts a small LAN server (off by default).
2. A **QR code** appears in Settings.
3. Scan with your phone browser on the **same Wi‑Fi** as your PC.
4. Server status shows port and connected phone count.

### Remote microphone

**Remote microphone** — phone sends voice to the PC during Listen. Desktop mic is not disabled; both can contribute.

### Regenerate token

If you need a new QR/link, use **Regenerate token** in the Phone panel.

### Firewall

Allow VeilAssist through Windows Firewall on private networks if the phone cannot connect.

## Android USB mirror (scrcpy)

Mirror your Android device screen on the PC via USB debugging.

### Prerequisites

- **adb** (Android Debug Bridge) on PATH
- **scrcpy** on PATH
- USB debugging enabled on the phone
- Device connected by USB

Settings → Phone shows probe status for both tools.

### Start mirror

1. Select device from the dropdown (or leave default if one device).
2. Click **Start mirror** — a separate window titled “VeilAssist Phone Mirror” opens.
3. **Stop mirror** when done.

Or use **Tray → Start / Stop Phone Mirror** without opening Settings.

### Include phone in Ask AI

**Include phone in Ask AI** — when mirror is running, `Ctrl+Enter` can attach an adb screencap alongside the desktop screenshot so the model sees your phone screen too.

### Max size

Adjust **Max size** to limit mirror resolution for performance.

## When to use which

| Use case | Feature |
|----------|---------|
| Read answers on phone during a call | Phone Link QR |
| Use phone as extra mic | Phone Link remote mic |
| Show mobile app on desktop | USB mirror |
| Ask AI about phone screen content | USB mirror + Include in Ask |
