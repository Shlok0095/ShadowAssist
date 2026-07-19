// Copyright (c) 2026 VeilAssist. All rights reserved.
// Phase 10 — Phone Link orchestration (companion screen + optional remote mic).

const crypto = require('crypto')
const os = require('os')
const { createPhoneLinkServer, DEFAULT_PORT } = require('./phoneLinkServer')

const TRANSCRIPT_MAX = 4000
const AI_TEXT_MAX = 12000

function getLanAddresses() {
  const out = []
  try {
    const nets = os.networkInterfaces()
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net && net.family === 'IPv4' && !net.internal && net.address) {
          out.push(net.address)
        }
      }
    }
  } catch (_) {}
  return [...new Set(out)]
}

function buildCompanionUrls(port, token) {
  const t = encodeURIComponent(String(token || '').trim())
  return getLanAddresses().map((ip) => `http://${ip}:${port}/?t=${t}`)
}

/**
 * @param {object} deps
 * @param {(key: string) => any} deps.storeGet
 * @param {(key: string, value: any) => void} deps.storeSet
 * @param {(pcm: Buffer) => void} [deps.onMicChunk]
 * @param {() => void} [deps.onMicSpeechEnded]
 * @param {() => boolean} [deps.isMicAllowed]
 */
function createPhoneLinkManager({
  storeGet,
  storeSet,
  onMicChunk,
  onMicSpeechEnded,
  isMicAllowed,
}) {
  /** @type {ReturnType<createPhoneLinkServer> | null} */
  let linkServer = null
  let aiBuffer = ''
  let revCounter = 0

  let state = {
    sessionActive: false,
    transcript: '',
    aiText: '',
    aiThinking: false,
    updatedAt: Date.now(),
  }

  function resolvePort() {
    const n = Number(storeGet('phoneLinkPort'))
    return Number.isFinite(n) && n >= 1024 && n <= 65535 ? Math.floor(n) : DEFAULT_PORT
  }

  function ensureToken() {
    let token = String(storeGet('phoneLinkPairingToken') || '').trim()
    if (!token) token = regenerateToken()
    return token
  }

  function regenerateToken() {
    const token = crypto.randomBytes(16).toString('hex')
    storeSet('phoneLinkPairingToken', token)
    linkServer?.invalidatePairings?.()
    return token
  }

  function getState() {
    return {
      ...state,
      remoteMicEnabled: storeGet('phoneLinkRemoteMicEnabled') === true,
      updatedAt: Date.now(),
    }
  }

  function broadcastFlags() {
    linkServer?.broadcast?.(getState())
  }

  /** @param {object} partial
   *  @param {{ stream?: boolean }} [opts] — stream=true skips transcript in SSE payload for lower latency */
  function pushState(partial, opts = {}) {
    state = { ...state, ...partial, updatedAt: Date.now() }
    revCounter += 1
    const rev = revCounter
    if (opts.stream) {
      linkServer?.broadcast?.({
        rev,
        sessionActive: state.sessionActive,
        aiText: state.aiText,
        aiThinking: state.aiThinking,
        remoteMicEnabled: storeGet('phoneLinkRemoteMicEnabled') === true,
        updatedAt: state.updatedAt,
      })
      return
    }
    linkServer?.broadcast?.({ ...getState(), rev })
  }

  function appendTranscriptLine(line) {
    if (storeGet('phoneLinkEnabled') !== true) return
    if (!linkServer?.isRunning?.()) return
    const chunk = String(line || '').trim()
    if (!chunk) return
    const next = state.transcript ? `${state.transcript}\n${chunk}` : chunk
    pushState({ transcript: next.length > TRANSCRIPT_MAX ? next.slice(-TRANSCRIPT_MAX) : next })
  }

  function handleDesktopEvent(channel, ...args) {
    if (storeGet('phoneLinkEnabled') !== true) return
    if (!linkServer?.isRunning?.()) return

    switch (channel) {
      case 'session-status':
        pushState({ sessionActive: !!args[0] })
        if (!args[0]) {
          aiBuffer = ''
          pushState({ aiThinking: false })
        }
        break
      case 'ai-start':
        aiBuffer = ''
        pushState({ aiText: '', aiThinking: true })
        break
      case 'ai-token':
        aiBuffer += String(args[0] || '')
        pushState(
          {
            aiText: aiBuffer.length > AI_TEXT_MAX ? aiBuffer.slice(-AI_TEXT_MAX) : aiBuffer,
            aiThinking: true,
          },
          { stream: true },
        )
        break
      case 'ai-thinking':
        if (!args[0]) {
          pushState({
            aiThinking: false,
            aiText: aiBuffer.length > AI_TEXT_MAX ? aiBuffer.slice(-AI_TEXT_MAX) : aiBuffer,
          })
        } else {
          pushState({ aiThinking: true })
        }
        break
      case 'ai-aborted':
      case 'ai-no-output':
        aiBuffer = ''
        pushState({ aiThinking: false, aiText: '' })
        break
      case 'ai-error':
        aiBuffer = String(args[0] || 'Request failed')
        pushState({ aiThinking: false, aiText: aiBuffer })
        break
      case 'session-purge':
        pushState({ transcript: '' })
        break
      default:
        break
    }
  }

  async function start() {
    const port = resolvePort()
    const token = ensureToken()

    if (!linkServer) {
      linkServer = createPhoneLinkServer({
        port,
        getPairingToken: () => String(storeGet('phoneLinkPairingToken') || token),
        getState,
        onClientPaired: () => {
          linkServer?.broadcast?.(getState())
        },
        onMicChunk,
        onMicSpeechEnded,
        isMicAllowed,
      })
    }

    await linkServer.start()
    linkServer.broadcast(getState())

    return {
      ok: true,
      running: true,
      port,
      token,
      urls: buildCompanionUrls(port, token),
      connectedClients: linkServer.getConnectedCount(),
    }
  }

  function stop() {
    linkServer?.stop?.()
    linkServer = null
  }

  function isRunning() {
    return !!linkServer?.isRunning?.()
  }

  function getStatus() {
    const port = resolvePort()
    const token = ensureToken()
    return {
      enabled: storeGet('phoneLinkEnabled') === true,
      running: isRunning(),
      port,
      token,
      urls: buildCompanionUrls(port, token),
      connectedClients: linkServer?.getConnectedCount?.() ?? 0,
      lanAddresses: getLanAddresses(),
      remoteMicEnabled: storeGet('phoneLinkRemoteMicEnabled') === true,
      state: getState(),
    }
  }

  return {
    start,
    stop,
    isRunning,
    getStatus,
    regenerateToken,
    pushState,
    broadcastFlags,
    appendTranscriptLine,
    handleDesktopEvent,
    getLanAddresses,
    DEFAULT_PORT,
  }
}

module.exports = { createPhoneLinkManager, getLanAddresses, buildCompanionUrls, DEFAULT_PORT }
