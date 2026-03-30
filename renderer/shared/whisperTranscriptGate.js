// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Whisper verbose_json segment filtering + aggregate confidence (CPU-only, no native deps).

/** Open-source Whisper-style segment rejection (Groq/OpenAI verbose_json). */
export const WHISPER_NO_SPEECH_THRESHOLD = 0.6
export const WHISPER_LOGPROB_THRESHOLD = -1.0
export const WHISPER_COMPRESSION_RATIO_MAX = 2.4
export const WHISPER_NO_SPEECH_HARD = 0.72

/**
 * If kept segments average below this, discard the whole utterance (reduces borderline hallucinations).
 * Typical clear speech is often > -0.35; silence/noise drifts more negative.
 */
export const AGGREGATE_AVG_LOGPROB_MIN = -0.48

function keepSegment(s) {
  const cr = Number(s.compression_ratio)
  if (Number.isFinite(cr) && cr > WHISPER_COMPRESSION_RATIO_MAX) return false
  const ns = Number(s.no_speech_prob)
  const al = Number(s.avg_logprob)
  if (Number.isFinite(ns) && ns > WHISPER_NO_SPEECH_HARD) return false
  if (
    Number.isFinite(ns) &&
    Number.isFinite(al) &&
    ns > WHISPER_NO_SPEECH_THRESHOLD &&
    al < WHISPER_LOGPROB_THRESHOLD
  ) {
    return false
  }
  return true
}

/**
 * @param {object} j - Parsed verbose_json body
 * @returns {{ text: string, ok: boolean, aggregateLogprob: number|null }}
 */
export function filterWhisperVerboseJson(j) {
  const segments = j?.segments
  if (!Array.isArray(segments) || segments.length === 0) {
    const raw = String(j?.text || '').trim()
    return { text: raw, ok: raw.length >= 2, aggregateLogprob: null }
  }

  const kept = segments.filter(keepSegment)
  const text = kept
    .map((s) => String(s.text || '').trim())
    .filter(Boolean)
    .join(' ')
    .trim()

  if (!text || text.length < 2) {
    return { text: '', ok: false, aggregateLogprob: null }
  }

  let sum = 0
  let n = 0
  for (const s of kept) {
    const al = Number(s.avg_logprob)
    if (Number.isFinite(al)) {
      sum += al
      n += 1
    }
  }
  const aggregateLogprob = n > 0 ? sum / n : null
  const confident =
    aggregateLogprob == null || aggregateLogprob >= AGGREGATE_AVG_LOGPROB_MIN

  return { text, ok: confident, aggregateLogprob }
}
