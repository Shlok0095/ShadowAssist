// Copyright (c) 2026 VeilAssist. All rights reserved.
// Section-aware resume/JD evidence retrieval (keyword + optional MiniLM hybrid).

const { keywordOverlapScore, cosineSimilarity } = require('./vectorMemoryUtils')

const SECTION_CHUNK_CHARS = 700
const SECTION_CHUNK_OVERLAP = 80
const DEFAULT_TOP_K = 6
const EMBED_TIMEOUT_MS = 700
const VECTOR_MIN_SCORE = 0.18

/** ~4 chars per token for budget enforcement. */
function charsFromTokenBudget(tokens) {
  const n = Number(tokens)
  if (!Number.isFinite(n) || n <= 0) return 2400
  return Math.max(400, Math.round(n * 4))
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
}

function chunkLongText(text, size = SECTION_CHUNK_CHARS, overlap = SECTION_CHUNK_OVERLAP) {
  const t = String(text || '').trim()
  if (!t) return []
  if (t.length <= size) return [t]
  const out = []
  let i = 0
  while (i < t.length) {
    const end = Math.min(t.length, i + size)
    out.push(t.slice(i, end))
    if (end >= t.length) break
    i = Math.max(i + 1, end - overlap)
  }
  return out
}

/**
 * Build section-aware chunks from a resume/JD tree.
 * @param {{ kind?: string, sections?: Record<string, string> } | null | undefined} tree
 * @param {string} [rawFallback]
 */
function buildProfileChunks(tree, rawFallback = '') {
  const sections = tree?.sections && Object.keys(tree.sections).length
    ? tree.sections
    : { body: String(rawFallback || '').trim() }
  /** @type {{ id: string, section: string, text: string, pin: boolean }[]} */
  const chunks = []
  const order = tree?.kind === 'jd'
    ? ['role', 'requirements', 'responsibilities', 'skills', 'company', 'benefits', 'body']
    : ['summary', 'skills', 'experience', 'projects', 'education', 'certifications', 'body']

  for (const section of order) {
    const body = String(sections[section] || '').trim()
    if (!body) continue
    const pin = section === 'summary' || section === 'skills' || section === 'role'
    const parts = chunkLongText(body)
    parts.forEach((text, idx) => {
      chunks.push({
        id: `${section}-${idx}`,
        section,
        text,
        pin: pin && idx === 0,
      })
    })
  }
  return chunks
}

function scoreChunk(query, chunk) {
  const terms = tokenize(query)
  const blob = String(chunk.text || '').toLowerCase()
  let score = chunk.pin ? 0.35 : 0
  if (chunk.section === 'experience' || chunk.section === 'requirements') score += 0.25
  for (const t of terms) {
    if (blob.includes(t)) score += 1
  }
  score += keywordOverlapScore(query, chunk.text) * 0.5
  return score
}

function selectByCharBudget(chunks, maxChars) {
  const limit = Math.max(200, Number(maxChars) || 2400)
  const out = []
  let used = 0
  for (const c of chunks) {
    const t = String(c.text || '').trim()
    if (!t) continue
    if (used + t.length > limit && out.length) break
    const slice = t.length > limit - used ? t.slice(0, Math.max(0, limit - used)) : t
    if (!slice) break
    out.push({ ...c, text: slice })
    used += slice.length + 2
    if (used >= limit) break
  }
  return out
}

/**
 * Keyword (+ optional MiniLM) retrieve for resume/JD.
 * Always prefers pinned summary/skills when present.
 *
 * @param {object} opts
 * @param {{ kind?: string, sections?: Record<string, string> } | null} [opts.tree]
 * @param {string} [opts.raw]
 * @param {string} [opts.query]
 * @param {number} [opts.maxChars]
 * @param {number} [opts.topK]
 * @param {{ embedTexts?: Function } | null} [opts.embedClient]
 */
async function retrieveProfileEvidence(opts = {}) {
  const query = String(opts.query || '').trim()
  const maxChars = Math.max(400, Number(opts.maxChars) || 2400)
  const topK = Math.max(2, Math.min(12, Number(opts.topK) || DEFAULT_TOP_K))
  const chunks = buildProfileChunks(opts.tree, opts.raw)
  if (!chunks.length) {
    return { chunks: [], text: '', evidenceCount: 0, sectionsUsed: [], usedEmbedding: false }
  }

  const pinned = chunks.filter((c) => c.pin)
  let ranked = chunks
    .map((c) => ({ c, score: scoreChunk(query, c) }))
    .sort((a, b) => b.score - a.score)

  let usedEmbedding = false
  if (opts.embedClient?.embedTexts && query && chunks.length > 1) {
    try {
      const sample = chunks.slice(0, 20)
      const texts = [query, ...sample.map((c) => String(c.text || '').slice(0, 900))]
      const vectors = await Promise.race([
        opts.embedClient.embedTexts(texts),
        new Promise((_, reject) => setTimeout(() => reject(new Error('profile embed timeout')), EMBED_TIMEOUT_MS)),
      ])
      const qVec = vectors?.[0]
      if (Array.isArray(qVec) && qVec.length) {
        ranked = sample
          .map((c, i) => {
            const v = vectors[i + 1]
            const vecScore = Array.isArray(v) && v.length ? cosineSimilarity(qVec, v) : 0
            const kw = scoreChunk(query, c)
            return { c, score: vecScore * 2.4 + kw }
          })
          .sort((a, b) => b.score - a.score)
        usedEmbedding = true
        if (ranked[0] && ranked[0].score < VECTOR_MIN_SCORE) {
          ranked = chunks.map((c) => ({ c, score: scoreChunk(query, c) })).sort((a, b) => b.score - a.score)
          usedEmbedding = false
        }
      }
    } catch (_) {
      /* keyword fallback */
    }
  }

  const scoredHits = ranked.filter((x) => x.score > 0).map((x) => x.c)
  const pool = []
  const seen = new Set()
  for (const c of [...pinned, ...scoredHits, ...chunks]) {
    if (seen.has(c.id)) continue
    seen.add(c.id)
    pool.push(c)
    if (pool.length >= topK + pinned.length) break
  }

  const selected = selectByCharBudget(pool, maxChars)
  const sectionsUsed = [...new Set(selected.map((c) => c.section))]
  const text = selected
    .map((c) => {
      const title = c.section === 'body' ? 'Background' : c.section.charAt(0).toUpperCase() + c.section.slice(1)
      return `### ${title}\n${c.text}`
    })
    .join('\n\n')

  return {
    chunks: selected,
    text,
    evidenceCount: selected.length,
    sectionsUsed,
    usedEmbedding,
    charCount: text.length,
  }
}

function clipTextToBudget(text, maxChars) {
  const t = String(text || '').trim()
  const limit = Math.max(200, Number(maxChars) || 2400)
  if (t.length <= limit) return t
  return `${t.slice(0, limit)}\n…`
}

module.exports = {
  buildProfileChunks,
  retrieveProfileEvidence,
  charsFromTokenBudget,
  clipTextToBudget,
  scoreChunk,
}
