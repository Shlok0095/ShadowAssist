// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Local TF-IDF context index — chunks profile text and retrieves by cosine similarity.

const fsPromises = require('fs').promises
const path = require('path')
const { CONTEXT_TAGS } = require('./contextProfiles')

const CHUNK_MAX = 420
const CHUNK_OVERLAP = 70
const TOP_K = 5
const MAX_BLOCK_CHARS = 2200
const MIN_SCORE = 0.06

let currentIndex = null
let indexPath = null

function getIndexPath(userDataPath) {
  return path.join(userDataPath, 'context-index.json')
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
}

function chunkText(text, maxLen = CHUNK_MAX, overlap = CHUNK_OVERLAP) {
  const t = String(text || '').trim()
  if (!t) return []
  if (t.length <= maxLen) return [t]
  const chunks = []
  let start = 0
  while (start < t.length) {
    let end = Math.min(start + maxLen, t.length)
    if (end < t.length) {
      const slice = t.slice(start, end)
      const breakAt = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('. '), slice.lastIndexOf('\n'))
      if (breakAt > maxLen * 0.35) end = start + breakAt + 1
    }
    const chunk = t.slice(start, end).trim()
    if (chunk) chunks.push(chunk)
    if (end >= t.length) break
    start = Math.max(start + 1, end - overlap)
  }
  return chunks
}

function vecNorm(vec) {
  let s = 0
  for (const v of vec.values()) s += v * v
  return Math.sqrt(s) || 1
}

function cosineSimilarity(vecA, vecB) {
  let dot = 0
  const smaller = vecA.size < vecB.size ? vecA : vecB
  const larger = vecA.size < vecB.size ? vecB : vecA
  for (const [k, v] of smaller) {
    const w = larger.get(k)
    if (w) dot += v * w
  }
  return dot / (vecNorm(vecA) * vecNorm(vecB))
}

function buildIndexFromChunks(allChunks) {
  const N = allChunks.length || 1
  const docFreq = new Map()
  const tokenized = allChunks.map((chunk) => {
    const tokens = tokenize(chunk.text)
    const tf = new Map()
    for (const tok of tokens) tf.set(tok, (tf.get(tok) || 0) + 1)
    for (const tok of tf.keys()) docFreq.set(tok, (docFreq.get(tok) || 0) + 1)
    return { tokens, tf, len: Math.max(tokens.length, 1) }
  })

  const idfMap = new Map()
  for (const [tok, df] of docFreq) {
    idfMap.set(tok, Math.log(1 + N / df))
  }

  const vectors = tokenized.map((doc) => {
    const vec = new Map()
    for (const [tok, count] of doc.tf) {
      vec.set(tok, (count / doc.len) * (idfMap.get(tok) || 0))
    }
    return vec
  })

  return { idfMap, vectors, N }
}

function queryVector(query, idfMap, N) {
  const tokens = tokenize(query)
  if (!tokens.length) return new Map()
  const tf = new Map()
  for (const tok of tokens) tf.set(tok, (tf.get(tok) || 0) + 1)
  const vec = new Map()
  for (const [tok, count] of tf) {
    const idf = idfMap.get(tok) || Math.log(1 + N)
    vec.set(tok, (count / tokens.length) * idf)
  }
  return vec
}

function deserializeIndex(raw) {
  return {
    version: raw.version || 1,
    indexedAt: raw.indexedAt || null,
    chunkCount: raw.chunkCount || 0,
    chunks: raw.chunks || [],
    vectors: (raw.vectors || []).map((entries) => new Map(entries)),
    idfMap: new Map(raw.idfMap || []),
    N: raw.N || 1,
  }
}

function serializeIndex(index) {
  return {
    version: index.version,
    indexedAt: index.indexedAt,
    chunkCount: index.chunkCount,
    chunks: index.chunks,
    vectors: index.vectors.map((v) => [...v.entries()]),
    idfMap: [...index.idfMap.entries()],
    N: index.N,
  }
}

async function loadIndex(userDataPath) {
  if (currentIndex) return currentIndex
  indexPath = getIndexPath(userDataPath)
  try {
    const raw = JSON.parse(await fsPromises.readFile(indexPath, 'utf8'))
    currentIndex = deserializeIndex(raw)
  } catch {
    currentIndex = {
      version: 1,
      indexedAt: null,
      chunkCount: 0,
      chunks: [],
      vectors: [],
      idfMap: new Map(),
      N: 1,
    }
  }
  return currentIndex
}

async function indexProfiles(profiles, userDataPath) {
  indexPath = getIndexPath(userDataPath)
  const allChunks = []
  for (const tag of CONTEXT_TAGS) {
    const text = String(profiles?.[tag] || '').trim()
    if (!text) continue
    for (const c of chunkText(text)) {
      allChunks.push({ id: `${tag}-${allChunks.length}`, tag, text: c })
    }
  }

  const { idfMap, vectors, N } = buildIndexFromChunks(allChunks)
  currentIndex = {
    version: 1,
    indexedAt: new Date().toISOString(),
    chunkCount: allChunks.length,
    chunks: allChunks,
    vectors,
    idfMap,
    N,
  }

  await fsPromises.mkdir(path.dirname(indexPath), { recursive: true })
  await fsPromises.writeFile(indexPath, JSON.stringify(serializeIndex(currentIndex)), 'utf8')
  return getStats()
}

function search(query, { tag = null, topK = TOP_K } = {}) {
  if (!currentIndex?.chunks?.length) return []
  const qVec = queryVector(query, currentIndex.idfMap, currentIndex.N)
  if (!qVec.size) return []

  const scored = []
  for (let i = 0; i < currentIndex.chunks.length; i++) {
    const chunk = currentIndex.chunks[i]
    if (tag && chunk.tag !== tag) continue
    const score = cosineSimilarity(qVec, currentIndex.vectors[i])
    if (score >= MIN_SCORE) scored.push({ ...chunk, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK)
}

function formatContextBlock(query, { tag = null, topK = TOP_K } = {}) {
  let results = search(query, { tag, topK })
  if (tag && !results.length) results = search(query, { tag: null, topK })
  if (!results.length) return ''

  let body = ''
  const used = new Set()
  for (const r of results) {
    if (used.has(r.text)) continue
    used.add(r.text)
    const piece = `[${r.tag}] ${r.text}`
    if (body.length + piece.length + 2 > MAX_BLOCK_CHARS) break
    body += (body ? '\n\n' : '') + piece
  }
  if (!body) return ''
  return `\n\n---\n## RELEVANT CONTEXT (from your profile — do not invent facts beyond this)\n${body}`
}

function getStats() {
  const chunks = currentIndex?.chunks || []
  const tags = {}
  for (const t of CONTEXT_TAGS) tags[t] = chunks.filter((c) => c.tag === t).length
  return {
    chunkCount: currentIndex?.chunkCount || 0,
    indexedAt: currentIndex?.indexedAt || null,
    tags,
  }
}

function invalidateCache() {
  currentIndex = null
}

module.exports = {
  loadIndex,
  indexProfiles,
  search,
  formatContextBlock,
  getStats,
  invalidateCache,
}
