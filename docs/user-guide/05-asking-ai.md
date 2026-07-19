# Asking AI

VeilAssist sends your question plus context (transcript, profile, optional screen screenshot) to your chosen LLM. Answers **stream** token-by-token into the overlay panel.

## Ways to ask

| Method | Description |
|--------|-------------|
| **Type and send** | Enter text in the input bar and press Enter or Send |
| **Ask with screen** | `Ctrl+Enter` — captures a screenshot + includes transcript/profile context |
| **Ask without screen** | `Ctrl+Shift+Enter` — audio/text context only, no screenshot |
| **Empty send** | Send with empty input during Listen — screen-only ask (vision provider required) |
| **Action chips** | One-click presets during Listen (see below) |
| **Skills** | Type `/skill-name` optionally followed by a question |

The input bar placeholder reminds you: `Ctrl+Enter` screen · `Ctrl+Shift+Enter` audio only.

## What context is included

Each request combines pieces you control:

| Source | When included |
|--------|---------------|
| **Active profile mode** | Persona instructions and notes template |
| **Resume** | When Intelligence routing decides it is relevant |
| **Job description / role notes** | When relevant to the question |
| **Reference files (playbooks)** | Enabled references for the active mode; semantic retrieval when vector index is on |
| **Audio transcript** | Recent speech when Listen has been active |
| **Screen screenshot** | On Ask with screen (`Ctrl+Enter`) or empty send — vision-capable providers only |
| **Long-term memory** | Past meeting summaries when Intelligence memory is on and question is backward-looking |
| **Past meeting search** | When you use the overlay search pill (Intelligence → Search past meetings) |

The assistant is instructed to prioritize **what was said** when both audio and screen exist.

**Note:** VeilAssist does **not** run continuous OCR or screen reading on a timer. Screen context comes from **on-demand screenshots** when you Ask with screen.

## Action chips

During an active Listen session, quick-action chips appear above the input:

| Chip | What it sends |
|------|---------------|
| **Clarify** | Simpler, shorter wording of the last answer |
| **Follow up** | One concise line you can say next |
| **Summarize** | Key points from the transcript so far |
| **What to answer** | Ready-to-speak reply to the latest question |

Click a chip to send the preset prompt through the normal Ask pipeline.

## Skills

**Settings → Skills** — create reusable instruction blocks with a slug (e.g. `interview`).

In the overlay input, type:

```
/interview what should I say about my last project?
```

VeilAssist injects the skill instructions plus your optional question. Starter templates are available in the Skills panel.

## Streaming, stop, and copy

- Answers stream live into the response panel.
- **Stop** button aborts generation mid-stream.
- **Copy last reply** — `Ctrl+Shift+C`.
- **Clear chat** — `Ctrl+R` clears the overlay thread and session buffer.
- Code blocks in responses are syntax-highlighted with a copy button.

## Response style and language

**Settings → AI Providers:**

| Setting | Options |
|---------|---------|
| **Response style** | Brief (summary) or Detailed (markdown) |
| **Response language** | Optional — adds language instruction to the system prompt |

## Screenshot queue

**`Ctrl+H`** — saves PNG screenshots to a queue folder under app userData for batched vision use. No overlay UI; hotkey only.

## Vision requirements

Ask with screen requires a **vision-capable** chat provider:

- Groq (Llama 4 vision models)
- OpenAI (GPT-4o and vision models)
- Anthropic (Claude with vision)
- Google Gemini
- NVIDIA NIM (Nemotron VL models)

DeepSeek and Custom endpoints without vision support text-only asks.

## Mode suggestion banner

When **Intelligence → Auto-detect meeting type** is on, VeilAssist may suggest switching profile modes based on transcript keywords. Click **Switch** or **Dismiss** on the banner in the overlay.

## Search past meetings

When **Intelligence → Search past meetings** is enabled, a search pill appears in the overlay. Type a query to ask against saved session recaps (vector + keyword retrieval).
