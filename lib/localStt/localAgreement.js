// Copyright (c) 2026 VeilAssist. All rights reserved.
// LocalAgreement-2 — ported from Natively LocalWhisperSTT.

function longestCommonPrefix(a, b) {
  const sa = String(a || '')
  const sb = String(b || '')
  let i = 0
  const n = Math.min(sa.length, sb.length)
  while (i < n && sa[i] === sb[i]) i += 1
  if (i > 0 && i < sa.length && i < sb.length && sa[i] !== ' ' && sb[i] !== ' ') {
    while (i > 0 && sa[i - 1] !== ' ') i -= 1
  }
  return sa.slice(0, i)
}

class LocalAgreement {
  /** @param {boolean} skipAgreement — Moonshine path */
  constructor(skipAgreement = false) {
    this.skipAgreement = skipAgreement
    this.lastPartialText = ''
    this.lastEmittedText = ''
  }

  reset() {
    this.lastPartialText = ''
    this.lastEmittedText = ''
  }

  /**
   * @param {string} cleaned
   * @param {(text: string) => void} emit
   */
  handlePartial(cleaned, emit) {
    const t = String(cleaned || '').trim()
    if (!t) return

    if (this.skipAgreement) {
      if (t !== this.lastEmittedText) {
        this.lastEmittedText = t
        emit(t)
      }
      return
    }

    if (!this.lastPartialText) {
      this.lastPartialText = t
      return
    }

    const agreed = longestCommonPrefix(this.lastPartialText, t)
    this.lastPartialText = t
    if (agreed.length > this.lastEmittedText.length) {
      this.lastEmittedText = agreed
      const out = agreed.trim()
      if (out) emit(out)
    }
  }

  /**
   * @param {string} cleaned
   * @param {(text: string) => void} emit
   */
  handleFinal(cleaned, emit) {
    const t = String(cleaned || '').trim()
    this.reset()
    if (t) emit(t)
  }
}

module.exports = { LocalAgreement, longestCommonPrefix }
