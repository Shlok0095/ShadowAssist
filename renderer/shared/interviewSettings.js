// Copyright (c) 2026 VeilAssist. Overlay/renderer helpers — parity with lib/interviewSettingsCatalog.cjs

export function minCharsForDetection(level) {
  const l = String(level || 'high').toLowerCase()
  if (l === 'low') return 24
  if (l === 'medium') return 14
  return 6
}

export function effectiveMinSpeechChars(questionDetection, micSensitivity) {
  const base = minCharsForDetection(questionDetection)
  if (micSensitivity === 'boost') return Math.max(8, Math.floor(base * 0.65))
  return base
}

export function fontSizeFromAnswerLength(length) {
  const l = String(length || 'medium').toLowerCase()
  if (l === 'short') return 'small'
  if (l === 'long') return 'large'
  return 'medium'
}

export function overlayDisplayStyleFromFormat(format) {
  const v = String(format || 'bullets').toLowerCase()
  return v === 'bullets' ? 'brief' : 'detailed'
}

export const ANSWER_STRUCTURES = [
  { value: 'star', label: 'STAR', detail: 'Situation, Task, Action, Result (default)' },
  { value: 'car', label: 'CAR', detail: 'Context, Action, Result' },
  { value: 'soar', label: 'SOAR', detail: 'Situation, Obstacle, Action, Result' },
  { value: 'par', label: 'PAR', detail: 'Problem, Action, Result' },
  { value: 'soara', label: 'SOARA', detail: 'Situation, Objective, Action, Result, Aftermath' },
]

export const RESPONSE_FORMATS = [
  { value: 'bullets', label: 'Bullet Points', detail: 'Concise, easy-to-scan list of key points (default)' },
  {
    value: 'conversational',
    label: 'Conversational',
    detail: 'Natural spoken tone with light fillers (Hmm, basically, I mean)',
  },
  { value: 'example', label: 'Example-Driven', detail: 'Main points illustrated with specific examples' },
]

export const ANSWER_LENGTHS = [
  { value: 'short', label: 'Short', detail: 'Under ~80 words' },
  { value: 'medium', label: 'Medium', detail: 'Balanced depth (default)' },
  { value: 'long', label: 'Long', detail: 'Up to ~250 words when needed' },
]

export const QUESTION_DETECTION_LEVELS = [
  { value: 'low', label: 'Low', detail: 'Wait for longer utterances (~24 chars)' },
  { value: 'medium', label: 'Medium', detail: 'Balanced (~14 chars)' },
  { value: 'high', label: 'High', detail: 'Fast trigger (~6 chars)' },
]

export const MEETING_LANGUAGES = [
  { value: 'en', label: 'English (Default)' },
  { value: 'en-US', label: 'English (United States)' },
  { value: 'en-IN', label: 'English (India)' },
  { value: 'hi', label: 'Hindi' },
  { value: 'en_hi_hinglish', label: 'Hinglish' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ar', label: 'Arabic' },
]
