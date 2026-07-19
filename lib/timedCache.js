// Copyright (c) 2026 VeilAssist. All rights reserved.
// Small in-memory TTL cache for hot paths (models list, context blocks, recall).

class TimedCache {
  /**
   * @param {number} [defaultTtlMs]
   * @param {number} [maxEntries]
   */
  constructor(defaultTtlMs = 60_000, maxEntries = 64) {
    this.defaultTtlMs = defaultTtlMs
    this.maxEntries = maxEntries
    /** @type {Map<string, { value: unknown, expiresAt: number }>} */
    this.map = new Map()
  }

  /** @returns {unknown|undefined} */
  get(key) {
    const entry = this.map.get(String(key))
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.map.delete(String(key))
      return undefined
    }
    return entry.value
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    const k = String(key)
    if (this.map.size >= this.maxEntries && !this.map.has(k)) {
      const oldest = this.map.keys().next().value
      if (oldest != null) this.map.delete(oldest)
    }
    this.map.set(k, { value, expiresAt: Date.now() + Math.max(100, ttlMs) })
  }

  delete(key) {
    this.map.delete(String(key))
  }

  clear() {
    this.map.clear()
  }

  /** @param {string} prefix */
  deleteByPrefix(prefix) {
    const p = String(prefix)
    for (const key of this.map.keys()) {
      if (key.startsWith(p)) this.map.delete(key)
    }
  }
}

module.exports = { TimedCache }
