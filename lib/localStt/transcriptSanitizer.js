// Copyright (c) 2026 VeilAssist. All rights reserved.
// Strip Whisper/Moonshine training-artifact tags before gating (YouTube subtitle leakage).

const MEDIA_TAG_RE =
  /\(\s*(?:upbeat\s+)?music[^)]*\)|\(\s*applause[^)]*\)|\(\s*laughter[^)]*\)|\(\s*silence[^)]*\)|\(\s*inaudible[^)]*\)/gi
const BRACKET_MEDIA_RE =
  /\[\s*(?:upbeat\s+)?music[^\]]*\]|\[\s*applause[^\]]*\]|\[\s*laughter[^\]]*\]|\[\s*silence[^\]]*\]|\[\s*inaudible[^\]]*\]/gi

/** @param {string} text */
function sanitizeTranscript(text) {
  let t = String(text || '').trim()
  if (!t) return ''
  t = t.replace(MEDIA_TAG_RE, ' ')
  t = t.replace(BRACKET_MEDIA_RE, ' ')
  t = t.replace(/\(\s*\)/g, ' ')
  t = t.replace(/\[\s*\]/g, ' ')
  t = t.replace(/\s+([,.!?;:])/g, '$1')
  t = t.replace(/([,.!?;:])([^\s])/g, '$1 $2')
  return t.replace(/\s+/g, ' ').trim()
}

module.exports = { sanitizeTranscript }
