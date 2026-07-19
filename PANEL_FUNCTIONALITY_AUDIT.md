# VeilAssist Panel Functionality and Wiring Audit

Audit date: 2026-07-19  
Application audited: repository-root Electron package

## Purpose

This report audits every user-facing VeilAssist panel and control that is present in the renderer. It checks whether each control:

1. exists in the UI;
2. is connected to renderer state;
3. reaches an IPC handler where required;
4. persists to the store where required;
5. has a runtime consumer;
6. has automated evidence or still needs manual runtime testing.

This is primarily a static wiring audit backed by the automated tests listed near the end. Features that depend on Windows, Electron native windows, microphones, system audio, external APIs, OAuth, ADB/scrcpy, or real screen-sharing software are not described as fully runtime-verified unless an appropriate test was available.

## Status legend

- **WIRED** — complete static path from UI to intended consumer.
- **PARTIAL** — connected, but behavior, synchronization, validation, feedback, or coverage is incomplete.
- **UNWIRED** — visible or implemented surface has no usable end-to-end path.
- **NOT OFFERED** — not an existing product control; listed only to clarify feature scope.
- **DISPLAY-ONLY** — intentionally informational or local presentation state.
- **MANUAL VERIFY** — statically wired, but native hardware, OS, capture, network, or provider behavior requires a real runtime test.

## Executive result

Most core Settings and Overlay controls are connected. The repository does not have a general problem where every panel is unwired. It does have several important controls whose UI suggests stronger behavior than the runtime currently provides.

### Release-blocking findings

1. **P0 — Delete all data is incomplete**
   - `PrivacySettingsPanel` promises to delete all local VeilAssist data.
   - The handler clears `electron-store` only.
   - It leaves custom skills, debug logs, vector-memory SQLite files, and possibly remote Hindsight data.
   - Relevant paths: `renderer/settings/PrivacySettingsPanel.jsx`, `main/index.js` (`delete-all-data-relaunch`), `lib/store.js`, `lib/skillsService.js`, `lib/vectorMemory.js`, `lib/debugLog.js`.

2. **P0 — Onboarding window is unreachable**
   - `createOnboardingWindow()` exists, and its renderer is implemented, but startup and consent completion never call it.
   - New users proceed from consent directly into the main app.
   - Relevant paths: `main/index.js` (`createOnboardingWindow`, startup bootstrap, consent completion), `renderer/onboarding/App.jsx`.

3. **P0/P1 — Overlay and Global Chat share process-wide AI request state**
   - `currentAbortController` and `aiEventTarget` are global.
   - A request in one window can abort another request or redirect tokens/completion events to the wrong window.
   - Relevant path: `main/index.js` (`handleAskAI`, `sendToAiEventTarget`).

### High-priority findings

1. **Settings toast is broken**
   - `settings-toast` is sent with a payload, but the Settings listener reads the synthetic event argument as the payload.
   - Verbose-logging notifications and their Open action never render.

2. **Turning Audio off does not stop an active capture**
   - `audioEnabled` persists.
   - It is checked when Listen starts, but changing it during an active Listen session does not stop or start capture.

3. **Blocked Overlay asks can erase typed input**
   - `InputBar` clears text immediately after invoking `onAsk`.
   - `handleAsk` can reject due to an active response, cooldown, processing lock, or missing context without returning acceptance status.

4. **Ctrl+Enter shortcuts conflict with textarea Enter handling**
   - Ctrl+Enter and Ctrl+Shift+Enter are global shortcuts.
   - The textarea handles Enter without checking Ctrl, potentially causing duplicate asks, newlines, dropped requests, or cleared text.

5. **Latest/history answer-view setting is inert**
   - The setting is persisted and loaded.
   - `ResponsePanel` always renders all turns; the value is never consumed.

6. **Hotkey recording is not implemented**
   - Keybind fields are plain text fields.
   - There is no modifier capture or Enter-to-save behavior despite the UI instructions.
   - Invalid/conflicting accelerators are persisted without reliable UI feedback.

7. **Settings profile editor can overwrite the wrong mode after an external mode change**
   - The active mode ID updates, but drafts and the profile list are not fully refreshed.
   - Saving can attach an old draft to a newly active mode.

8. **Response-language UI loses hydration**
   - `aiResponseLanguage` is used and persisted by generic store access.
   - It is missing from the store schema used by `getAll()`, so Settings can reopen showing Auto while another language remains active.

9. **Hindsight provider and auto-start can diverge**
   - Provider changes do not consistently start/stop the running local gateway.
   - Main-side provider/URL changes are not fully synchronized back to Settings.

10. **Global Chat Clear is cosmetic**
    - It clears React messages only.
    - It does not abort an active request or clear the `global_chat` conversation-memory session.

11. **Launcher is not consistently stealth-managed**
    - The launcher is omitted from managed content-protection windows and may initially appear in the taskbar.

12. **Calendar OAuth readiness can be false-positive**
    - Settings marks OAuth ready after saving only a client ID.
    - The actual integration requires both client ID and secret.

## Panel-by-panel audit

## 1. Settings navigation and window frame

Source:

- `renderer/settings/settingsNav.jsx`
- `renderer/settings/SettingsTabContent.jsx`
- `renderer/settings/SettingsWindowFrame.jsx`
- `renderer/settings/App.jsx`

| Function | Status | Notes |
|---|---|---|
| Profile tab | WIRED | Routes to profile modes and personal background. |
| Skills tab | WIRED | Routes to Skills panel. |
| AI Providers tab | WIRED | Routes to provider/model controls. |
| Audio tab | WIRED | Routes to STT and device controls. |
| General tab | WIRED | Routes to display, privacy-adjacent, startup, and overlay controls. |
| Phone tab | WIRED | Routes to Phone Link and mirror controls. |
| Intelligence tab | WIRED | Routes to memory/routing controls. |
| Keybinds tab | WIRED | Routes to shortcut controls. |
| Calendar tab | WIRED | Routes to Calendar and recaps. |
| Privacy tab | WIRED | Routes to export/delete controls. |
| Help tab | WIRED | Routes to guide/log actions. |
| About tab | WIRED | Routes to product information. |
| Quit VeilAssist | WIRED | Sends `app-quit`. |
| Minimize Settings | WIRED | Reaches native window handler. |
| Maximize/restore Settings | PARTIAL | Native action works, but icon state is optimistic and can drift from the actual native state. |
| Close Settings | WIRED | Closes Settings without quitting tray app. |
| Drag title bar | MANUAL VERIFY | Uses Electron drag region. |

No dead Settings navigation entry was found.

## 2. Profile modes

Source:

- `renderer/settings/ProfileModesPanel.jsx`
- `renderer/settings/PersonalBackgroundSection.jsx`
- `renderer/settings/App.jsx`
- `lib/contextPrompts.js`
- `main/index.js`

| Function | Status | Notes |
|---|---|---|
| Create mode | WIRED | Inline name form creates, persists, and selects a normalized mode. Button text is now simply “Create mode.” |
| Cancel mode creation | DISPLAY-ONLY | Correctly closes local form. |
| Select active mode | WIRED / PARTIAL | Runtime uses selected mode, but external mode changes can leave Settings drafts stale. |
| Rename mode | PARTIAL | Draft only until Save mode; no dirty-state warning. |
| Edit real-time prompt | PARTIAL | Runtime path is wired after Save; unsaved edits are silently lost on mode/template change. |
| Save mode | WIRED | Persists normalized profile and runtime prompt content. |
| Delete mode | WIRED | Confirms, deletes, selects fallback, and updates history. No undo. |
| Browse templates | WIRED | Navigation is local; selecting a template creates a real mode. |
| Import profile mode | NOT OFFERED | VeilAssist does not currently present profile importing as a product feature. |
| Upload reference file | WIRED | Opens dialog, parses, attaches, indexes, and supplies context at runtime. |
| Remove reference file | WIRED | Removes from draft and persisted profile after Save. |
| Add/edit/remove notes template sections | PARTIAL | Runtime consumption is wired after Save; no dirty-state protection. |
| Indexing/upload status | DISPLAY-ONLY | Reflects local work state. |
| Resume editor | WIRED | Saves profile resume context. |
| Job description editor | WIRED | Saves profile job-description context. |
| Upload resume/JD | WIRED | File dialog and parser paths exist. |
| Clear resume/JD | WIRED | Removes persisted context. |

Additional defect:

- Main normalization limits notes/reference entries, but renderer can temporarily display more entries than are actually stored.

## 3. Skills

Source:

- `renderer/settings/SkillsSettingsPanel.jsx`
- `lib/skillsService.js`
- `lib/skillInvoke.cjs`

| Function | Status | Notes |
|---|---|---|
| New skill | WIRED | Starts a local draft. |
| Select skill | WIRED | Loads saved metadata and body. |
| Edit ID/name/description/instructions | WIRED | Local draft fields. |
| Save skill | WIRED | Writes metadata and `SKILL.md`. |
| Delete skill | WIRED | Removes skill directory; error feedback is weak. |
| Add Interview starter | PARTIAL | Works but silently overwrites an existing skill with the same slug. |
| Add Sales starter | PARTIAL | Same overwrite risk. |
| `/skill-name` invocation | WIRED | Parsed in Overlay and injected into the system prompt. |
| Invocation preview/help | DISPLAY-ONLY | Informational. |

## 4. AI Providers

Source:

- `renderer/settings/AiProviderPanel.jsx`
- `renderer/settings/App.jsx`
- `lib/providers.js`
- `lib/remoteModels.js`
- `lib/aiClient.js`

| Function | Status | Notes |
|---|---|---|
| Select provider | WIRED | Persisted and resolved on each ask. |
| Get API key links | MANUAL VERIFY | Standard external links; packaged navigation should be tested. |
| Custom OpenAI base URL | WIRED | Used for sync, test, and requests. |
| API-key input and Save | PARTIAL | Encrypted storage exists; optimistic “saved” feedback does not await/catch persistence failure. |
| Model selector | WIRED | Saves provider-specific model. |
| Model filtering | WIRED | Local list filtering. |
| Manual model ID | WIRED | Saves on blur. |
| Sync models | MANUAL VERIFY | Complete remote API path; requires provider credentials/network. |
| Test connection | MANUAL VERIFY | Complete provider request path. |
| Brief/detailed answer style | WIRED | Affects prompt rules, token limits, and rendering. |
| Response language | PARTIAL | Runtime consumes it, but Settings hydration resets because schema omits the key. |
| Conversation follow-ups | WIRED | Gates resolver and conversation-memory behavior. |
| Launch VeilAssist setup action | WIRED when rendered | Completes setup and shows app. |

## 5. Audio and Speech

Source:

- `renderer/settings/SpeechSettingsPanel.jsx`
- `renderer/overlay/App.jsx`
- `lib/transcriptionRouting.js`
- STT provider modules under `lib/`

| Function | Status | Notes |
|---|---|---|
| Enable microphone/audio | PARTIAL | Persists and gates next Listen start; does not stop/start an already active capture. |
| Mic sensitivity | WIRED | Applied to capture profiles on start. |
| Microphone device | MANUAL VERIFY | Enumerates and applies preferred device with fallback. |
| Speaker/output device | DISPLAY-ONLY | Saved for reference; no playback consumer exists. |
| Refresh devices | MANUAL VERIFY | Requires browser permission/device runtime. |
| Local/cloud processing mode | PARTIAL | Wired, but changes apply only after Listen restarts. |
| Local model Auto/Moonshine selectors | WIRED | Persisted and consumed. |
| Explicit Whisper Tiny selection | PARTIAL | Main catalog advertises it, but UI and explicit resolver do not fully support it. |
| Active local model card | DISPLAY-ONLY | Reports status/model info. |
| Experimental Whisper gate | WIRED | Supplied to local STT. |
| Cloud STT provider | PARTIAL | Routed correctly; changing during Listen does not reconfigure current session. |
| Active STT API key Save | WIRED | Uses encrypted provider-specific key field. |
| Groq Whisper model | WIRED | Consumed by routing. |
| ElevenLabs model | WIRED | Consumed by streaming configuration. |
| Deepgram model | WIRED | Consumed by streaming configuration. |
| OpenAI fixed model card | DISPLAY-ONLY | Correctly fixed to `whisper-1`. |
| NVIDIA Parakeet card | DISPLAY-ONLY | Runtime uses fixed/default model. |
| Azure region/key | WIRED | Consumed by Azure STT. |
| Google language/key | WIRED | Consumed by Google STT. |
| Soniox model/key | WIRED | Consumed by Soniox STT. |
| Advanced-provider disclosure | WIRED | Local disclosure UI. |
| Real microphone/system audio/STT | MANUAL VERIFY | Hardware, permissions, model download, and provider behavior require live tests. |

## 6. General / Display

Source:

- `renderer/settings/DisplaySettingsPanel.jsx`
- `renderer/settings/App.jsx`
- `main/index.js`
- `renderer/overlay/App.jsx`

| Function | Status | Notes |
|---|---|---|
| Open at login | MANUAL VERIFY | Native login-item path is wired. |
| Do not save meetings | WIRED | Enforced before recap/LTM persistence. |
| Hide from screen capture | MANUAL VERIFY | Managed-window content protection is wired; must test Teams/Zoom/OBS capture backends. |
| Verbose logging | WIRED / PARTIAL | Logging works; associated Settings toast is currently broken. |
| Open log file | MANUAL VERIFY | OS shell path. |
| Accent color | WIRED | Broadcast to Overlay and Global Chat. |
| Mouse passthrough | MANUAL VERIFY | Native ignore-mouse policy and polling are wired. |
| Hide from taskbar | MANUAL VERIFY | Native `setSkipTaskbar` path is wired. |
| Opacity presets | MANUAL VERIFY | Persists and applies BrowserWindow opacity. |
| Opacity slider | MANUAL VERIFY | Same path; Settings currently writes through duplicate persistence/apply IPC routes. |
| Answer text size | WIRED | Broadcast and consumed by Overlay. |
| Live transcript panel toggle | WIRED | Controls Overlay rendering. |
| Transcript auto-scroll | WIRED | Consumed by LiveTranscriptPanel. |
| Pin answers to top | PARTIAL | Scrolls to top only when generation starts; does not continuously pin while content grows. |
| Position presets | MANUAL VERIFY | Native positioning and persistence are wired. |
| Teleprompter | WIRED | Changes answer layout and input visibility. |
| Focus mode | WIRED | Collapses/reopens input behavior. |
| Width/height fields | PARTIAL | Wired to Apply, but empty edits immediately clamp and are awkward. |
| Apply overlay size | MANUAL VERIFY | Native resize and persistence path exists. |

The previously identified Settings-window stealth bug has been fixed in the current worktree: enabling protection now updates every already-open managed window instead of only the Overlay branch.

## 7. Intelligence and memory

Source:

- `renderer/settings/IntelligenceSettingsPanel.jsx`
- `lib/intelligenceFlags.js`
- `lib/longTermMemory.js`
- `lib/vectorMemory.js`
- `lib/hindsightClient.js`
- `lib/hindsightAdapter.js`

| Function | Status | Notes |
|---|---|---|
| Enable smart features | WIRED | Writes implemented core flags. |
| Smart context routing | WIRED | Gates routing and context selection. |
| Long-term memory | WIRED | Gates retain and recall. |
| Auto-detect meeting type | WIRED / MANUAL VERIFY | Gated correctly; foreground detection requires Windows runtime. |
| Recall provider select | PARTIAL | Persists, but does not reliably reconcile local server start/stop state. |
| Recall API URL | WIRED | Consumed by Hindsight/gateway clients. |
| Hindsight API key | WIRED | Encrypted and used for authentication. |
| Save Hindsight key outside Hindsight mode | PARTIAL | Button can remain enabled while input is disabled. |
| Auto-start local recall | PARTIAL | Main starts/stops service, but provider/URL mutations are not fully synchronized to UI. |
| Running/healthy badges | DISPLAY-ONLY | Poll status every five seconds. |
| Clear memory | MANUAL VERIFY | Clears keyword/vector data and attempts remote Hindsight lifecycle action. |
| Smart follow-up drafts | WIRED | Checked before draft generation. |
| Vector memory | PARTIAL | New sessions index; enabling at runtime does not migrate old sessions until restart. |
| Search past meetings | PARTIAL | Backend checks flag, but existing Overlay can remain stale until reload. |
| Stronger candidate voice | WIRED | Changes profile formatting/cache key. |
| Answer diversity | WIRED | Changes prompt and inference parameters. |
| Reference file vectors | WIRED | Schedules enrichment and gates retrieval. |

## 8. Keybinds

Source:

- `renderer/settings/KeybindsSettingsPanel.jsx`
- `renderer/settings/settingsConstants.js`
- `lib/hotkeys.js`
- `main/index.js`

| Function | Status | Notes |
|---|---|---|
| Edit shortcut as text | PARTIAL | Text can be entered and committed on blur. |
| Press a key combination to record | UNWIRED | No modifier/key capture exists. |
| Enter to save | UNWIRED | UI instruction exists, but no Enter handler. |
| Validate accelerators | PARTIAL | Invalid/conflicting shortcuts can be persisted. |
| Detect registration conflicts | PARTIAL | `globalShortcut.register()` result is ignored. |
| Reset one shortcut | WIRED / MANUAL VERIFY | Restores value and re-registers. |
| Restore all defaults | WIRED / MANUAL VERIFY | Works but performs repeated full unregister/register cycles. |
| Runtime shortcut actions | WIRED | Main registers all declared actions. |

Original command mappings are retained:

- `Ctrl+Up/Down` moves the Overlay.
- `Ctrl+Shift+Up/Down` scrolls answers.

## 9. Calendar and meeting recaps

Source:

- `renderer/settings/MeetingsSettingsPanel.jsx`
- `renderer/settings/MeetingDetailsModal.jsx`
- `lib/googleCalendar.js`
- `lib/meetingSessions.js`

| Function | Status | Notes |
|---|---|---|
| Connect Google Calendar | MANUAL VERIFY | OAuth/browser/network path exists. |
| Cancel OAuth | MANUAL VERIFY | Cancellation path exists. |
| Refresh meetings | MANUAL VERIFY | External API path exists. |
| Disconnect Calendar | MANUAL VERIFY | Clears token fields. |
| Reminder toggle | WIRED / MANUAL VERIFY | Persisted and polled; OS notification needs runtime test. |
| Reminder lead time | WIRED | Used by reminder poll. |
| Foreground meeting detection | MANUAL VERIFY | Windows polling path exists. |
| OAuth developer disclosure | WIRED | Local disclosure. |
| OAuth client ID/secret drafts | WIRED | Local fields. |
| Save OAuth credentials | PARTIAL | UI marks ready with client ID alone; runtime requires secret too. |
| Upcoming date selector | WIRED | Local filtering. |
| Join meeting link | MANUAL VERIFY | No explicit Electron external-link policy was found. |
| Clear all recaps | WIRED | Clears meeting store and vector rows. |
| Expand recap | WIRED | Local state. |
| View details | WIRED | Loads modal through IPC. |
| Export recap Markdown | WIRED | Save dialog and write path. |
| Delete recap | WIRED | Removes stored session. |
| Edit speaker labels | WIRED | Saves on blur. |
| Generate follow-up email | WIRED | AI/fallback service path exists. |
| Export from details | WIRED | Reuses export path. |
| Copy follow-up draft | WIRED | Clipboard IPC. |
| Summary/action items/transcript/Q&A | DISPLAY-ONLY | Read-only recap content. |

## 10. Privacy

Source:

- `renderer/settings/PrivacySettingsPanel.jsx`
- `main/index.js`

| Function | Status | Notes |
|---|---|---|
| Open Intelligence settings | WIRED | Local tab navigation. |
| Export my data | PARTIAL | Exports profiles, meetings, and consent, but omits many preferences, custom skills, and other advertised data. |
| Delete all my data | PARTIAL / P0 | Clears electron-store only; does not perform a complete local/remote wipe. |
| Privacy explanations | DISPLAY-ONLY | Informational. |

## 11. Phone Link and phone mirror

Source:

- `renderer/settings/PhoneLinkSettingsPanel.jsx`
- `lib/phoneLinkManager.js`
- `lib/phoneLinkServer.js`
- `lib/phoneLinkMicIngest.js`
- `lib/phoneMirror/phoneMirrorManager.js`

| Function | Status | Notes |
|---|---|---|
| Enable Phone Link | MANUAL VERIFY | Starts/stops server asynchronously; failures are not returned to toggle. |
| Remote microphone | MANUAL VERIFY | Token/session validation and STT ingest path exist. |
| Server/connection status | DISPLAY-ONLY | Polled. |
| QR code | DISPLAY-ONLY | Shows current link/token. |
| Generate new QR/token | MANUAL VERIFY | Regenerates and invalidates old token. |
| Android device selector | WIRED | Persisted and consumed on mirror start. |
| Refresh devices | MANUAL VERIFY | Requires ADB. |
| Mirror max width | PARTIAL | Persisted and applied on next start, not to a running mirror. |
| Include phone screen in Ask | MANUAL VERIFY | Captures active mirror and appends image to multimodal request. |
| Start/stop mirror | MANUAL VERIFY | scrcpy/ADB process path exists. |
| Tool/mirror status | DISPLAY-ONLY | Reports readiness and state. |
| Setup instructions | DISPLAY-ONLY | Informational. |

## 12. Help

Source:

- `renderer/settings/HelpSettingsPanel.jsx`
- `lib/userGuideDoc.js`

| Function | Status | Notes |
|---|---|---|
| Reload full guide | WIRED | Loads bundled guide through IPC. |
| Open General settings links | WIRED | Local tab navigation. |
| Open log folder | MANUAL VERIFY | OS shell path. |
| Open log file | MANUAL VERIFY | OS shell path. |
| FAQ/version/guide content | DISPLAY-ONLY | Informational. |

## 13. About

Source: `renderer/settings/AboutSettingsPanel.jsx`

| Function | Status | Notes |
|---|---|---|
| Logo/product/version | DISPLAY-ONLY | Version comes from main process. |
| Feature cards | DISPLAY-ONLY | Informational. |

There are no actionable controls in About.

## 14. Overlay status bar and header

Source:

- `renderer/overlay/App.jsx`
- `renderer/overlay/components/StatusBar.jsx`

| Function | Status | Notes |
|---|---|---|
| Start/stop Listen | WIRED / MANUAL VERIFY | Session path exists; actual capture needs hardware runtime. |
| Open Settings | WIRED | Creates/restores Settings window. |
| Quit | WIRED | Uses application shutdown path. |
| Drag Overlay | MANUAL VERIFY | Electron drag region. |
| OCR status label | UNWIRED / stale | Prop exists, App does not supply it, and OCR path was removed. |
| Mode selector | WIRED | Loads, persists, broadcasts, and affects AI context. |
| Transcript activity status | DISPLAY-ONLY | Reflects speech/transcribing state. |
| Visible mode | WIRED | Disables content protection. |
| Invisible/capture-protected mode | MANUAL VERIFY | Applies managed-window content protection; real capture software must be tested. |

## 15. Overlay live transcript

Source: `renderer/overlay/components/LiveTranscriptPanel.jsx`

| Function | Status | Notes |
|---|---|---|
| Me transcript column | DISPLAY-ONLY | Driven by attributed STT segments. |
| Participant transcript column | DISPLAY-ONLY | Driven by attributed STT segments. |
| Auto-scroll | WIRED | New segments force columns to bottom when enabled. |
| Manual scrolling | WIRED | Native scroll containers. |
| Speaker attribution correctness | MANUAL VERIFY | Requires overlapping mic/system audio test. |

## 16. Overlay answer feed

Source: `renderer/overlay/components/ResponsePanel.jsx`

| Function | Status | Notes |
|---|---|---|
| Live formatted streaming | WIRED | Brief and detailed previews render progressively. |
| Mouse wheel/scrollbar | WIRED | Native response scroll container. |
| Hotkey inertial scrolling | WIRED | Receives main `scroll` event. |
| Pin to top | PARTIAL | Applies at stream start only. |
| Stop generation | WIRED | Aborts main request. |
| Retry error | WIRED | Replays last ask. |
| Copy fenced code | WIRED | Clipboard IPC; optimistic success label. |
| Copy takeaway/solution | WIRED | Clipboard IPC; optimistic success label. |
| Expand/hide lists and steps | WIRED | Local state. |
| Copy entire answer button | UNWIRED | Only global copy-last-response shortcut exists. |
| Clear conversation button | UNWIRED | Only global shortcut exists. |
| Hide/collapse Overlay button | UNWIRED | Global hide/toggle shortcuts exist; local helper is unused. |
| Latest/history view | UNWIRED behavior | Persisted state is not consumed; all turns always render. |
| Current heard-question preview | PARTIAL | Can show the previous heard question during typed/screen-only asks. |
| Abort partial answer handling | PARTIAL | Renderer commits partial text as normal answer while main does not record aborted exchange. |

Dead/stale props or state found in this area:

- `streamTextRef` direct-DOM path is no longer attached.
- `activeAskSource`, `screenContext`, and `heardContext` are propagated but not rendered.
- `status` state is written but not displayed.
- `overlayAnswerView` is loaded but not read.
- removed OCR status plumbing remains.

## 17. Overlay input and Ask

Source:

- `renderer/overlay/components/InputBar.jsx`
- `renderer/overlay/App.jsx`
- `main/index.js`

| Function | Status | Notes |
|---|---|---|
| Type a question | WIRED | Local controlled input. |
| Send typed question | PARTIAL | Core AI path is wired; rejected asks can erase input. |
| Empty Send for screen read | WIRED | Resolves as screen-led ask. |
| `/skill-name` ask | WIRED | Skill is loaded and injected. |
| Shift+Enter newline | PARTIAL | Works, but Ctrl combinations conflict with global shortcuts. |
| Escape in Focus Mode | WIRED | Clears/blurs input. |
| Tap to ask expander | WIRED | Reopens Focus Mode input. |
| Ctrl+Enter screen Ask | PARTIAL | Global/local handler conflict. |
| Ctrl+Shift+Enter no-screen Ask | PARTIAL | Global/local handler conflict. |
| Screenshot capture and multimodal request | WIRED / MANUAL VERIFY | Static path exists; capture backend/provider requires runtime. |

Additional request-safety defect:

- Hotkey screenshot pre-capture uses a shared uncorrelated global. A blocked or overlapping request can consume the wrong screenshot.

## 18. Overlay quick actions and meeting search

| Function | Status | Notes |
|---|---|---|
| Clarify | PARTIAL | Ask path works; useful prior-answer context depends on follow-ups setting. |
| Follow up | PARTIAL | Same context dependency. |
| Summarize | WIRED | Sends preset question. |
| What to answer | WIRED | Sends preset question. |
| Open past-meeting search | PARTIAL | UI/backend exist; enable flag can remain stale until Overlay reload. |
| Search past meetings | PARTIAL | No request generation/abort guard or robust error handling. |
| Select search result | PARTIAL | Can silently close when Ask is rejected or session is off. |
| Accept mode suggestion | WIRED | Validates, persists, and broadcasts. |
| Dismiss mode suggestion | WIRED | Applies dismissal cooldown. |
| Consent Cancel | WIRED | Cancels pending session start. |
| Consent Start | WIRED | Confirms and starts session. |
| Overlay resize handles | MANUAL VERIFY | Native resize/persistence exists; lost mouse-up outside window needs testing. |

## 19. Global Chat

Source: `renderer/global-chat/App.jsx`

| Function | Status | Notes |
|---|---|---|
| Type message | WIRED | Local state. |
| Send button / Enter | PARTIAL | AI request works, but shares process-global request routing with Overlay. |
| Shift+Enter newline | WIRED | Local input behavior. |
| Stream answer | PARTIAL | Correct in isolation; unsafe with overlapping Overlay request. |
| Conversation context | PARTIAL | UI looks threaded, but prior turns normally reach the model only when follow-ups are enabled. |
| Clear | PARTIAL | Clears UI only; does not abort or clear `global_chat` memory. |
| Markdown display | DISPLAY-ONLY | Basic parser; lacks richer code/table/link handling. |
| Accent synchronization | WIRED | Receives updates. |
| Thread persistence | UNWIRED | Messages disappear when window closes. |

Additional defects:

- Global Chat exchanges can be recorded into an active meeting recap.
- A text-only Global Chat response can clear the shared screenshot queue.

## 20. Launcher

Source: `renderer/launcher/App.jsx`

| Function | Status | Notes |
|---|---|---|
| Start Listen | PARTIAL | Requests Overlay consent but does not ensure a hidden Overlay becomes visible, so action may appear inert. |
| Stop Listen | WIRED | Stops session. |
| Open Overlay | WIRED | Shows Overlay. |
| Open Settings | WIRED | Shows Settings. |
| Listening status | WIRED | Initial read and events. |
| Recent sessions | DISPLAY-ONLY | Rows are not clickable. |
| Native controls | MANUAL VERIFY | Uses OS frame. |
| Capture protection/taskbar behavior | PARTIAL | Launcher is omitted from managed stealth windows and initial taskbar sync. |

## 21. Consent

Source: `renderer/consent/App.jsx`

| Function | Status | Notes |
|---|---|---|
| Terms link | WIRED / MANUAL VERIFY | Resolves bundled legal document and opens through OS. |
| Privacy link | WIRED / MANUAL VERIFY | Same. |
| License link | WIRED / MANUAL VERIFY | Same. |
| Four acknowledgement checkboxes | WIRED | Correctly gate Continue. |
| Continue | PARTIAL | Consent persists, but flow incorrectly skips onboarding. |
| Decline | WIRED | Uses shutdown path. |
| Minimize/close | WIRED | Shared native handlers. |
| Maximize/restore indicator | PARTIAL | Local state can drift from native state. |
| Drag title bar | MANUAL VERIFY | Electron drag region. |

## 22. Onboarding

Source: `renderer/onboarding/App.jsx`

Overall status: **UNWIRED at application-flow level** because the main process never opens the onboarding window.

Latent controls if opened manually:

| Function | Status | Notes |
|---|---|---|
| Terms/Privacy links | WIRED internally | Window itself is unreachable. |
| Provider selection | WIRED locally | Window itself is unreachable. |
| Get key links | MANUAL VERIFY | No explicit external-link policy. |
| API key entry/test | PARTIAL | Request path exists; rejected IPC can leave testing state stuck. |
| BYOK acknowledgements | WIRED locally | Window itself is unreachable. |
| Start VeilAssist | PARTIAL | Can complete even after key storage failure. |

## 23. Meeting toast

Source:

- `renderer/meeting-toast/main.js`
- `preload-meeting-toast.cjs`

| Function | Status | Notes |
|---|---|---|
| Detect supported meeting window | MANUAL VERIFY | Requires actual Windows foreground apps/PowerShell. |
| Display platform/headline | DISPLAY-ONLY | Uses payload. |
| Dismiss | WIRED | Sender-validated handler. |
| Native notification fallback | MANUAL VERIFY | OS behavior. |

Defect:

- Event suppression occurs before toast load succeeds; a render/load failure prevents retry for the same event ID.

## IPC wiring audit

### Renderer calls without main handlers

None were found for statically named renderer `invoke` or `send` calls.

### Main events without effective renderer listeners

| Channel | Status | Impact |
|---|---|---|
| `notify` | UNWIRED renderer event | Calendar reminder Overlay event is dropped; native notification still runs. |
| `rest-stt:transcript` | UNWIRED | Overlay listens to local and streaming transcript channels, not REST transcript event. |
| `screenshot:queued` | UNWIRED feedback | Screenshot hotkey has no visible queue feedback. |
| `screenshot:error` | UNWIRED feedback | Capture failures are visible only in logs. |
| `screenshot:queue-cleared` | UNWIRED feedback | No visible queue state. |
| `meeting-summary-status` to Overlay | UNWIRED in Overlay | Settings and Launcher listen. |
| `context-index-update` listener | Orphan listener | Settings listens, but no production sender was found. |

### Duplicate/conflicting paths

Several display settings call both `set-store` and `apply-overlay-display`, producing duplicate writes and update events:

- opacity;
- font size;
- answer style;
- answer view;
- teleprompter;
- focus mode;
- transcript auto-scroll;
- live transcript visibility;
- answer pin-to-top;
- overlay bounds.

These should eventually be consolidated into one authoritative mutation path.

### Runtime-application gaps

- `audioEnabled` does not stop/start live capture.
- STT mode/provider/model changes apply after Listen restart, not live.
- Hindsight provider changes do not reconcile the running local gateway.
- Phone Link/Hindsight start failures are not returned to the Settings toggle.
- Phone mirror device/size changes apply on the next mirror start.

## Automated validation performed

Passed:

- Production Vite build.
- IDE lint diagnostics for edited files.
- Profile tree tests: 3/3.
- Action chip test.
- Meeting details test.
- Skills test.
- Intelligence flag test.
- Phase 8 system test.
- Phase 9 intelligence test.
- Context router tests: 9/9.
- STT routing test.
- Phone Link test.
- Phone mirror test.
- Google Calendar static checks: 6/6.
- Overlay mouse-capture policy test.
- Meeting mode detector tests: 10/10.
- Conversation memory tests: 8/8.
- Ask-context tests: 11/11.
- Chat fallback tests: 10/10.
- Transcript lifecycle tests: 3/3.
- NVIDIA streaming STT tests: 4/4.
- Meeting summary tests: 7/7.
- Meeting summary formatting tests: 4/4.
- Long-term memory tests: 3/3.
- Playbook/context tests: 9/9.
- Persistent memory under Electron: 6/6.
- Electron SQLite/sqlite-vec smoke test.

Test-infrastructure findings:

1. `scripts/test-meeting-detect.mjs` prints all implemented checks as passing but exits with `5/6` because it does not increment the pass counter after the final main-wiring check.
2. `scripts/test-phase6-vector-memory.mjs` fails when run with system Node because `better-sqlite3` is built for Electron’s Node ABI. The actual Electron-runtime persistent-memory and SQLite tests pass.

## Required manual verification matrix

The following cannot be honestly marked fully working from static code and unit tests:

1. Screen-capture exclusion in Teams, Zoom, Google Meet, OBS, Windows Snipping Tool, and Electron desktop capture.
2. Mic permission, selected-device fallback, background/system audio, and overlapping speaker attribution.
3. Local model download and real multilingual STT latency.
4. Every remote AI/STT provider with valid credentials and rate-limit/failure behavior.
5. Google Calendar OAuth, browser redirect, token refresh, Join links, and reminders.
6. Phone Link over LAN, remote microphone, ADB device discovery, and scrcpy mirror.
7. Taskbar, click-through, drag, resize, opacity, always-on-top, and login startup behavior in packaged Windows builds.
8. External legal/help/log links in packaged Electron.
9. Concurrent Overlay and Global Chat requests.

## Recommended remediation order

1. Make Delete all data truthful and complete.
2. Replace process-global AI request state with per-window/per-request state.
3. Restore the onboarding flow or remove the unreachable onboarding surface.
4. Prevent InputBar from clearing text until an ask is accepted; resolve Ctrl+Enter conflicts.
5. Fix hotkey capture, validation, and registration feedback.
6. Fix response-language hydration and `settings-toast`.
7. Make answer-view mode functional or remove the setting.
8. Synchronize profile drafts after external mode updates.
9. Centralize Hindsight provider/auto-start state.
10. Consolidate duplicate display setting IPC paths.
11. Add visible capture/audio/screenshot error states.
12. Harden Privacy export coverage and starter-skill overwrite behavior.
13. Add explicit Electron external-navigation policies and sender authorization.

## Bottom line

The core application is broadly wired, and the automated service-level tests are mostly healthy. The main risk is not a large number of completely dead buttons; it is a smaller set of controls that persist successfully while their live runtime effect, synchronization, failure feedback, or advertised behavior is incomplete.
