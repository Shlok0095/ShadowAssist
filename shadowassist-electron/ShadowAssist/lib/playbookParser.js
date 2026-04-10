// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

const fs = require('fs').promises
const path = require('path')

async function extractTextFromPdf(buffer) {
  const pdfParse = require('pdf-parse')
  const data = await pdfParse(buffer)
  return data.text || ''
}

async function parsePlaybookFile(filePath, maxSizeBytes = 500 * 1024) {
  const ext = path.extname(filePath).toLowerCase()
  const stat = await fs.stat(filePath)
  if (stat.size > maxSizeBytes) throw new Error(`File too large. Max ${maxSizeBytes / 1024}KB`)
  const buffer = await fs.readFile(filePath)
  if (ext === '.pdf') return extractTextFromPdf(buffer)
  if (ext === '.txt') return buffer.toString('utf-8')
  throw new Error('Use PDF or TXT.')
}

module.exports = { parsePlaybookFile }
