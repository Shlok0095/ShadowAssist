// Copyright (c) 2026 ShadowAssist. All rights reserved.

/** Character-prefix overlap ratio (matches overlay App.jsx similarity for OCR debounce). */
function ocrTextSimilarity(a, b) {
  if (!a || !b) return 0
  let same = 0
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) same++
  }
  return same / Math.max(a.length, b.length)
}

module.exports = { ocrTextSimilarity }
