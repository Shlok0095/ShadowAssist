// Copyright (c) 2026 VeilAssist. All rights reserved.
// Port of renderer/shared/whisperTranscriptGate.js for local Whisper chunk metadata.

const MIC = {
  compressionMax: 2.12,
  noSpeechHard: 0.68,
  noSpeechThresh: 0.55,
  logprobThresh: -0.95,
  aggregateMin: -0.48,
  dropHardMin: -0.62,
}

const SYS = {
  compressionMax: 2.8,
  noSpeechHard: 0.88,
  noSpeechThresh: 0.75,
  logprobThresh: -1.1,
  aggregateMin: -0.72,
  dropHardMin: -0.9,
}

function keepSegment(s, pathKind) {
  const th = pathKind === 'sys' ? SYS : MIC
  const cr = Number(s?.compression_ratio)
  if (Number.isFinite(cr) && cr > th.compressionMax) return false
  const ns = Number(s?.no_speech_prob)
  const al = Number(s?.avg_logprob)
  if (Number.isFinite(ns) && ns > th.noSpeechHard) return false
  if (Number.isFinite(ns) && Number.isFinite(al) && ns > th.noSpeechThresh && al < th.logprobThresh) {
    return false
  }
  if (pathKind !== 'sys' && Number.isFinite(ns) && Number.isFinite(al) && ns > 0.42 && al < -0.75) {
    return false
  }
  return true
}

function segmentsHaveConfidenceMeta(segments) {
  if (!Array.isArray(segments) || segments.length === 0) return false
  return segments.some(
    (s) => Number.isFinite(Number(s?.no_speech_prob)) || Number.isFinite(Number(s?.avg_logprob)),
  )
}

/**
 * @param {object} payload - { text, chunks?, language? }
 * @param {'mic'|'sys'} pathKind
 */
function filterLocalWhisperResult(payload, pathKind = 'mic') {
  const th = pathKind === 'sys' ? SYS : MIC
  const detectedLanguage =
    typeof payload?.language === 'string' ? payload.language.toLowerCase().trim() : null

  const segments = payload?.chunks
  const raw = String(payload?.text || '').trim()

  if (!segmentsHaveConfidenceMeta(segments)) {
    // transformers.js often omits verbose_json fields — Groq gate cannot run; text-only path required.
    return { text: raw, ok: false, aggregateLogprob: null, detectedLanguage, noConfidenceMeta: true }
  }

  const kept = segments.filter((s) => keepSegment(s, pathKind))
  const text = kept
    .map((s) => String(s.text || '').trim())
    .filter(Boolean)
    .join(' ')
    .trim()

  if (!text || text.length < 2) {
    return { text: '', ok: false, aggregateLogprob: null, detectedLanguage, noConfidenceMeta: false }
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
  const confident = aggregateLogprob == null || aggregateLogprob >= th.aggregateMin
  let ok = confident
  if (ok && typeof aggregateLogprob === 'number' && aggregateLogprob < th.dropHardMin) ok = false

  return { text, ok, aggregateLogprob, detectedLanguage, noConfidenceMeta: false }
}

module.exports = { filterLocalWhisperResult, keepSegment, segmentsHaveConfidenceMeta }
