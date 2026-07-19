// Copyright (c) 2026 VeilAssist. All rights reserved.
// Phase 8 — optional local POST /recall server (127.0.0.1:8888) for external Hindsight URL.

const http = require('http')

const DEFAULT_PORT = 8888

/**
 * @param {object} deps
 * @param {() => any} deps.storeGet
 * @param {{ recall: Function } | null} deps.longTermMemory
 * @param {{ recall: Function, isEnabled?: Function } | null} deps.vectorMemory
 */
function createHindsightLocalServer({ storeGet, longTermMemory, vectorMemory, port = DEFAULT_PORT }) {
  /** @type {import('http').Server | null} */
  let server = null

  async function buildMatches(query, maxResults) {
    const merged = []
    const topK = Math.max(1, Math.min(10, maxResults || 6))

    if (vectorMemory?.isEnabled?.() && vectorMemory?.recall) {
      const vecHits = await vectorMemory.recall(query, { topK: Math.min(6, topK), timeoutMs: 1200 })
      for (const h of vecHits || []) {
        merged.push({
          text: String(h.text || '').slice(0, 2000),
          score: (Number(h.score) || 1) * 2,
          source: h.source || 'vector_memory',
        })
      }
    }

    if (longTermMemory?.recall) {
      const ltm = await longTermMemory.recall(query, { maxResults: 4, timeoutMs: 800 })
      for (const m of ltm || []) {
        merged.push({
          text: String(m.text || '').slice(0, 2000),
          score: (Number(m.score) || 1) * 1.5,
          source: m.source || 'long_term_memory',
        })
      }
    }

    merged.sort((a, b) => (b.score || 0) - (a.score || 0))
    const seen = new Set()
    const out = []
    for (const m of merged) {
      const key = m.text.slice(0, 100).toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(m)
      if (out.length >= topK) break
    }
    return out
  }

  function readJsonBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = []
      req.on('data', (c) => chunks.push(c))
      req.on('end', () => {
        try {
          const raw = Buffer.concat(chunks).toString('utf8')
          resolve(raw ? JSON.parse(raw) : {})
        } catch (e) {
          reject(e)
        }
      })
      req.on('error', reject)
    })
  }

  async function start() {
    if (server) return { ok: true, port, url: `http://127.0.0.1:${port}` }
    server = http.createServer(async (req, res) => {
      try {
        const url = String(req.url || '').split('?')[0]
        if (req.method === 'GET' && url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({
            ok: true,
            service: 'veilassist-recall-gateway',
            vectorEnabled: vectorMemory?.isEnabled?.() === true,
          }))
          return
        }
        if (req.method === 'POST' && url === '/retain') {
          const body = await readJsonBody(req)
          const content = String(body?.content || '').trim()
          if (!content) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'content required' }))
            return
          }
          const record = longTermMemory?.retain?.({
            content,
            source: body?.source || 'recall_gateway',
            mode: body?.mode,
            meetingId: body?.scope?.meetingId || body?.meetingId,
            tags: Array.isArray(body?.tags) ? body.tags : [],
          })
          res.writeHead(202, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: !!record, id: record?.id || null }))
          return
        }
        if (req.method === 'POST' && url === '/recall') {
          const body = await readJsonBody(req)
          const query = String(body?.query || '').trim()
          const maxResults = Number(body?.maxResults) || 6
          if (!query) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'query required' }))
            return
          }
          const matches = await buildMatches(query, maxResults)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ matches }))
          return
        }
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'not found' }))
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: e?.message || String(e) }))
      }
    })

    await new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(port, '127.0.0.1', resolve)
    })
    return { ok: true, port, url: `http://127.0.0.1:${port}` }
  }

  function stop() {
    if (!server) return
    const s = server
    server = null
    try {
      s.close()
    } catch (_) {}
  }

  function isRunning() {
    return !!server
  }

  return { start, stop, isRunning, buildMatches, DEFAULT_PORT }
}

module.exports = { createHindsightLocalServer, DEFAULT_PORT }
