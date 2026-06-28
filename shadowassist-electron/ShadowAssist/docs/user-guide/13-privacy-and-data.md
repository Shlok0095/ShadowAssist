# Privacy and data

VeilAssist is **local-first**. Your API keys, transcripts, and recaps stay on your device unless you send them to your chosen AI vendor when you Ask.

## What is stored locally

| Data | Location / notes |
|------|------------------|
| API keys | Encrypted with Windows DPAPI when available |
| Settings and profile | App userData (`%AppData%\VeilAssist-v2`) |
| Session recaps | Local JSON/store — optional via Do not save meetings |
| Long-term memory | Local recall index |
| Reference file text | Parsed from uploads you attach |
| Screenshot queue | PNG files in userData when you press `Ctrl+H` |
| Debug log | `veilassist.log` when verbose logging is on |

## What is not stored

| Data | Behavior |
|------|----------|
| Raw audio | Processed in memory for STT — not saved to disk |
| Screen screenshots | Captured on demand for Ask — not persisted unless screenshot queue |
| Cloud uploads | Only what you send via BYOK to your provider’s API |

## Provider traffic

When you Ask or use cloud STT, data goes **directly from your PC to your vendor** (Groq, OpenAI, Anthropic, etc.). VeilAssist does not operate a backend that receives your content.

Review each vendor’s privacy policy for retention and training use.

## Privacy settings

**Settings → Privacy:**

| Action | Description |
|--------|-------------|
| **Export user data** | Downloads profile, consent flags, and preferences — **not** API keys or audio |
| **Delete all data** | Wipes local store and relaunches — irreversible |

## Do not save meetings

**Settings → General → Do not save meetings** — Stop Listen skips recap files and long-term memory writes.

## Hide from screen capture

**Settings → General → Hide from screen capture** — enables Windows content protection so the overlay is harder to include in screen shares and recordings.

## Verbose debug logging

**Settings → General → Verbose debug logging** — writes main-process and renderer logs to `veilassist.log`. Use **Open log file** to view. Disable when not troubleshooting — logs may contain transcript snippets.

## Legal documents

Terms, Privacy, and License ship inside the app and on the website:

- [/legal/terms](/legal/terms)
- [/legal/privacy](/legal/privacy)

Consent is required on first launch.

## Disclosure responsibility

You are responsible for telling meeting participants when AI assistance is used, per your organization’s policy and applicable law. VeilAssist shows an audio consent reminder the first time you start Listen.
