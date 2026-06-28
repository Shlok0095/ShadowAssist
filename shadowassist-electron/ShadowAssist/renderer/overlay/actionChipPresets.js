// Copyright (c) 2026 VeilAssist. All rights reserved.
// Phase 3 — Natively-style quick actions (preset prompts → existing handleAsk path).

/** @typedef {{ id: string, label: string, prompt: string, hint?: string }} ActionChipPreset */

/** @type {ActionChipPreset[]} */
export const ACTION_CHIP_PRESETS = [
  {
    id: 'clarify',
    label: 'Clarify',
    hint: 'Simpler wording of the last answer',
    prompt: 'Clarify your last answer in simpler, shorter terms I can say out loud.',
  },
  {
    id: 'followup',
    label: 'Follow up',
    hint: 'Next line to say in the conversation',
    prompt: 'Suggest one concise follow-up line I can say next in this conversation.',
  },
  {
    id: 'summarize',
    label: 'Summarize',
    hint: 'Key points from the session so far',
    prompt: 'Summarize the key points from the transcript and discussion so far.',
  },
  {
    id: 'whatToSay',
    label: 'What to answer',
    hint: 'Ready-to-speak reply to the latest question',
    prompt: 'What should I say in response to the most recent question? Give a ready-to-speak answer.',
  },
]
