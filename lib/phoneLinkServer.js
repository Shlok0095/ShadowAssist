// Copyright (c) 2026 VeilAssist. All rights reserved.
// Phase 10 — LAN HTTP + SSE server for Phone Link companion (Android / iOS browser).

const http = require('http')
const fs = require('fs')
const path = require('path')
const { buildCompanionHtml } = require('./phoneLink/companionHtml')

const LOGO_PATH = path.join(__dirname, '..', 'logo.png')

const DEFAULT_PORT = 8787
const COMPANION_HTML = buildCompanionHtml()

/**
 * @param {object} opts
 * @param {number} [opts.port]
 * @param {() => string} opts.getPairingToken
 * @param {() => object} opts.getState
 * @param {(token: string) => void} [opts.onClientPaired]
 * @param {(pcm: Buffer) => void} [opts.onMicChunk]
 * @param {() => void} [opts.onMicSpeechEnded]
 * @param {() => boolean} [opts.isMicAllowed]
 */
function createPhoneLinkServer({
  port = DEFAULT_PORT,
  getPairingToken,
  getState,
  onClientPaired,
  onMicChunk,
  onMicSpeechEnded,
  isMicAllowed,
}) {
  /** @type {import('http').Server | null} */
  let server = null
  /** @type {Set<import('http').ServerResponse>} */
  const sseClients = new Set()
  /** @type {Set<string>} */
  const pairedTokens = new Set()

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

  function tokenOk(raw) {
    const token = String(raw || '').trim()
    const expected = String(getPairingToken() || '').trim()
    return token && expected && token === expected
  }

  function broadcast(state) {
    const payload = `data: ${JSON.stringify(state)}\n\n`
    for (const res of sseClients) {
      try {
        res.write(payload)
        if (typeof res.flush === 'function') res.flush()
      } catch (_) {
        sseClients.delete(res)
      }
    }
  }

  async function start() {
    if (server) return { ok: true, port, running: true }

    server = http.createServer(async (req, res) => {
      try {
        const url = String(req.url || '').split('?')[0]

        if (req.method === 'GET' && (url === '/' || url === '/companion')) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
          res.end(COMPANION_HTML)
          return
        }

        if (req.method === 'GET' && url === '/logo.png') {
          try {
            const buf = fs.readFileSync(LOGO_PATH)
            res.writeHead(200, {
              'Content-Type': 'image/png',
              'Cache-Control': 'public, max-age=86400',
            })
            res.end(buf)
          } catch (_) {
            res.writeHead(404)
            res.end()
          }
          return
        }

        if (req.method === 'GET' && url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true, service: 'veilassist-phone-link' }))
          return
        }

        if (req.method === 'POST' && url === '/api/pair') {
          const body = await readJsonBody(req)
          if (!tokenOk(body?.token)) {
            res.writeHead(401, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'invalid token' }))
            return
          }
          pairedTokens.add(String(body.token).trim())
          try {
            onClientPaired?.(String(body.token).trim())
          } catch (_) {}
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true, state: getState() }))
          return
        }

        if (req.method === 'GET' && url === '/api/state') {
          const q = new URL(req.url, 'http://local').searchParams
          if (!tokenOk(q.get('t') || q.get('token'))) {
            res.writeHead(401, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'invalid token' }))
            return
          }
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(getState()))
          return
        }

        if (req.method === 'GET' && url === '/api/events') {
          const q = new URL(req.url, 'http://local').searchParams
          const t = q.get('t') || q.get('token')
          if (!tokenOk(t)) {
            res.writeHead(401, { 'Content-Type': 'text/plain' })
            res.end('unauthorized')
            return
          }
          pairedTokens.add(String(t).trim())
          res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
          })
          res.write(`: connected\n\n`)
          res.write(`data: ${JSON.stringify(getState())}\n\n`)
          if (typeof res.flush === 'function') res.flush()
          sseClients.add(res)
          req.on('close', () => {
            sseClients.delete(res)
          })
          return
        }

        if (req.method === 'POST' && url === '/api/mic-chunk') {
          const body = await readJsonBody(req)
          if (!tokenOk(body?.token)) {
            res.writeHead(401, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'invalid token' }))
            return
          }
          if (typeof isMicAllowed === 'function' && !isMicAllowed()) {
            res.writeHead(403, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'remote mic disabled or session inactive' }))
            return
          }
          const raw = String(body?.pcm || '').trim()
          if (!raw) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'pcm required' }))
            return
          }
          try {
            onMicChunk?.(Buffer.from(raw, 'base64'))
          } catch (_) {}
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true }))
          return
        }

        if (req.method === 'POST' && url === '/api/mic-speech-ended') {
          const body = await readJsonBody(req)
          if (!tokenOk(body?.token)) {
            res.writeHead(401, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'invalid token' }))
            return
          }
          if (typeof isMicAllowed === 'function' && !isMicAllowed()) {
            res.writeHead(403, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'remote mic disabled or session inactive' }))
            return
          }
          try {
            onMicSpeechEnded?.()
          } catch (_) {}
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true }))
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
      server.listen(port, '0.0.0.0', resolve)
    })

    return { ok: true, port, running: true }
  }

  function stop() {
    for (const res of sseClients) {
      try {
        res.end()
      } catch (_) {}
    }
    sseClients.clear()
    pairedTokens.clear()
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

  function getConnectedCount() {
    return sseClients.size
  }

  function invalidatePairings() {
    pairedTokens.clear()
    for (const res of sseClients) {
      try {
        res.end()
      } catch (_) {}
    }
    sseClients.clear()
  }

  return {
    start,
    stop,
    isRunning,
    broadcast,
    getConnectedCount,
    invalidatePairings,
    DEFAULT_PORT,
  }
}

module.exports = { createPhoneLinkServer, DEFAULT_PORT }
