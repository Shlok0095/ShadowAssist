// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Reference file retrieval — keyword index + optional vector embeddings (Phase 9).

const { normalizeReferenceFiles, INJECT_MAX } = require('./contextPrompts')
const { cosineSimilarity, keywordOverlapScore } = require('./vectorMemoryUtils')

const CHUNK_SIZE = 900
const CHUNK_OVERLAP = 120
const DEFAULT_TOP_K = 8
const VECTOR_MIN_SCORE = 0.22

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
}

function chunkText(text) {
  const t = String(text || '').trim()
  if (!t) return []
  if (t.length <= CHUNK_SIZE) return [t]
  const chunks = []
  let i = 0
  while (i < t.length) {
    const end = Math.min(t.length, i + CHUNK_SIZE)
    chunks.push(t.slice(i, end))
    if (end >= t.length) break
    i = Math.max(i + 1, end - CHUNK_OVERLAP)
  }
  return chunks
}

/**
 * @param {import('./contextPrompts').NormalizedPrompt | null | undefined} prompt
 */
function buildIndexForPrompt(prompt) {
  if (!prompt?.id) return null
  const files = normalizeReferenceFiles(prompt.referenceFiles)
  /** @type {{ id: string, fileId: string, fileName: string, text: string, terms: string[] }[]} */
  const chunks = []
  for (const file of files) {
    const parts = chunkText(file.text)
    parts.forEach((text, idx) => {
      chunks.push({
        id: `${file.id}-${idx}`,
        fileId: file.id,
        fileName: file.name,
        text,
        terms: [...new Set(tokenize(text))],
      })
    })
  }
  if (!chunks.length) return null
  return {
    promptId: prompt.id,
    updatedAt: Number(prompt.updatedAt) || Date.now(),
    chunkCount: chunks.length,
    chunks,
  }
}

/**
 * @param {unknown[]} prompts
 * @param {{ get: Function, set: Function }} store
 */
function indexAllPrompts(prompts, store) {
  /** @type {Record<string, unknown>} */
  const meta = {}
  const list = Array.isArray(prompts) ? prompts : []
  for (const raw of list) {
    const entry = buildIndexForPrompt(raw)
    if (entry) meta[entry.promptId] = entry
  }
  store.set('contextIndexMeta', meta)
  return { promptCount: Object.keys(meta).length }
}

function rankChunksKeyword(chunks, query, topK) {
  const qTerms = tokenize(query)
  if (!qTerms.length) return chunks.slice(0, topK)

  return chunks
    .map((c) => {
      const terms = c.terms || tokenize(c.text)
      let score = 0
      const qSet = new Set(qTerms)
      for (const t of terms) {
        if (qSet.has(t)) score += 1
      }
      if (score <= 0) score = keywordOverlapScore(query, c.text)
      return { c, score }
    })
    .sort((a, b) => b.score - a.score)
    .filter((x) => x.score > 0)
    .slice(0, topK)
    .map((x) => x.c)
}

/**
 * @param {string} promptId
 * @param {string} query
 * @param {{ topK?: number, maxChars?: number }} opts
 * @param {{ get: Function }} store
 */
function retrieveChunks(promptId, query, opts, store) {
  const topK = opts?.topK ?? DEFAULT_TOP_K
  const maxChars = opts?.maxChars ?? INJECT_MAX
  const meta = store.get('contextIndexMeta') || {}
  const entry = meta[promptId]
  const chunks = entry?.chunks
  if (!Array.isArray(chunks) || !chunks.length) return []

  const ranked = rankChunksKeyword(chunks, query, topK)
  const picked = ranked.length ? ranked : chunks.slice(0, topK)
  return selectByCharBudget(picked, maxChars)
}

/**
 * Vector + keyword hybrid retrieval (keyword fallback always kept).
 * @param {string} promptId
 * @param {string} query
 * @param {{ topK?: number, maxChars?: number }} opts
 * @param {{ get: Function }} store
 * @param {{ embedText?: Function } | null} [embedClient]
 */
async function retrieveChunksAsync(promptId, query, opts, store, embedClient = null) {
  const keywordHits = retrieveChunks(promptId, query, opts, store)
  if (store.get('referenceVectorIndexEnabled') !== true || !embedClient?.embedText) {
    return keywordHits
  }

  const topK = opts?.topK ?? DEFAULT_TOP_K
  const maxChars = opts?.maxChars ?? INJECT_MAX
  const meta = store.get('contextIndexMeta') || {}
  const entry = meta[promptId]
  const chunks = entry?.chunks
  if (!Array.isArray(chunks) || !chunks.length) return keywordHits

  const withVectors = chunks.filter((c) => Array.isArray(c.vector) && c.vector.length)
  if (!withVectors.length) return keywordHits

  try {
    const qVec = await embedClient.embedText(String(query || '').trim())
    if (!qVec.length) return keywordHits

    const ranked = chunks
      .map((c) => {
        const vecScore = Array.isArray(c.vector) && c.vector.length ? cosineSimilarity(qVec, c.vector) : 0
        const kwScore = keywordOverlapScore(query, c.text)
        return { c, score: vecScore * 2.2 + kwScore }
      })
      .sort((a, b) => b.score - a.score)

    const vectorHits = ranked.filter((x) => x.score >= VECTOR_MIN_SCORE).slice(0, topK).map((x) => x.c)
    if (!vectorHits.length) return keywordHits
    return selectByCharBudget(vectorHits, maxChars)
  } catch (e) {
    console.warn('[context-vector] retrieve failed:', e?.message || e)
    return keywordHits
  }
}

/**
 * Background embedding enrichment for a prompt index entry.
 * @param {string} promptId
 * @param {{ get: Function, set: Function }} store
 * @param {{ embedTexts?: Function } | null} embedClient
 */
async function enrichPromptIndexWithEmbeddings(promptId, store, embedClient) {
  if (store.get('referenceVectorIndexEnabled') !== true || !embedClient?.embedTexts) return { ok: false }
  const meta = store.get('contextIndexMeta') || {}
  const entry = meta[promptId]
  if (!entry?.chunks?.length) return { ok: false }

  const pending = entry.chunks.filter((c) => !Array.isArray(c.vector) || !c.vector.length)
  if (!pending.length) return { ok: true, embedded: 0 }

  const texts = pending.map((c) => String(c.text || '').slice(0, 2000))
  const vectors = await embedClient.embedTexts(texts)
  for (let i = 0; i < pending.length; i++) {
    pending[i].vector = Array.isArray(vectors[i]) ? vectors[i] : null
  }
  entry.embeddedAt = Date.now()
  meta[promptId] = entry
  store.set('contextIndexMeta', { ...meta })
  return { ok: true, embedded: pending.length }
}

/**
 * @param {unknown[]} prompts
 * @param {{ get: Function, set: Function }} store
 * @param {{ embedTexts?: Function } | null} [embedClient]
 */
async function enrichAllPromptEmbeddings(prompts, store, embedClient) {
  const list = Array.isArray(prompts) ? prompts : []
  let total = 0
  for (const raw of list) {
    const id = raw?.id
    if (!id) continue
    const res = await enrichPromptIndexWithEmbeddings(id, store, embedClient)
    total += res?.embedded || 0
  }
  return { embedded: total }
}

function selectByCharBudget(chunks, maxChars) {
  const out = []
  let used = 0
  for (const c of chunks) {
    const t = String(c.text || '')
    if (!t) continue
    if (used > 0 && used + t.length + 4 > maxChars) break
    out.push(c)
    used += t.length + 4
  }
  return out
}

function formatRetrievedReferenceBlock(chunks) {
  if (!chunks?.length) return ''
  const body = chunks
    .map((c) => `### ${c.fileName || 'Reference'}\n${String(c.text || '').trim()}`)
    .join('\n\n')
  const clipped = body.length > INJECT_MAX ? `${body.slice(0, INJECT_MAX)}\n…` : body
  return `\n\n---\n## REFERENCE FILES (retrieved — facts only; do not invent beyond this)\n${clipped}`
}

function referenceNeedsRetrieval(prompt) {
  const text = normalizeReferenceFiles(prompt?.referenceFiles)
    .map((f) => f.text)
    .join('\n\n')
  return text.length > INJECT_MAX
}

module.exports = {
  indexAllPrompts,
  retrieveChunks,
  retrieveChunksAsync,
  enrichPromptIndexWithEmbeddings,
  enrichAllPromptEmbeddings,
  formatRetrievedReferenceBlock,
  referenceNeedsRetrieval,
  buildIndexForPrompt,
}
