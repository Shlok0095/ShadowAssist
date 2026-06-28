// Copyright (c) 2026 ShadowAssist. All rights reserved.

const fs = require('fs')
const path = require('path')
const { promisify } = require('util')

const readFile = promisify(fs.readFile)

const SUPPORTED_EXT = new Set(['.txt', '.md', '.pdf'])

/**
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function parsePlaybookFile(filePath) {
  const resolved = path.resolve(String(filePath || ''))
  if (!resolved || !fs.existsSync(resolved)) {
    throw new Error('File not found')
  }
  const ext = path.extname(resolved).toLowerCase()
  if (!SUPPORTED_EXT.has(ext)) {
    throw new Error(`Unsupported file type: ${ext || '(none)'}`)
  }

  if (ext === '.pdf') {
    const pdfParse = require('pdf-parse')
    const buf = await readFile(resolved)
    const data = await pdfParse(buf)
    return String(data?.text || '').trim()
  }

  const raw = await readFile(resolved, 'utf8')
  return String(raw || '').trim()
}

module.exports = { parsePlaybookFile, SUPPORTED_EXT }
