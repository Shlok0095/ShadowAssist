// Copyright (c) 2026 VeilAssist. All rights reserved.

const { parentPort } = require('worker_threads')

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || !a.length || a.length !== b.length) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return denominator > 0 ? dot / denominator : 0
}

parentPort.on('message', (message) => {
  try {
    const query = Array.isArray(message?.query) ? message.query : []
    const rows = Array.isArray(message?.rows) ? message.rows : []
    const topK = Math.max(1, Number(message?.topK) || 6)
    const results = rows
      .map((row) => ({ rowid: row.rowid, score: cosineSimilarity(query, row.embedding) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
    parentPort.postMessage({ ok: true, results })
  } catch (error) {
    parentPort.postMessage({ ok: false, error: error?.message || String(error) })
  }
})
