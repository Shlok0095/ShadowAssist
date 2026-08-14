# Capture privacy — testing matrix

VeilAssist uses **documented, own-process** APIs (`BrowserWindow.setContentProtection` → Windows `WDA_EXCLUDEFROMCAPTURE` where supported). This is **best-effort capture exclusion**, not guaranteed invisibility.

VeilAssist is **not** designed to defeat proctoring software, employer monitoring, or security products. Tests below validate **user-controlled capture privacy**, not evasion of third-party integrity tools.

## Automated (CI / dev)

```bash
node scripts/verify-capture-protection-config.cjs
node scripts/verify-background-process-config.cjs
node scripts/verify-taskbar-config.cjs
node scripts/test-capture-protection-policy.cjs
```

## Manual matrix (Windows)

| Test | Stealth | Action | Expected |
|------|---------|--------|----------|
| A | OFF | OBS / Teams / Zoom desktop capture | Overlay pixels **visible** in capture |
| B | ON | Same capture | Overlay region **absent** or black (Chromium regression) |
| C | ON→OFF toggle | Repeat A/B | Behavior follows toggle |
| D | ON | Win32 style refresh (show overlay, toggle invisible) | Protection still armed — no flash leak |
| E | ON | Ctrl+Enter screen ask | Overlay hidden before screenshot (`withOverlayExcludedFromScreenCapture`) |

## macOS

ScreenCaptureKit on macOS 15+ often **ignores** legacy content protection. Document as **limited** — do not market macOS parity with Windows stealth.

## What this does NOT test

- Physical camera on your monitor
- Kernel-level or injected capture tools
- Proctoring / exam monitoring products (out of scope)
- Process identity spoofing (excluded — do not implement)

## Recording consent

System audio loopback captures audio you already hear. Users must comply with local recording-consent laws and platform policies.
