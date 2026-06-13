// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Post-OCR cleanup: strip browser chrome and extract problem/question text for LLM + UI.

const NOISE_LINE_RES = [
  /\bhttps?:\/\//i,
  /\b(chatgpt\.com|openai\.com|gmail|youtube|google|gemini|maps|prime video|claude|netflix|reddit)\b/i,
  /\b(ask gemini|ask anything|upgrade|share|transcript of|check important info)\b/i,
  /\bchatgpt can make mistakes\b/i,
  /\b\d{1,2}\s*°\s*[cf]\b/i,
  /\b(mostly cloudy|partly cloudy|sunny|clear sky)\b/i,
  /^[\s|~€@+\-[\]{}\\/*_=<>]{0,6}$/,
  /^\[\d+\]\s*$/,
  /^[QO©®™]\s*$/,
  /^\d+\s*\|\s*$/,
  /\|\s*MGmail/i,
  /^Run\s*$/,
  /^Python\s*$/,
  /^Java\s*$/,
  /^TypeScript\s*$/,
]

const PROBLEM_WORD_RE =
  /\b(design|implement|write|given|find|return|solve|explain|describe|encode|decode|algorithm|requirements?|example|input|output|constraints?|follow[\s-]?up|leetcode|complexity)\b/i

const CODE_STUB_RE =
  /^(def|class|function|public|private|static|#include|import|using|func)\b/i

const SECTION_HEADER_RE = /^(example|examples|requirements?|constraints?|input|output|note|notes|starter code)\b/i

function alphaRatio(line) {
  const s = String(line || '')
  if (!s) return 0
  const alpha = (s.match(/[a-zA-Z]/g) || []).length
  return alpha / s.length
}

function isNoiseLine(line) {
  const s = String(line || '').trim()
  if (!s) return true
  if (s.length < 3) return true
  if (NOISE_LINE_RES.some((re) => re.test(s))) return true
  if (s.length <= 8 && alphaRatio(s) < 0.5) return true
  if (alphaRatio(s) < 0.28 && s.length > 6) return true
  return false
}

function scoreLine(line) {
  const s = String(line || '').trim()
  if (!s) return -5
  let score = 0
  const words = s.split(/\s+/).filter(Boolean)
  if (words.length >= 6) score += 2
  if (words.length >= 12) score += 2
  if (s.includes('?')) score += 4
  if (PROBLEM_WORD_RE.test(s)) score += 4
  if (CODE_STUB_RE.test(s)) score += 5
  if (/^def\s+\w+\s*\(/.test(s)) score += 6
  if (/^\s*pass\s*$/.test(s)) score += 2
  if (SECTION_HEADER_RE.test(s)) score += 3
  if (/^["'[\(]/.test(s) && /["'\)\]]/.test(s)) score += 1
  if (alphaRatio(s) > 0.55) score += 1
  if (s.length > 40 && s.length < 220) score += 2
  if (/\b(tab|browser|gmail|youtube|weather)\b/i.test(s)) score -= 4
  return score
}

function pickBestBlock(scoredLines) {
  if (scoredLines.length === 0) return []
  const maxWindow = Math.min(24, scoredLines.length)
  let best = scoredLines.slice(0, Math.min(8, scoredLines.length))
  let bestSum = best.reduce((n, x) => n + x.score, 0)

  for (let start = 0; start < scoredLines.length; start++) {
    for (let size = 3; size <= maxWindow && start + size <= scoredLines.length; size++) {
      const window = scoredLines.slice(start, start + size)
      const sum = window.reduce((n, x) => n + x.score, 0)
      const avg = sum / window.length
      const weighted = sum + avg * 2
      if (weighted > bestSum) {
        bestSum = weighted
        best = window
      }
    }
  }
  return best
}

function pickQuestionLine(block) {
  if (block.length === 0) return ''
  let best = ''
  let bestScore = 0
  for (const { line, score } of block) {
    let qScore = score
    if (PROBLEM_WORD_RE.test(line)) qScore += 3
    if (/\b(design an|implement a|write a|given an|given a)\b/i.test(line)) qScore += 4
    if (line.length >= 35 && line.length <= 260) qScore += 2
    if (line.includes('?')) qScore += 2
    if (CODE_STUB_RE.test(line) && !/^def\s/.test(line)) qScore -= 2
    if (SECTION_HEADER_RE.test(line) && line.split(/\s+/).length <= 2) qScore -= 3
    if (qScore > bestScore) {
      bestScore = qScore
      best = line
    }
  }
  return best
}

function pickCodeStub(block, questionLine) {
  const lines = block.map((x) => x.line).filter((l) => l !== questionLine)
  const stubLines = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (CODE_STUB_RE.test(line) || /^def\s+\w+\s*\(/.test(line)) {
      stubLines.push(line)
      if (/:\s*$/.test(line) && i + 1 < lines.length && /^\s*pass\s*$/.test(lines[i + 1])) {
        stubLines.push(lines[i + 1])
      }
      break
    }
  }
  return stubLines.join('\n').trim()
}

function pickDetails(block, questionLine) {
  const lines = block
    .map((x) => x.line)
    .filter((l) => l && l !== questionLine)
  if (lines.length === 0) return ''
  return lines.join('\n').trim()
}

function formatPromptText({ question, details, codeStub, fallbackLines }) {
  const parts = []
  if (question) parts.push(`## QUESTION (from screen)\n${question}`)
  if (details) parts.push(`## DETAILS (from screen)\n${details}`)
  if (codeStub && !details.includes(codeStub)) {
    parts.push(`## STARTER CODE (from screen)\n${codeStub}`)
  }
  if (parts.length > 0) return parts.join('\n\n')
  if (fallbackLines.length > 0) {
    return `## SCREEN (filtered)\n${fallbackLines.slice(0, 30).join('\n')}`
  }
  return ''
}

/**
 * @param {string} raw
 * @returns {{
 *   question: string,
 *   details: string,
 *   codeStub: string,
 *   promptText: string,
 *   displayText: string,
 *   confidence: number,
 * }}
 */
export function structureScreenOcr(raw) {
  const rawText = String(raw || '').trim()
  const empty = {
    question: '',
    details: '',
    codeStub: '',
    promptText: '',
    displayText: '',
    confidence: 0,
  }
  if (!rawText) return empty

  const allLines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const filtered = allLines.filter((line) => !isNoiseLine(line))
  const scored = filtered.map((line, i) => ({ line, i, score: scoreLine(line) }))
  const block = pickBestBlock(scored)
  const question = pickQuestionLine(block)
  const codeStub = pickCodeStub(block, question)
  const details = pickDetails(block, question)

  const fallbackLines = filtered.length > 0 ? filtered : allLines.slice(0, 40)
  const promptText = formatPromptText({ question, details, codeStub, fallbackLines })

  const displayParts = [question, details !== question ? details : '', codeStub].filter(Boolean)
  const displayText = displayParts.join('\n\n').trim() || promptText

  const keptRatio = allLines.length ? filtered.length / allLines.length : 0
  const blockAvg = block.length ? block.reduce((n, x) => n + x.score, 0) / block.length : 0
  let confidence = 0
  if (question.length >= 20) confidence += 3
  if (blockAvg >= 3) confidence += 2
  if (keptRatio <= 0.85) confidence += 1
  if (codeStub) confidence += 1

  return {
    question,
    details,
    codeStub,
    promptText,
    displayText,
    confidence,
  }
}
