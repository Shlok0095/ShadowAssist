// Copyright (c) 2026 VeilAssist. All rights reserved.
// Optional verbose file logging — off by default (Phase 1).

const fs = require('fs')
const path = require('path')
const { app } = require('electron')

let logDir = null
let logPath = null
let enabled = false
let writeQueue = Promise.resolve()

function ensureLogDir() {
  if (logDir) return logDir
  logDir = path.join(app.getPath('userData'), 'logs')
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
  logPath = path.join(logDir, 'veilassist.log')
  return logDir
}

function getLogPath() {
  ensureLogDir()
  return logPath
}

function getLogDir() {
  return ensureLogDir()
}

function setVerboseDebugLogging(on) {
  enabled = !!on
}

function isVerboseDebugLogging() {
  return enabled
}

function appendLine(level, parts) {
  if (!enabled) return
  ensureLogDir()
  const ts = new Date().toISOString()
  const msg = parts
    .map((p) => {
      if (p instanceof Error) return p.stack || p.message
      if (typeof p === 'object') {
        try {
          return JSON.stringify(p)
        } catch {
          return String(p)
        }
      }
      return String(p)
    })
    .join(' ')
  const line = `[${ts}] [${level}] ${msg}\n`
  writeQueue = writeQueue
    .then(() => fs.promises.appendFile(logPath, line, 'utf8'))
    .catch(() => {})
}

/** @param {string} level @param {string} message */
function appendMessage(level, message) {
  if (!enabled || !message) return
  appendLine(level, [message])
}

function installConsoleTap() {
  const orig = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  }
  console.log = (...args) => {
    orig.log(...args)
    appendLine('LOG', args)
  }
  console.warn = (...args) => {
    orig.warn(...args)
    appendLine('WARN', args)
  }
  console.error = (...args) => {
    orig.error(...args)
    appendLine('ERROR', args)
  }
}

module.exports = {
  getLogPath,
  getLogDir,
  setVerboseDebugLogging,
  isVerboseDebugLogging,
  installConsoleTap,
  appendMessage,
}
