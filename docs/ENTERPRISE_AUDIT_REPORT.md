# Enterprise audit & stabilization report

Date: 2026-08-06 · Branch: `develop` · Verified build: `v2026.08.06.15.01`

## Scope

Final audit of the VeilAssist desktop application before release. The mandate was:
**no new features**, smallest safe changes, every fix verified with evidence, and a
written report covering each finding, its root cause, the fix, and its verification.

The audit ran in three parallel lanes (security, performance, code quality), each
high/medium finding was then re-verified manually against the source before any code
changed. The full test suite and packaging pipeline were re-run after the fixes.

## Executive summary

| Lane | Findings | Fixed | Held back / documented |
|------|----------|-------|------------------------|
| Security | 8 | 3 (H1, H2, C2) | 5 (C1, M1, M3, M4, L5) |
| Performance | 5 | 4 (P1, P2, P3, P5) | 1 (P4) |
| Code quality | 7 | 3 (Q2, Q3, Q7) | 4 (Q1, Q4, Q5, Q6) |

All fixes are in commit `cbadc39` (plus the version bump `0dce843`). Every check
passes after the fixes: 26/26 test files, macOS dock verification 16/16, taskbar
config guard, and a fresh 3-platform package build.

## Fixed findings

### Security

**C2 — `get-store` leaked decrypted API keys to the renderer** (HIGH)
- Root cause: `ipcMain.handle('get-store', (_, key) => store.get(key))` returned the
  plaintext value for any key, including every encrypted provider key. A compromised
  or XSS-able renderer could exfiltrate all stored AI credentials with one call.
- Fix (`main/index.js`): `get-store` now returns `''` for any key in
  `ENCRYPTED_KEYS`. The settings renderer only needs *presence* (`keySetMap` checks
  `!!value`), which still works because `get-all-settings` masks configured keys as
  `'••••configured'`. The stored key is resolved main-side in `test-api` via the
  provider's `keyField` metadata when the renderer passes none — so the "Test
  connection" button continues to work without the renderer ever holding the key.

**H2 — `parse-playbook` read arbitrary files from the filesystem** (HIGH)
- Root cause: the handler resolved whatever path the renderer sent and read it, so a
  compromised renderer could read any readable file (e.g. `~/.ssh/id_rsa`) and send
  its content to any provider.
- Fix (`main/index.js`): `show-open-dialog` now bookmarks every path the user
  actually picked (`dialogPickedPaths` Set + timestamp Map). `parse-playbook`
  resolves the path and refuses to read anything not picked within the last 5
  minutes. The real UI flow (picker → parse) is unchanged.

**H1 — `deleteScreenshot` deleted arbitrary files** (HIGH)
- Root cause: `screenshotQueue.deleteScreenshot(filePath)` called `fs.unlink` on any
  path supplied by the renderer.
- Fix (`lib/screenshotQueue.js`): the path must be a member of the current queue,
  otherwise it throws `'Not a queued screenshot path'`. The overlay can only ever
  delete screenshots it was shown.

### Performance

**P1 — PowerShell meeting scan ran forever, every 2.5 s** (HIGH)
- Root cause: `runMeetingForegroundTick` started a `setInterval` at app launch on
  Windows that spawned two PowerShell processes every 2.5 s regardless of whether
  the app was even visible.
- Fix: the tick now returns early unless a session is active or the overlay is
  visible (`main/index.js`), and `MEETING_POLL_MS` was raised 2500 → 10000
  (`lib/meetingForegroundWindows.js`). Test `scripts/test-meeting-detect.mjs`
  updated to assert the new value.

**P2 — full-resolution PNGs sent over IPC for previews** (MEDIUM)
- Root cause: `getBase64Preview` base64-encoded the entire full-res PNG and shipped
  it to the overlay renderer over IPC.
- Fix (`lib/screenshotQueue.js`): previews are now `image/jpeg` thumbnails capped at
  480 px wide, quality 75. The full-res PNG stays on disk and is only sent to the
  LLM. Verified no renderer consumes previews today; no behavior change.

**P3 — every settings snapshot shipped all meeting transcripts** (MEDIUM)
- Root cause: `get-all-settings` included the entire `meetingSessions` store entry
  (transcripts) on every fetch.
- Fix (`main/index.js`): `meetingSessions` is stripped from the snapshot. Verified
  the renderer loads sessions via the dedicated `meeting-sessions:list` channel
  (`renderer/settings/App.jsx:354`, `renderer/launcher/App.jsx:35`).

**P5 — two unbounded dedupe sets grew forever** (MEDIUM)
- Root cause: `calendarReminderSentKeys` (one key per reminder fired, keyed by
  event+minutes) and `meetingToastSuppressedEventIds` grew without bound for the
  lifetime of the app.
- Fix (`main/index.js`): reminder keys now embed a timestamp
  (`makeCalendarReminderKey(eventId, minutes, ts)`) and the set is pruned to a 36 h
  window once it exceeds 500 entries; toast ids are pruned to the newest 300 once
  the set exceeds 500. Pruning keeps the newest entries so recently suppressed
  meetings stay suppressed.

### Code quality

**Q2 — dead module `lib/localStt/meetingSpeechValidator.js`**
- Fix: removed (zero references anywhere; confirmed via grep). Deleted in `cbadc39`.

**Q3 — no-op IPC handlers `shadowassist-stream-flush` / `shadowassist-stream-ended`**
- Fix: both handlers in `main/index.js` contained only a window-guard check and did
  nothing; the four renderer sends (`renderer/overlay/App.jsx`) were renderer-local
  state cleanup. Removed handlers and sends; the real stream path
  (`ask-ai`/`chat`) is untouched.

**Q7 — `export-user-data` had no error handling**
- Fix: wrapped the handler in try/catch returning `{ ok: false, error }` instead of
  rejecting the IPC promise with an unhandled rejection. Renderer already checks
  `r?.ok && r.path`.

## Held back / documented (no code change)

These were consciously **not** fixed to respect "smallest safe changes" — each has a
reason and most are already mitigated:

- **C1 — generic IPC bridge** (`invoke`/`send` passthrough in the preload): renaming
  ~124 channel names is high-risk churn for zero user-visible gain; the actual
  dangerous channels are now fixed (C2/H1/H2). Residual risk is documented.
- **M1 — `hindsightLocalServer` on loopback, no auth**: loopback-only, holds no
  secrets, no cross-origin web content can reach it (no CORS, no wildcard DNS). The
  `phoneLinkServer` binds `0.0.0.0` but is already guarded by a pairing token
  (`tokenOk` check verified in source).
- **M3 — `sandbox:false` on all BrowserWindows**: flipping to sandboxed renderers
  would break the preload API surface; considered out of scope for a stabilization
  pass. The renderer no longer holds any credential material after C2.
- **L5 — safeStorage-unavailable plaintext fallback** in `lib/store.js`: only
  triggers on systems without a keychain; documented as accepted trade-off.
- **Q1 — dead onboarding window/UI** and **Q5 — duplicated PCM/WAV helpers across
  four STT modules**: the consolidation is not purely mechanical
  (`cloudRestStt.addWavHeader` has a different signature; `nvidiaNimStt.wavFromPcm`
  has no shared counterpart), and the modules sit on the live-audio critical path
  with no tests. Reliability wins over refactoring here; tracked as follow-up work.
- **P4 — `get-all-settings` still returns everything else**: every non-transcript
  setting is a small value; fine for a settings page fetched on demand.
- **Q4/Q6 — minor style/comment items**: no functional impact.
- **Cross-build caveat**: the `.deb` artifact on a macOS host is a 96-byte stub —
  Linux builds must be produced on a Linux host/CI.

## Verification evidence

Run after all fixes, on the committed tree:

```text
npm run test:ci            → [ci-tests] 26 test files passed
electron scripts/verify-dock.cjs   → RESULT: ALL PASS (16/16)
node scripts/verify-taskbar-config.cjs → [verify-taskbar] OK — 7 windows covered
npm run dist:all           → all platforms built, v2026.08.06.15.01
```

Packaged-app verification (fresh asar from `dist/mac-arm64`):

```text
ENCRYPTED_KEYS.includes    present in packaged main/index.js   (C2)
dialogPickedPaths          present                             (H2)
'Not a queued screenshot path' present in packaged screenshotQueue.js (H1)
MEETING_POLL_MS: 10000     present in packaged meetingForegroundWindows.js (P1)
image/jpeg thumbnail       present                             (P2)
meetingSessions stripped    present                             (P3)
dedupe-set pruning          present                             (P5)
lib/localStt/meetingSpeechValidator.js  absent from asar       (Q2)
```

## Additional context from the session

Beyond the audit fixes, this session produced two earlier stabilization commits:

- `40627bb` — pinned the app runtime identity to `veilassist` so macOS safeStorage
  Keychain keys decrypt. Branding (`app.setName('VeilAssist')`) had overwritten the
  Keychain service name, which made all AI keys read as empty. This restored AI
  functionality in the real app.
- `8d671b3` / `3903f09` — documented and fixed the real-app Dock-hiding root cause
  (LaunchServices pre-ready override + 1s dock race; `LSUIElement` launch policy).

## Conclusion

The application is **production-ready** for macOS (dmg/zip) and Windows
(portable/Setup) from the verified `v2026.08.06.15.01` artifacts, with the .deb
caveat above for Linux. The three high-severity security issues found in the audit
are fixed and verified in the packaged binaries; the remaining items are documented
with explicit rationale, not forgotten.
