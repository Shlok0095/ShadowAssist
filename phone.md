# VeilAssist Interview — Phone App (End-to-End)

Deep reference for how the **Android interview APK** works: what it is, how it is built, how audio and AI are wired, and what happens from download → install → live interview session.

**Current release:** `1.2.0-stag` (versionCode `3`)  
**Download:** https://veilassist.vercel.app/download (Android card is auto-recommended on phone)

---

## 1. What this is

The phone app is **not a separate native Kotlin/Java codebase**. It is:

1. A **React + TypeScript** SPA built for mobile (`landing/src/mobile/`)
2. Packaged with **Capacitor 7** into an Android APK
3. Runs inside an **Android WebView** at origin `https://localhost` (Capacitor `androidScheme: https`)

The same repo also contains:

| Piece | Role |
|-------|------|
| `landing/` | Marketing site + mobile interview bundle + Vercel serverless APIs |
| Root `api/` | Vercel entrypoints that re-export `landing/api/*` (when Vercel root = repo root) |
| Desktop Electron app | Repo root (`lib/`, `main.js`) — shares concepts (BYOK, Parakeet gRPC, answer routing) but **different binary** |

The APK is the **interview companion**: mic → transcript → AI answer using **your** API keys (BYOK). It does **not** join Zoom/Meet as a bot; you use a **second device** for the video call and hold the phone near you for mic capture.

---

## 2. Tech stack (phone)

| Layer | Technology |
|-------|------------|
| UI | React 18, TypeScript, custom CSS (`mobile-interview.css`) |
| Bundler | Vite (`vite.mobile.config.ts` → `dist-mobile/`) |
| Native shell | Capacitor Android (`landing/android/`) |
| Mic (device STT) | Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) |
| Mic (cloud STT) | `getUserMedia` → PCM/WAV → vendor APIs |
| AI chat | Direct `fetch` to provider OpenAI-compatible endpoints (Groq, NVIDIA, OpenAI, etc.) |
| NVIDIA Parakeet STT | gRPC via **Vercel serverless proxy** (browser cannot speak raw gRPC) |
| Deepgram STT | WebSocket live streaming (`wss://api.deepgram.com/v1/listen`) |
| Groq/OpenAI STT | REST batch on silence-gated WAV utterances |
| Profile/CV | `localStorage` + PDF parse (`pdfjs-dist`) + optional NVIDIA LLM structuring |
| Site download metadata | `landing/public/downloads/apk-manifest.json` |

---

## 3. Repository layout (mobile-relevant)

```
shadowassist-v2/
├── phone.md                          ← this file
├── vercel.json                       ← site + API deploy when Vercel root = repo root
├── api/interview/                    ← thin re-exports → landing/api/interview/*
│
└── landing/
    ├── mobile.html                   ← Vite entry (not marketing index.html)
    ├── vite.mobile.config.ts         ← sets VITE_MOBILE_APK=true, VITE_API_ORIGIN
    ├── capacitor.config.ts           ← webDir: dist-mobile, appId, androidScheme
    ├── android/                      ← Capacitor Android project (Gradle)
    ├── public/downloads/
    │   ├── VeilAssist-Interview.apk  ← site-hosted APK (Chrome download)
    │   └── apk-manifest.json         ← version, size, builtAt
    ├── api/                          ← Vercel Node serverless (gRPC transcribe, chat proxy)
    │   ├── nvidia-parakeet-grpc.js   ← @grpc/grpc-js → grpc.nvcf.nvidia.com
    │   └── interview/transcribe.js
    ├── scripts/
    │   ├── build-android-apk.cjs     ← Gradle assembleDebug + copy APK
    │   └── copy-android-apk.cjs      ← public/downloads + apkManifest.generated.ts
    └── src/mobile/
        ├── MobileInterviewApp.tsx    ← screen router (home / settings / interview)
        ├── useInterviewSession.ts    ← session brain: STT + auto-answer
        ├── cloudStt.ts               ← cloud transcription routing
        ├── providerChat.ts           ← direct AI provider calls (APK)
        ├── profileStorage.ts         ← localStorage persistence
        └── screens/                    ← Home, Interview, Settings, PersonalInfo
```

---

## 4. Build pipeline (source → APK → website)

### 4.1 Local / CI command

```bash
cd landing
npm run build:android-apk
```

**Steps inside that script:**

```
npm run build:mobile
  └─ vite build --config vite.mobile.config.ts
       → dist-mobile/ (JS bundle, assets, index.html)
  └─ scripts/prepare-mobile-dist.cjs
       → copies mobile.html → dist-mobile/index.html for Capacitor

node scripts/generate-android-icons.cjs
  └─ @capacitor/assets → mipmap icons + splash screens

cap sync android
  └─ copies dist-mobile → android/app/src/main/assets/public

node scripts/build-android-apk.cjs
  └─ Gradle assembleDebug
  └─ scripts/copy-android-apk.cjs
       → landing/release-android/VeilAssist-Interview.apk
       → landing/public/downloads/VeilAssist-Interview.apk
       → landing/public/downloads/apk-manifest.json
       → landing/src/config/apkManifest.generated.ts
```

### 4.2 Versioning

| File | Purpose |
|------|---------|
| `landing/android/app/build.gradle` | `versionName` (e.g. `1.2.0-stag`), `versionCode` (integer) |
| `apk-manifest.json` | Shown on download page (version, size, date) |
| `apkManifest.generated.ts` | Imported by `downloads.ts` for “Recommended for your device” card |

Bump `versionName` / `versionCode` in `build.gradle` before each release build.

### 4.3 CI (GitHub Actions)

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `.github/workflows/release-android.yml` | Push to `stag` / `main` | Builds APK, uploads to GitHub Release `latest-stag` or `latest`, copies APK to `public/downloads/` |
| `.github/workflows/deploy-landing.yml` | Push to `stag` | Builds marketing site, deploys `landing/dist` to GitHub Pages |

**Note:** `release-android.yml` ignores pushes that **only** change `landing/public/downloads/**` to avoid infinite CI loops when the bot commits the APK.

### 4.4 Download page behavior

- URL: `/download` on https://veilassist.vercel.app
- `detectPlatform()` reads `navigator.userAgent` → on Android, marks **Android · Installer** as **“Recommended for your device”**
- APK file is served same-origin: `/downloads/VeilAssist-Interview.apk` (normal Chrome download, no GitHub redirect)
- Version label comes from `SITE_ANDROID_APK_MANIFEST.version` (`1.2.0-stag`)

---

## 5. Runtime architecture on the phone

```
┌─────────────────────────────────────────────────────────────┐
│  Android APK (Capacitor WebView @ https://localhost)        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ MobileInterviewApp.tsx                                 │  │
│  │   HomeScreen → start session                           │  │
│  │   InterviewScreen → transcript + answer UI             │  │
│  │   SettingsScreen → BYOK keys, STT mode, models         │  │
│  │   PersonalInfoScreen → CV / profile                    │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────▼───────────────────────────────┐  │
│  │ useInterviewSession.ts (session orchestrator)          │  │
│  │   • mic on/off, warmup, transcript state               │  │
│  │   • device STT OR cloud STT                            │  │
│  │   • debounced auto-answer after speech stops           │  │
│  └───────┬───────────────────────────────┬───────────────┘  │
│          │                               │                   │
│   Device STT                    Cloud STT                     │
│   Web Speech API                getUserMedia + …              │
│          │                               │                   │
│          └───────────────┬───────────────┘                   │
│                          ▼                                   │
│              requestInterviewAnswer()                        │
│              → providerChat.ts (direct fetch)                │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           ▼
              Groq / NVIDIA / OpenAI / … APIs
              (user's API key from localStorage)
```

**Build-time flags** (`vite.mobile.config.ts`):

| Env | Value in APK | Effect |
|-----|--------------|--------|
| `VITE_MOBILE_APK` | `"true"` | APK code paths (direct AI, static model lists, etc.) |
| `VITE_API_ORIGIN` | `https://veilassist.vercel.app` | Base URL for NVIDIA STT transcribe proxy |

---

## 6. End-to-end interview session flow

This is the intended user flow after installing the APK.

### 6.1 Before session (one-time setup)

1. **Settings → Personal Info** — upload CV (PDF) or fill profile manually  
   - PDF → `pdfExtract.ts` → text → `structureCv.ts` (NVIDIA LLM on APK calls integrate API **directly**)
2. **Settings → AI Providers** — pick vendor (Groq, NVIDIA, …), paste **API key**, pick **model** from static list (no sync on APK)
3. **Settings → Audio** — choose:
   - **On-device** (default, free, uses phone speech engine) **or**
   - **Cloud API** (needs STT vendor key: Deepgram / NVIDIA / Groq / OpenAI)

All settings persist in `localStorage` keys:

- `veilassist.mobile.appSettings.v1`
- `veilassist.mobile.profile.v1`

### 6.2 Start session

`HomeScreen` → **Start** → `useInterviewSession.startSession()`:

1. Validates profile ready + AI API key (+ cloud STT key if cloud mode)
2. Resets transcript/answer state
3. Sets `sessionStartedAt` (warmup ~1.5s before auto-answer is allowed)
4. Calls `startRecognition()`:
   - `sttMode === 'device'` → `startDeviceRecognition()`
   - `sttMode === 'cloud'` → `startCloudCapture()` (mic permission)

UI shows **“Listening for questions…”** after a short calibration message.

### 6.3 While listening (transcription)

**Display rule:** committed text + optional interim line. Interim is **replaced**, not stacked. Device STT uses `mergeCumulativeFinal()` so Android’s cumulative finals (`"hey"` → `"hey are you"`) do **not** become `"hey hey are you"`.

#### Path A — On-device STT (recommended)

```
Mic → Web Speech API (continuous, interimResults)
  → onresult:
       interim → setInterimTranscript (live preview)
       final   → mergeCumulativeFinal → setTranscript
       → scheduleAutoAnswer() (1.4s debounce)
  → onend → recognition.start() again (keeps listening)
```

No cloud cost. Works offline for **listening** (answers still need network + AI key).

#### Path B — Cloud STT

Mic opened once via `getUserMedia`, then branched by `sttProvider`:

| Provider | Mechanism | File |
|----------|-----------|------|
| **Deepgram** | WebSocket streaming, `speech_final` / `UtteranceEnd` | `deepgramLiveStt.ts` + `pcmStreamCapture.ts` |
| **Groq / OpenAI / NVIDIA** | VAD silence gate → WAV chunk → REST | `utteranceVadCapture.ts` → `cloudStt.ts` |

**NVIDIA Parakeet** is special: NVCF only exposes ASR over **gRPC** (`grpc.nvcf.nvidia.com`). The phone cannot do that from WebView, so:

```
APK → POST https://veilassist.vercel.app/api/interview/transcribe
        (JSON: apiKey, audioBase64, functionId, language)
      → Vercel Node → nvidia-parakeet-grpc.js → gRPC Recognize
      → { text } back to APK
```

Requires Vercel API routes deployed (root `vercel.json` + `api/` re-exports).

### 6.4 Auto-answer (when you stop speaking)

Controlled by **Settings → Auto-answer** (default on).

After the last final transcript update, `scheduleAutoAnswer()` waits **1400ms** of silence, then checks:

| Gate | Purpose |
|------|---------|
| Session warmed up (~1.5s) | Avoid firing on startup noise |
| `sttHealthyRef` | At least one good STT result |
| `autoAnswer` setting | User toggle |
| `effectiveMinChars()` | Min length from question-detection level |
| `isPlausibleInterviewUtterance()` | Reject STT junk / nonsense (`sttGarbage.ts`) |
| Not already generating | Prevents duplicate calls |

If all pass → `requestInterviewAnswer()` with `source: 'transcript'`.

**Think mode** applies only to **typed** questions (`manual_input`), not auto-transcription — `think: false` for transcript source.

Manual fallback: **Assist** button uses current transcript + generates answer immediately.

### 6.5 Answer generation (AI)

On APK, **always direct to provider** (no Vercel chat proxy):

```
requestInterviewAnswer()
  → requestInterviewAnswerDirect()  [providerChat.ts]
  → buildChatPayload()              [promptBuilder.ts + answerRouting.ts]
  → POST {baseURL}/chat/completions
       Authorization: Bearer {user key}
  → parse assistant message → InterviewScreen answer panel
```

Provider registry (`providerRegistry.ts`) maps each vendor to base URL, key field, default model:

| Provider | API base |
|----------|----------|
| Groq | `https://api.groq.com/openai/v1` |
| NVIDIA | `https://integrate.api.nvidia.com/v1` |
| OpenAI | `https://api.openai.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| Anthropic | Messages API (separate path in `providerChat.ts`) |

Profile context (experience, skills, JD) is injected into the system prompt from `profileToContextText()`.

### 6.6 Stop / new question

| Action | Behavior |
|--------|----------|
| **Stop** | `stopSession()` — kills mic, recognition, cloud streams; returns home |
| **New Question** | Clears transcript + answer, restarts listening |
| **Typed input + send** | Sets transcript, `thinkMode` respected, `source: manual_input` |

---

## 7. Audio capture details (cloud path)

### 7.1 PCM streaming (`pcmStreamCapture.ts`)

- `ScriptProcessor` (4096 samples) on `AudioContext`
- Float32 → linear16, resample to **16 kHz** if needed
- Used to feed Deepgram WebSocket binary frames

### 7.2 Utterance VAD (`utteranceVadCapture.ts`)

For batch STT vendors (Groq, NVIDIA, OpenAI):

- RMS threshold detects speech vs silence
- Accumulates buffers while speaking
- After **1200ms silence** (or 20s max), emits one **WAV** blob (`audioConvert.ts`)
- Queue in `useInterviewSession` → `transcribeAudioBlob()` → one text result per utterance

### 7.3 Deepgram live (`deepgramLiveStt.ts`)

- Connects with `deepgramLiveQueryParams()` from `sttRegistry.ts`  
  (`encoding=linear16`, `sample_rate=16000`, `endpointing=400`, `utterance_end_ms=1200`, …)
- Interim results → UI preview
- `speech_final` or `UtteranceEnd` → full utterance → auto-answer schedule

---

## 8. STT garbage filtering

`sttGarbage.ts` prevents bad transcripts from triggering answers:

- Whisper **prompt echo** (“Question about experience and skills”)
- “Listening…” placeholders
- Too-short or mostly 1–2 letter tokens
- `isPlausibleInterviewUtterance`: question words, request verbs (“explain”, “provide”, “architecture”), or ≥8 words

---

## 9. Settings reference (phone)

### Audio (`AudioSettingsSection.tsx`)

| Setting | Storage field | Default |
|---------|---------------|---------|
| Microphone on | `audioEnabled` | `true` |
| Listen language | `micListenLanguage` | `en` |
| Mic sensitivity | `micSensitivity` | `standard` |
| Transcription engine | `sttMode` | **`device`** |
| Cloud STT provider | `sttProvider` | `nvidia` |
| Show live transcription | `showTranscription` | `true` |

Cloud-only: API keys + models per STT vendor (`sttRegistry.ts`).

### AI (`AiProvidersSection.tsx`)

| Setting | Notes |
|---------|-------|
| Active provider | `provider` |
| API key | `nvidiaKey`, `groqKey`, etc. |
| Model | Static list from `modelCatalog.ts` on APK (no ↻ sync) |

### Interview behavior (`SettingsScreen.tsx`)

| Setting | Default |
|---------|---------|
| Auto-answer | `true` |
| Auto-scroll answer | `true` |
| Answer structure (STAR / direct / concise) | `star` |
| Response format (bullets / paragraph) | `bullets` |
| Question detection sensitivity | `high` |

---

## 10. Server-side APIs (Vercel)

Used mainly for **NVIDIA Parakeet STT** (and optional web chat proxy). Implemented under `landing/api/`, exposed at repo root via `api/interview/*.js` when Vercel project root is the **repository root**.

| Route | Handler | Purpose |
|-------|---------|---------|
| `POST /api/interview/transcribe` | `transcribe.js` | BYOK Parakeet: JSON body with `audioBase64` → gRPC |
| `POST /api/interview/chat` | `chat.js` | BYOK chat proxy (marketing site; APK uses direct) |
| `POST /api/interview/structure-cv` | `structure-cv.js` | CV JSON extraction proxy |

**gRPC client:** `landing/api/nvidia-parakeet-grpc.js`  
- Host: `grpc.nvcf.nvidia.com:443`  
- Metadata: `function-id`, `authorization: Bearer {key}`  
- Proto: `landing/api/riva-protos/` (Riva ASR `Recognize` RPC)  
- Language: use `multi` for English + accents (not bare `en`)

**CORS:** `_cors.js` allows Capacitor origins (`https://localhost`) for cross-origin transcribe calls.

---

## 11. Security & privacy model

| Data | Where it lives |
|------|----------------|
| API keys | `localStorage` on device only |
| CV / profile | `localStorage` on device |
| Interview audio | Processed in real time; not uploaded except to **your chosen STT/AI vendor** when cloud mode or answer generation runs |
| NVIDIA transcribe proxy | Audio base64 sent to **your** Vercel deployment; API key in request body (BYOK) |

There is no VeilAssist backend database for interview content in the mobile flow.

---

## 12. Debugging checklist

| Symptom | Likely cause |
|---------|----------------|
| Rolling duplicate transcript | Old APK; need `1.2.0-stag`+ with `transcriptMerge.ts` |
| No auto-answer | Auto-answer off, speech too short, or failed plausibility gate; try **Assist** |
| “Failed to fetch” NVIDIA STT | Vercel `/api/interview/transcribe` 404 — redeploy Vercel with root `vercel.json`; or switch to **On-device** STT |
| AI works, STT doesn’t | Check Audio → On-device vs Cloud + keys |
| Download shows old version | Hard-refresh `/download`; confirm `apk-manifest.json` version |
| Mic dies mid-session | Another app took mic; Web Speech `onend` should restart — tap Stop/New Question |

### Useful local commands

```bash
# Mobile web dev (browser, not full APK)
cd landing
npm run build:mobile
npx vite preview --outDir dist-mobile

# Full APK
npm run build:android-apk

# Typecheck
npm run typecheck
```

---

## 13. Mental model (one paragraph)

You install a **Capacitor-wrapped React app** that keeps your **resume and API keys on the phone**, listens via **on-device speech** (or optional **cloud STT**), turns **finished phrases** into text without duplication, waits briefly after you **stop talking**, then calls **your chosen LLM API** with your **profile context** to draft an interview answer — while a **separate device** runs the actual video call.

---

## 14. Key files quick index

| Concern | File |
|---------|------|
| Session logic | `landing/src/mobile/useInterviewSession.ts` |
| Cumulative STT fix | `landing/src/mobile/transcriptMerge.ts` |
| Cloud STT routing | `landing/src/mobile/cloudStt.ts` |
| AI calls (APK) | `landing/src/mobile/providerChat.ts` |
| Prompts / routing | `landing/src/mobile/promptBuilder.ts`, `answerRouting.ts` |
| Defaults | `landing/src/mobile/profileTypes.ts` |
| Persistence | `landing/src/mobile/profileStorage.ts` |
| STT vendors | `landing/src/mobile/sttRegistry.ts` |
| Model lists | `landing/src/mobile/modelCatalog.ts` |
| NVIDIA gRPC proxy | `landing/api/nvidia-parakeet-grpc.js` |
| APK copy + manifest | `landing/scripts/copy-android-apk.cjs` |
| Download page | `landing/src/pages/DownloadsPage.tsx`, `config/downloads.ts` |
| Android version | `landing/android/app/build.gradle` |

---

*Last updated for release **1.2.0-stag** (August 2026).*
