# Intelligence and memory

**Settings → Intelligence** controls smart context, memory, and meeting-aware features.

## Smart features master switch

**Enable smart features** toggles all core intelligence flags together:

- Smart context routing
- Long-term memory
- Auto-detect meeting type

Turn off for a plain prompt + transcript on every ask.

## Core features (default on)

| Feature | What it does |
|---------|--------------|
| **Smart context routing** | Includes resume, JD, and reference files only when the question needs them — saves tokens and reduces noise |
| **Long-term memory** | Retains meeting summaries locally; recalls them on backward-looking questions (“what did we decide last week?”) |
| **Auto-detect meeting type** | Suggests profile mode switches from live transcript keywords |

## Customize (opt-in advanced)

Expand **Customize** for optional features:

| Feature | What it does |
|---------|--------------|
| **Smart follow-up drafts** | Generates a copy-ready follow-up email from session decisions — view in Calendar → Session recaps → View details |
| **Vector memory** | Semantic recall over past meetings; keyword fallback always kept |
| **Search past meetings** | Search pill in overlay for saved session recaps |
| **Stronger candidate voice** | Anchors answers to structured resume/JD (first person) |
| **Answer diversity** | Slight phrasing variation across similar asks |
| **Reference file vectors** | Embed playbook chunks for semantic retrieval |

## Clearing memory

**Intelligence → Clear long-term memory** — wipes locally stored recall entries. Does not delete session recap files unless you remove them separately in Calendar.

## External recall (Hindsight)

Optional vector recall service beyond on-device memory:

| Setting | Description |
|---------|-------------|
| **Recall API base URL** | Your Hindsight-compatible service endpoint |
| **API key** | Optional bearer token |
| **Auto-start local recall server** | Starts `POST /recall` on `127.0.0.1:8888` locally; sets URL if empty |

Falls back to local keyword memory when the service is empty or offline.

## Do not save meetings

**Settings → General → Do not save meetings** — when on, Stop Listen skips session recaps and long-term memory writes entirely. Intelligence recall has nothing new to index.

## How memory interacts with Ask

1. During Listen, transcript accumulates in the session buffer.
2. On Stop, a recap may be saved (unless opted out).
3. On a later Ask, routing decides whether to inject resume, JD, references, LTM snippets, or search results.
4. The LLM receives a composed prompt — you do not manage this manually.
