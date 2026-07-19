// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Whisper verbose_json segment filtering + aggregate confidence (CPU-only, no native deps).

// ─── Mic path (clean mic input) ────────────────────────────────────────────
/** Open-source Whisper-style segment rejection (Groq/OpenAI verbose_json). */
export const WHISPER_NO_SPEECH_THRESHOLD = 0.55
export const WHISPER_LOGPROB_THRESHOLD = -0.95
/** High ratio often = repetition loops / hallucination (Groq docs). */
export const WHISPER_COMPRESSION_RATIO_MAX = 2.12
export const WHISPER_NO_SPEECH_HARD = 0.68

/**
 * If kept segments average below this, `filterWhisperVerboseJson` sets ok=false.
 * Typical clear speech is often > -0.35; silence/noise drifts more negative.
 */
export const AGGREGATE_AVG_LOGPROB_MIN = -0.48

/** Below this aggregate avg_logprob, drop the whole chunk in the overlay (strict, mic path). */
export const AGGREGATE_DROP_HARD_MIN = -0.62

// ─── Sys / loopback path (Teams/Meet remote audio) ─────────────────────────
/**
 * Remote audio travels through two Opus codec passes (meeting app → WASAPI loopback → our encoder).
 * This double compression raises Whisper's compression_ratio and no_speech_prob even on real speech.
 * We apply significantly more lenient thresholds so participant audio is not silently dropped.
 */
const SYS_NO_SPEECH_HARD = 0.88           // vs 0.68 for mic
const SYS_COMPRESSION_RATIO_MAX = 2.8     // vs 2.12 (codec artifacts inflate this)
const SYS_NO_SPEECH_THRESHOLD = 0.75      // vs 0.55 for mic
const SYS_LOGPROB_THRESHOLD = -1.1        // vs -0.95 for mic
const SYS_AGGREGATE_AVG_LOGPROB_MIN = -0.72   // vs -0.48 for mic
const SYS_AGGREGATE_DROP_HARD_MIN = -0.90     // vs -0.62 for mic

/**
 * @param {object} s - Whisper segment
 * @param {'mic'|'sys'} pathKind
 */
function keepSegment(s, pathKind) {
  const isSys = pathKind === 'sys'
  const crMax = isSys ? SYS_COMPRESSION_RATIO_MAX : WHISPER_COMPRESSION_RATIO_MAX
  const nsHard = isSys ? SYS_NO_SPEECH_HARD : WHISPER_NO_SPEECH_HARD
  const nsThresh = isSys ? SYS_NO_SPEECH_THRESHOLD : WHISPER_NO_SPEECH_THRESHOLD
  const alThresh = isSys ? SYS_LOGPROB_THRESHOLD : WHISPER_LOGPROB_THRESHOLD

  const cr = Number(s.compression_ratio)
  if (Number.isFinite(cr) && cr > crMax) return false
  const ns = Number(s.no_speech_prob)
  const al = Number(s.avg_logprob)
  if (Number.isFinite(ns) && ns > nsHard) return false
  if (Number.isFinite(ns) && Number.isFinite(al) && ns > nsThresh && al < alThresh) return false
  // Borderline silence/noise check — skip for loopback where codec noise triggers this falsely
  if (!isSys && Number.isFinite(ns) && Number.isFinite(al) && ns > 0.42 && al < -0.75) return false
  return true
}

/**
 * @param {object} j - Parsed verbose_json body
 * @param {'mic'|'sys'} [pathKind='mic'] - Audio path; 'sys' uses more lenient thresholds
 * @returns {{ text: string, ok: boolean, aggregateLogprob: number|null, detectedLanguage: string|null }}
 *
 * `detectedLanguage` is Whisper's full-word language name (e.g. "english", "hindi") in lower-case,
 * or null when the field is absent (non-verbose response).
 */
export function filterWhisperVerboseJson(j, pathKind = 'mic') {
  const isSys = pathKind === 'sys'
  const aggMin = isSys ? SYS_AGGREGATE_AVG_LOGPROB_MIN : AGGREGATE_AVG_LOGPROB_MIN

  const detectedLanguage =
    typeof j?.language === 'string' ? j.language.toLowerCase().trim() : null

  const segments = j?.segments
  if (!Array.isArray(segments) || segments.length === 0) {
    const raw = String(j?.text || '').trim()
    return { text: raw, ok: raw.length >= 2, aggregateLogprob: null, detectedLanguage }
  }

  const kept = segments.filter((s) => keepSegment(s, pathKind))
  const text = kept
    .map((s) => String(s.text || '').trim())
    .filter(Boolean)
    .join(' ')
    .trim()

  if (!text || text.length < 2) {
    return { text: '', ok: false, aggregateLogprob: null, detectedLanguage }
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
  const confident = aggregateLogprob == null || aggregateLogprob >= aggMin

  return { text, ok: confident, aggregateLogprob, detectedLanguage }
}
