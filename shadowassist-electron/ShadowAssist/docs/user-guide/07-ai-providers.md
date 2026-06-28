# AI providers

VeilAssist uses **bring your own key (BYOK)** for all cloud AI. Configure chat and STT separately in Settings.

## Chat providers

**Settings → AI Providers:**

| Provider | Vision | Best for |
|----------|--------|----------|
| **Groq** | Yes | Fast Llama 4 vision — screen + transcript |
| **OpenAI** | Yes | GPT-4o and vision models |
| **Anthropic** | Yes | Claude — reasoning + vision |
| **Google Gemini** | Yes | Gemini Flash / Pro with vision |
| **NVIDIA NIM** | Yes | Nemotron and Llama VL models on NVIDIA infrastructure |
| **DeepSeek** | No | DeepSeek V3 — text only |
| **Custom (OpenAI-compat)** | Configurable | LiteLLM, Ollama, Azure OpenAI, local `/v1` endpoints |

## Setup steps

1. Pick a provider tab.
2. Paste your API key.
3. Click **Save key**.
4. Click **Sync models** (where supported) to refresh the model list.
5. Select a **chat model** from the dropdown.
6. Click **Test connection** — fix key or model if it fails.

Keys are stored locally and encrypted with Windows DPAPI when available.

## Custom OpenAI-compatible endpoint

For **Custom** provider:

1. Enter **Base URL** (e.g. `http://localhost:11434/v1` for Ollama, or your LiteLLM proxy).
2. Paste API key (use a placeholder like `ollama` if the server ignores auth).
3. Enter model name manually or sync if the server supports listing.

## Response style and language

| Setting | Description |
|---------|-------------|
| **Response style** | Brief (summary) or Detailed (markdown formatting) |
| **Response language** | Optional ISO-style language hint added to the system prompt |

## Vision vs text-only

- **Ask with screen** (`Ctrl+Enter`) requires a vision-capable provider and model.
- **Ask without screen** (`Ctrl+Shift+Enter`) works with any chat provider including DeepSeek.

## STT providers (separate from chat)

Cloud speech-to-text is configured under **Settings → Audio**, not AI Providers. See [Listen and transcription](/docs/listen-and-transcription).

Groq and OpenAI chat keys can often double for Whisper STT on the same account; other STT keys go under Audio → Advanced STT keys.

## Onboarding vs full Settings

First-run onboarding offers Groq, OpenAI, and NVIDIA NIM. All seven chat providers are available in **Settings → AI Providers** after onboarding.
