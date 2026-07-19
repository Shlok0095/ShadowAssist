// Copyright (c) 2026 VeilAssist. All rights reserved.
// Persistent SQLite/sqlite-vec semantic recall over saved meeting chunks.

const fs = require('fs')
const path = require('path')
const { Worker } = require('worker_threads')
const { tokenize, searchMeetingSessions } = require('./meetingRecall')
const {
  chunkSession,
  keywordOverlapScore,
} = require('./vectorMemoryUtils')

const INDEX_VERSION = 2
const MAX_CHUNKS = 3200
const EMBED_BATCH = 6
const VECTOR_DIMENSIONS = 384
const WORKER_TIMEOUT_MS = 10_000

function embeddingToBuffer(embedding) {
  const floats = Float32Array.from(embedding)
  return Buffer.from(floats.buffer, floats.byteOffset, floats.byteLength)
}

function bufferToEmbedding(buffer) {
  if (!buffer) return []
  const source = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
  const copy = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength)
  return Array.from(new Float32Array(copy))
}

function createVectorMemoryStore({ memoryRoot, store, embedClient = null }) {
  const sqlitePath = path.join(memoryRoot, 'vector-memory.sqlite')
  const legacyPath = path.join(memoryRoot, 'vector-index.json')
  let db = null
  let nativeVec = false
  let initError = null

  function ensureRoot() {
    if (!fs.existsSync(memoryRoot)) fs.mkdirSync(memoryRoot, { recursive: true })
  }

  function openDatabase() {
    if (db) return db
    ensureRoot()
    try {
      const Database = require('better-sqlite3')
      db = new Database(sqlitePath)
      db.pragma('journal_mode = WAL')
      db.pragma('synchronous = NORMAL')
      db.exec(`
        CREATE TABLE IF NOT EXISTS memory_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS memory_chunks (
          rowid INTEGER PRIMARY KEY AUTOINCREMENT,
          id TEXT NOT NULL UNIQUE,
          session_id TEXT NOT NULL,
          mode_name TEXT NOT NULL,
          speaker TEXT NOT NULL,
          started_at INTEGER NOT NULL,
          text TEXT NOT NULL,
          token_count INTEGER NOT NULL DEFAULT 0,
          embedding BLOB
        );
        CREATE INDEX IF NOT EXISTS idx_memory_chunks_session ON memory_chunks(session_id);
        CREATE INDEX IF NOT EXISTS idx_memory_chunks_started ON memory_chunks(started_at DESC);
      `)
      try {
        const sqliteVec = require('sqlite-vec')
        sqliteVec.load(db)
        db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS vec_memory_chunks USING vec0(embedding float[${VECTOR_DIMENSIONS}])`)
        nativeVec = true
      } catch (error) {
        nativeVec = false
        console.warn('[vector-memory] sqlite-vec unavailable; worker cosine fallback active:', error?.message || error)
      }
      migrateLegacyIndex()
      return db
    } catch (error) {
      initError = error
      db = null
      console.warn('[vector-memory] SQLite unavailable:', error?.message || error)
      return null
    }
  }

  function getMeta(key) {
    const database = db || openDatabase()
    return database?.prepare('SELECT value FROM memory_meta WHERE key = ?').get(key)?.value || null
  }

  function setMeta(key, value) {
    const database = db || openDatabase()
    database?.prepare('INSERT OR REPLACE INTO memory_meta(key, value) VALUES (?, ?)').run(key, String(value))
  }

  function migrateLegacyIndex() {
    if (!db || !fs.existsSync(legacyPath)) return
    const migrated = db.prepare('SELECT value FROM memory_meta WHERE key = ?').get('legacy_json_migrated')
    if (migrated) return
    try {
      const legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'))
      const chunks = Array.isArray(legacy?.chunks) ? legacy.chunks : []
      const insert = db.prepare(`
        INSERT OR IGNORE INTO memory_chunks
          (id, session_id, mode_name, speaker, started_at, text, token_count, embedding)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const insertAll = db.transaction(() => {
        for (const chunk of chunks) {
          const embedding =
            Array.isArray(chunk?.embedding) && chunk.embedding.length
              ? embeddingToBuffer(chunk.embedding)
              : null
          insert.run(
            String(chunk?.id || `legacy-${Date.now()}-${Math.random()}`),
            String(chunk?.sessionId || 'legacy'),
            String(chunk?.modeName || 'Session'),
            'Transcript',
            Number(chunk?.startedAt) || Date.now(),
            String(chunk?.text || '').slice(0, 5000),
            Math.ceil(String(chunk?.text || '').length / 4),
            embedding,
          )
        }
      })
      insertAll()
      setMeta('legacy_json_migrated', Date.now())
      rebuildNativeIndex()
    } catch (error) {
      console.warn('[vector-memory] legacy JSON migration failed:', error?.message || error)
    }
  }

  function rebuildNativeIndex() {
    if (!db || !nativeVec) return
    try {
      db.exec('DELETE FROM vec_memory_chunks')
      const rows = db.prepare('SELECT rowid, embedding FROM memory_chunks WHERE embedding IS NOT NULL').all()
      const insert = db.prepare('INSERT INTO vec_memory_chunks(rowid, embedding) VALUES (?, ?)')
      const insertAll = db.transaction(() => {
        for (const row of rows) {
          if (row.embedding?.length === VECTOR_DIMENSIONS * 4) insert.run(BigInt(row.rowid), row.embedding)
        }
      })
      insertAll()
    } catch (error) {
      nativeVec = false
      console.warn('[vector-memory] native index rebuild failed:', error?.message || error)
    }
  }

  function isEnabled() {
    return store.get('vectorMemoryEnabled') === true
  }

  function removeSession(sessionId) {
    const database = openDatabase()
    const id = String(sessionId || '').trim()
    if (!database || !id) return
    const rowids = database.prepare('SELECT rowid FROM memory_chunks WHERE session_id = ?').all(id)
    if (nativeVec) {
      const removeVec = database.prepare('DELETE FROM vec_memory_chunks WHERE rowid = ?')
      const removeAll = database.transaction(() => {
      for (const row of rowids) removeVec.run(BigInt(row.rowid))
      })
      removeAll()
    }
    database.prepare('DELETE FROM memory_chunks WHERE session_id = ?').run(id)
  }

  async function indexSession(session) {
    const database = openDatabase()
    if (!isEnabled() || !session?.id) return { ok: false, reason: 'disabled' }
    if (!database) return { ok: false, reason: 'sqlite_unavailable', error: initError?.message }
    const sessionId = String(session.id)
    removeSession(sessionId)
    const pieces = chunkSession(session)
    if (!pieces.length) return { ok: false, reason: 'empty' }

    const rows = pieces.map((piece, index) => ({
      id: `vc-${sessionId}-${index}-${Date.now().toString(36)}`,
      sessionId,
      modeName: String(session.modeName || 'Session').slice(0, 64),
      speaker: String(piece.speaker || 'Transcript').slice(0, 64),
      startedAt: Number(piece.startedAt) || Number(session.startedAt) || Date.now(),
      text: String(piece.text || '').slice(0, 5000),
      tokenCount: Number(piece.tokenCount) || 0,
      embedding: null,
    }))

    if (embedClient) {
      try {
        for (let i = 0; i < rows.length; i += EMBED_BATCH) {
          const batch = rows.slice(i, i + EMBED_BATCH)
          const vectors = await embedClient.embedTexts(batch.map((row) => row.text))
          for (let j = 0; j < batch.length; j += 1) {
            if (Array.isArray(vectors[j]) && vectors[j].length) batch[j].embedding = vectors[j]
          }
        }
      } catch (error) {
        console.warn('[vector-memory] embedding failed; keyword fallback kept:', error?.message || error)
      }
    }

    const insert = database.prepare(`
      INSERT INTO memory_chunks
        (id, session_id, mode_name, speaker, started_at, text, token_count, embedding)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const insertVec = nativeVec
      ? database.prepare('INSERT INTO vec_memory_chunks(rowid, embedding) VALUES (?, ?)')
      : null
    const insertAll = database.transaction(() => {
      for (const row of rows) {
        const embedding = Array.isArray(row.embedding) && row.embedding.length
          ? embeddingToBuffer(row.embedding)
          : null
        const result = insert.run(
          row.id,
          row.sessionId,
          row.modeName,
          row.speaker,
          row.startedAt,
          row.text,
          row.tokenCount,
          embedding,
        )
        if (insertVec && row.embedding?.length === VECTOR_DIMENSIONS) {
          insertVec.run(BigInt(result.lastInsertRowid), embedding)
        }
      }
      const overflow = database.prepare(
        'SELECT rowid FROM memory_chunks ORDER BY started_at DESC, rowid DESC LIMIT -1 OFFSET ?',
      ).all(MAX_CHUNKS)
      const removeVec = nativeVec ? database.prepare('DELETE FROM vec_memory_chunks WHERE rowid = ?') : null
      const removeChunk = database.prepare('DELETE FROM memory_chunks WHERE rowid = ?')
      for (const old of overflow) {
        removeVec?.run(BigInt(old.rowid))
        removeChunk.run(old.rowid)
      }
    })
    insertAll()
    return {
      ok: true,
      chunks: rows.length,
      embedded: rows.filter((row) => row.embedding?.length).length,
      nativeVec,
    }
  }

  async function migrateExistingSessions(sessions) {
    if (!isEnabled()) return { ok: false, skipped: true }
    let indexed = 0
    for (const session of Array.isArray(sessions) ? sessions : []) {
      const result = await indexSession(session)
      if (result.ok) indexed += 1
    }
    return { ok: true, indexed }
  }

  function searchNative(queryEmbedding, topK) {
    if (!db || !nativeVec || queryEmbedding.length !== VECTOR_DIMENSIONS) return []
    try {
      return db.prepare(`
        SELECT rowid, distance
        FROM vec_memory_chunks
        WHERE embedding MATCH ? AND k = ?
        ORDER BY distance
      `).all(embeddingToBuffer(queryEmbedding), topK)
        .map((row) => ({ rowid: Number(row.rowid), score: Math.max(0, 1 - Number(row.distance || 0)) }))
    } catch (error) {
      console.warn('[vector-memory] native search failed; using worker fallback:', error?.message || error)
      return []
    }
  }

  function searchWorker(queryEmbedding, rows, topK) {
    return new Promise((resolve) => {
      const worker = new Worker(path.join(__dirname, 'vectorSearchWorker.js'))
      const timer = setTimeout(() => {
        worker.terminate().catch(() => {})
        resolve([])
      }, WORKER_TIMEOUT_MS)
      worker.once('message', (message) => {
        clearTimeout(timer)
        worker.terminate().catch(() => {})
        resolve(message?.ok && Array.isArray(message.results) ? message.results : [])
      })
      worker.once('error', () => {
        clearTimeout(timer)
        worker.terminate().catch(() => {})
        resolve([])
      })
      worker.postMessage({
        query: queryEmbedding,
        rows: rows.map((row) => ({ rowid: row.rowid, embedding: bufferToEmbedding(row.embedding) })),
        topK,
      })
    })
  }

  async function recall(query, opts = {}) {
    if (!isEnabled()) return []
    const database = openDatabase()
    const textQuery = String(query || '').trim()
    if (!database || !textQuery) return []
    const topK = Math.max(1, Math.min(12, opts.topK || 6))
    const timeoutMs = Math.min(5000, Math.max(100, opts.timeoutMs || 1200))
    return Promise.race([
      recallInner(textQuery, topK),
      new Promise((resolve) => setTimeout(() => resolve([]), timeoutMs)),
    ])
  }

  async function recallInner(query, topK) {
    const rows = db.prepare(
      'SELECT rowid, session_id, mode_name, speaker, started_at, text, embedding FROM memory_chunks',
    ).all()
    if (!rows.length) return []

    let queryEmbedding = []
    if (embedClient) {
      try {
        queryEmbedding = await embedClient.embedText(query)
      } catch {
        queryEmbedding = []
      }
    }
    let vectorHits = []
    if (queryEmbedding.length) {
      vectorHits = searchNative(queryEmbedding, Math.min(rows.length, topK * 3))
      if (!vectorHits.length) {
        const embeddedRows = rows.filter((row) => row.embedding)
        vectorHits = await searchWorker(queryEmbedding, embeddedRows, Math.min(embeddedRows.length, topK * 3))
      }
    }
    const vectorScores = new Map(vectorHits.map((hit) => [hit.rowid, hit.score]))
    return rows
      .map((row) => {
        const vectorScore = vectorScores.get(row.rowid) || 0
        const keywordScore = keywordOverlapScore(query, row.text)
        return {
          text: String(row.text || '').slice(0, 1800),
          score: vectorScore > 0 ? vectorScore * 2.5 + keywordScore * 0.25 : keywordScore,
          source: vectorScore > 0 ? 'sqlite_vector_memory' : 'keyword_chunk',
          sessionId: row.session_id,
          modeName: row.mode_name,
          speaker: row.speaker,
          startedAt: row.started_at,
        }
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || b.startedAt - a.startedAt)
      .slice(0, topK)
  }

  async function searchPastMeetings(query, opts = {}) {
    const textQuery = String(query || '').trim()
    if (!textQuery) return []
    const maxResults = Math.max(1, Math.min(10, opts.maxResults || 6))
    const byKey = new Map()
    const add = (hit) => {
      const text = String(hit?.text || '').trim().slice(0, 1800)
      if (!text) return
      const key = `${hit?.sessionId || ''}:${text.slice(0, 120)}`
      const previous = byKey.get(key)
      if (!previous || hit.score > previous.score) byKey.set(key, { ...hit, text })
    }
    if (isEnabled()) {
      for (const hit of await recall(textQuery, { topK: maxResults, timeoutMs: 1800 })) add(hit)
    }
    const sessions = Array.isArray(opts.meetingSessions) ? opts.meetingSessions : []
    if (sessions.length && (store.get('globalMeetingSearchEnabled') === true || isEnabled())) {
      for (const hit of searchMeetingSessions(sessions, textQuery, { maxResults: 4 })) {
        add({
          text: String(hit.summary || hit.transcriptPreview || ''),
          score: (hit.score || 0) * 1.5,
          source: 'meeting_session',
          sessionId: hit.id,
          modeName: hit.modeName,
          startedAt: hit.startedAt,
        })
      }
    }
    return [...byKey.values()].sort((a, b) => b.score - a.score).slice(0, maxResults)
  }

  function clearAll() {
    const database = openDatabase()
    if (!database) return { ok: false, error: initError?.message || 'SQLite unavailable' }
    if (nativeVec) database.exec('DELETE FROM vec_memory_chunks')
    const result = database.prepare('DELETE FROM memory_chunks').run()
    return { ok: true, removed: Number(result.changes) || 0 }
  }

  function stats() {
    const database = openDatabase()
    if (!database) {
      return {
        enabled: isEnabled(),
        storage: 'unavailable',
        nativeVec: false,
        chunks: 0,
        embedded: 0,
        error: initError?.message || 'SQLite unavailable',
      }
    }
    const counts = database.prepare(
      'SELECT COUNT(*) AS chunks, SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END) AS embedded FROM memory_chunks',
    ).get()
    return {
      enabled: isEnabled(),
      storage: 'sqlite',
      databasePath: sqlitePath,
      nativeVec,
      dimensions: VECTOR_DIMENSIONS,
      chunks: Number(counts?.chunks) || 0,
      embedded: Number(counts?.embedded) || 0,
      embeddingWorker: embedClient?.status?.() || null,
      schemaVersion: INDEX_VERSION,
      legacyMigratedAt: getMeta('legacy_json_migrated'),
    }
  }

  function close() {
    try {
      db?.close()
    } catch {}
    db = null
  }

  return {
    indexSession,
    migrateExistingSessions,
    recall,
    searchPastMeetings,
    removeSession,
    clearAll,
    stats,
    isEnabled,
    close,
  }
}

module.exports = {
  createVectorMemoryStore,
  INDEX_VERSION,
  MAX_CHUNKS,
  VECTOR_DIMENSIONS,
  embeddingToBuffer,
  bufferToEmbedding,
}
