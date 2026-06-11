// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import React, { useCallback, useEffect, useMemo, useRef, memo, useState } from 'react'
import { createIpcShim } from '../../shared/ipcShim'

const panelIpc = createIpcShim()

/** User / heard transcript / assistant replies grouped into exchanges. */
function groupMessagesIntoTurns(list) {
  const turns = []
  let turn = { user: null, heard: null, replies: [], id: 't0' }
  let tid = 0
  for (const m of list) {
    if (m.role === 'user') {
      if (turn.user != null || turn.heard != null || turn.replies.length > 0) {
        turns.push(turn)
        tid += 1
        turn = { user: null, heard: null, replies: [], id: `t${tid}` }
      }
      turn.user = m
    } else if (m.role === 'heard') {
      if (turn.replies.length > 0) {
        turns.push(turn)
        tid += 1
        turn = { user: null, heard: null, replies: [], id: `t${tid}` }
      }
      if (turn.heard != null) {
        turns.push(turn)
        tid += 1
        turn = { user: null, heard: null, replies: [], id: `t${tid}` }
      }
      turn.heard = m
    } else if (m.role === 'ai' || m.role === 'error') {
      turn.replies.push(m)
    }
  }
  if (turn.user != null || turn.heard != null || turn.replies.length > 0) turns.push(turn)
  return turns
}
import hljs from './hljsRegister'
import 'highlight.js/styles/tokyo-night-dark.min.css'

const LANG_MAP = {
  js: 'javascript',
  javascript: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  jsx: 'javascript',
  py: 'python',
  python: 'python',
  rb: 'ruby',
  rs: 'rust',
  go: 'go',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  cpp: 'cpp',
  cxx: 'cpp',
  cc: 'cpp',
  h: 'cpp',
  cs: 'csharp',
  c: 'c',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  shell: 'bash',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  sql: 'sql',
  html: 'xml',
  xml: 'xml',
  css: 'css',
  scss: 'scss',
  md: 'markdown',
  plaintext: 'plaintext',
  text: 'plaintext',
}

function normalizeLang(l) {
  const k = (l || '').toLowerCase().trim()
  return LANG_MAP[k] || k || 'plaintext'
}

/**
 * Parse markdown into structured nodes.
 * Supported: fenced code blocks, h1/h2/h3, ul with indented sub-bullets,
 * ol with indented sub-items, horizontal rules (---), blockquotes (>), paragraphs.
 * Unclosed ``` at EOF still yields a code block (for streaming).
 */
function parseMarkdown(text) {
  const lines = text.split('\n')
  const out = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (/^```(\w*)/.test(line)) {
      const lang = line.slice(3).trim()
      const block = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        block.push(lines[i])
        i++
      }
      if (i < lines.length) i++
      out.push({ type: 'code', lang, content: block.join('\n') })
      continue
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line)) {
      out.push({ type: 'hr' })
      i++
      continue
    }

    // Headings
    if (/^###\s+(.+)$/.test(line)) { out.push({ type: 'h3', content: RegExp.$1 }); i++; continue }
    if (/^##\s+(.+)$/.test(line))  { out.push({ type: 'h2', content: RegExp.$1 }); i++; continue }
    if (/^#\s+(.+)$/.test(line))   { out.push({ type: 'h1', content: RegExp.$1 }); i++; continue }

    // Blockquote
    if (/^>\s?(.*)$/.test(line)) {
      const items = []
      while (i < lines.length && /^>\s?(.*)$/.test(lines[i])) {
        items.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      out.push({ type: 'blockquote', items })
      continue
    }

    // Unordered list (top-level "-" or "*"), supporting indented sub-bullets ("  -")
    if (/^[-*]\s+(.+)$/.test(line)) {
      const items = []
      while (i < lines.length) {
        const l = lines[i]
        if (/^[-*]\s+(.+)$/.test(l)) {
          const text = RegExp.$1
          const subs = []
          i++
          while (i < lines.length && /^[ \t]{2,}[-*]\s+(.+)$/.test(lines[i])) {
            subs.push(lines[i].replace(/^[ \t]+[-*]\s+/, ''))
            i++
          }
          items.push({ text, subs })
        } else {
          break
        }
      }
      out.push({ type: 'ul', items })
      continue
    }

    // Ordered list
    if (/^\d+\.\s+(.+)$/.test(line)) {
      const items = []
      while (i < lines.length) {
        const l = lines[i]
        if (/^\d+\.\s+(.+)$/.test(l)) {
          const text = RegExp.$1
          const subs = []
          i++
          while (i < lines.length && /^[ \t]{2,}[-*]\s+(.+)$/.test(lines[i])) {
            subs.push(lines[i].replace(/^[ \t]+[-*]\s+/, ''))
            i++
          }
          items.push({ text, subs })
        } else {
          break
        }
      }
      out.push({ type: 'ol', items })
      continue
    }

    if (line.trim()) {
      out.push({ type: 'p', content: line })
    }
    i++
  }
  return out
}

/** Takeaway block: 2–3 sentences or a short paragraph (not a single clipped line). */
function takeawayFromText(text) {
  const t = String(text || '')
    .trim()
    .replace(/^\*\*Takeaway:\*\*\s*/i, '')
    .trim()
  if (!t) return ''
  if (t.length <= 320) return t
  const sentences = t.split(/(?<=[.!?।])\s+/).filter(Boolean)
  if (sentences.length >= 2) return sentences.slice(0, 3).join(' ')
  return `${t.slice(0, 300).trim()}…`
}

/** Split parsed nodes: takeaway + prose + always-visible code + collapsible lists only. */
function partitionForBrief(nodes) {
  let takeaway = ''
  const prose = []
  const code = []
  const details = []
  let afterDetailsMarker = false

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    if (n.type === 'code') {
      code.push(n)
      continue
    }
    if (n.type === 'h2' && /takeaway/i.test(n.content)) {
      const chunks = []
      i++
      while (i < nodes.length && (nodes[i].type === 'p' || nodes[i].type === 'blockquote')) {
        chunks.push(String(nodes[i].content || '').trim())
        i++
      }
      i--
      takeaway = takeawayFromText(chunks.join(' '))
      continue
    }
    if ((n.type === 'h2' && /details/i.test(n.content)) || n.type === 'hr') {
      afterDetailsMarker = true
      continue
    }
    if (n.type === 'ul' || n.type === 'ol') {
      if (afterDetailsMarker) details.push(n)
      else prose.push(n)
      continue
    }
    if (!takeaway && n.type === 'p') {
      const stripped = String(n.content || '')
        .trim()
        .replace(/^\*\*Takeaway:\*\*\s*/i, '')
        .trim()
      takeaway = takeawayFromText(stripped)
      continue
    }
    if (n.type === 'p' || n.type === 'blockquote') prose.push(n)
    else if (n.type === 'h1' || n.type === 'h2' || n.type === 'h3') {
      if (!/details/i.test(n.content)) prose.push(n)
    }
  }

  if (!takeaway && prose.length) {
    const first = prose[0]
    if (first?.type === 'p') {
      takeaway = takeawayFromText(first.content)
      prose.shift()
    }
  }

  return { takeaway, prose, code, details }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderInline(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-100">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em class="italic text-gray-300">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-white/10 px-1 py-0.5 text-[0.85em] text-accent-light/90 font-mono">$1</code>')
}

function CodeBlock({ lang, content, suppressHighlight }) {
  const [copied, setCopied] = useState(false)
  const copiedTimerRef = useRef(null)

  useEffect(() => () => {
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
  }, [])

  const html = useMemo(() => {
    if (suppressHighlight || !content) return ''
    const l = normalizeLang(lang)
    try {
      if (l !== 'plaintext' && hljs.getLanguage(l)) {
        return hljs.highlight(content, { language: l, ignoreIllegals: true }).value
      }
    } catch (_) {}
    return escapeHtml(content)
  }, [content, lang, suppressHighlight])

  const copy = () => {
    if (window.shadowAPI) window.shadowAPI.invoke('clipboard-write-text', content)
    else void navigator.clipboard?.writeText(content)
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    setCopied(true)
    copiedTimerRef.current = setTimeout(() => {
      copiedTimerRef.current = null
      setCopied(false)
    }, 2000)
  }

  return (
    <div className="my-3 w-full overflow-hidden rounded-xl border border-accent/15 bg-[#0d1117]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-black/30 px-3 py-1.5">
        <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-accent-mid/90">
          {normalizeLang(lang) || 'code'}
        </span>
        <button
          type="button"
          onClick={copy}
          className={`min-w-[3.25rem] cursor-default text-right text-[10px] font-medium transition-colors ${
            copied ? 'text-accent-light' : 'text-accent-mid/90 hover:text-accent-light'
          }`}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre
        className="code-scroll-x max-w-full overflow-x-auto p-3 font-mono text-[12.5px] leading-[1.65]"
        style={{ tabSize: 2 }}
      >
        {html ? (
          <code className="hljs !bg-transparent block text-left" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <code className="block whitespace-pre text-gray-300">{content}</code>
        )}
      </pre>
    </div>
  )
}

function MarkdownNodes({ nodes, proseClass = '' }) {
  return (
    <div className={`space-y-1.5 text-left text-gray-200 [&_p]:leading-[1.65] [&_li]:leading-relaxed ${proseClass}`}>
      {nodes.map((n, i) => {
                if (n.type === 'code') return <CodeBlock key={i} lang={n.lang} content={n.content} />
                if (n.type === 'hr') return <hr key={i} className="my-3 border-white/10" />
                if (n.type === 'h1')
                  return (
                    <h1
                      key={i}
                      className="mb-1.5 mt-3 border-b border-white/10 pb-1 text-base font-bold text-gray-50 first:mt-0"
                      dangerouslySetInnerHTML={{ __html: renderInline(n.content) }}
                    />
                  )
                if (n.type === 'h2')
                  return (
                    <h2
                      key={i}
                      className="mb-1 mt-2 text-sm font-bold text-gray-100 first:mt-0"
                      dangerouslySetInnerHTML={{ __html: renderInline(n.content) }}
                    />
                  )
                if (n.type === 'h3')
                  return (
                    <h3
                      key={i}
                      className="mb-0.5 mt-2 text-[13px] font-semibold text-accent-mid first:mt-0"
                      dangerouslySetInnerHTML={{ __html: renderInline(n.content) }}
                    />
                  )
                if (n.type === 'blockquote')
                  return (
                    <blockquote key={i} className="my-1.5 border-l-2 border-accent/40 pl-3 text-[13px] text-gray-400 italic">
                      {n.items.map((x, j) => (
                        <p key={j} dangerouslySetInnerHTML={{ __html: renderInline(x) }} />
                      ))}
                    </blockquote>
                  )
                if (n.type === 'ul')
                  return (
                    <ul key={i} className="my-1.5 space-y-1 pl-4">
                      {n.items.map((item, j) => (
                        <li key={j} className="flex flex-col gap-0.5">
                          <span className="flex gap-1.5">
                            <span className="mt-[0.4em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
                            <span dangerouslySetInnerHTML={{ __html: renderInline(item.text) }} />
                          </span>
                          {item.subs?.length > 0 && (
                            <ul className="mt-0.5 space-y-0.5 pl-5">
                              {item.subs.map((s, k) => (
                                <li key={k} className="flex gap-1.5 text-[12px] text-gray-400">
                                  <span className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full bg-white/20" />
                                  <span dangerouslySetInnerHTML={{ __html: renderInline(s) }} />
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  )
                if (n.type === 'ol')
                  return (
                    <ol key={i} className="my-1.5 space-y-1 pl-4">
                      {n.items.map((item, j) => (
                        <li key={j} className="flex flex-col gap-0.5">
                          <span className="flex gap-1.5">
                            <span className="min-w-[1.1rem] shrink-0 text-right text-[11px] font-semibold text-accent/70">{j + 1}.</span>
                            <span dangerouslySetInnerHTML={{ __html: renderInline(item.text) }} />
                          </span>
                          {item.subs?.length > 0 && (
                            <ul className="mt-0.5 space-y-0.5 pl-7">
                              {item.subs.map((s, k) => (
                                <li key={k} className="flex gap-1.5 text-[12px] text-gray-400">
                                  <span className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full bg-white/20" />
                                  <span dangerouslySetInnerHTML={{ __html: renderInline(s) }} />
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ol>
                  )
        return <p key={i} className="text-[13px] leading-[1.65]" dangerouslySetInnerHTML={{ __html: renderInline(n.content) }} />
      })}
    </div>
  )
}

function copyText(text) {
  const t = String(text || '').trim()
  if (!t) return
  if (window.shadowAPI) void window.shadowAPI.invoke('clipboard-write-text', t)
  else void navigator.clipboard?.writeText(t)
}

const BriefAnswer = memo(function BriefAnswer({ text, teleprompter = false }) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [copied, setCopied] = useState('')
  const nodes = useMemo(() => parseMarkdown(text), [text])
  const { takeaway, prose, code, details } = useMemo(() => partitionForBrief(nodes), [nodes])
  const fallback = nodes.length === 0 ? text : null
  const codeText = useMemo(() => code.map((c) => c.content).join('\n\n'), [code])
  const tp = teleprompter

  const doCopy = (label, value) => {
    copyText(value)
    setCopied(label)
    window.setTimeout(() => setCopied(''), 2000)
  }

  if (fallback) {
    return (
      <p
        className={tp ? 'text-[17px] leading-[1.85] text-gray-50' : 'text-[15px] leading-[1.8] text-gray-100'}
        dangerouslySetInnerHTML={{ __html: renderInline(text) }}
      />
    )
  }

  return (
    <div className={`mx-auto w-full space-y-4 text-left ${tp ? 'max-w-[46rem]' : 'max-w-[44rem]'}`}>
      {takeaway ? (
        <div className="rounded-xl border border-accent/15 bg-accent/[0.06] px-3.5 py-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-accent/70">Takeaway</p>
            <button
              type="button"
              onClick={() => doCopy('takeaway', takeaway)}
              className="text-[10px] font-medium text-accent/80 hover:text-accent-light"
            >
              {copied === 'takeaway' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p
            className={`font-medium leading-[1.65] text-gray-50 ${tp ? 'text-[17px]' : 'text-[15px]'}`}
            dangerouslySetInnerHTML={{ __html: renderInline(takeaway) }}
          />
        </div>
      ) : null}
      {prose.length > 0 ? (
        <div className={`space-y-3 text-gray-200 ${tp ? 'text-[16px] leading-[1.85]' : 'text-[15px] leading-[1.8]'}`}>
          <MarkdownNodes
            nodes={prose}
            proseClass={
              tp
                ? '[&_p]:text-[16px] [&_p]:leading-[1.85] [&_p]:text-gray-100'
                : '[&_p]:text-[15px] [&_p]:leading-[1.8] [&_p]:text-gray-200'
            }
          />
        </div>
      ) : null}
      {code.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Solution</p>
            <button
              type="button"
              onClick={() => doCopy('code', codeText)}
              className="text-[10px] font-medium text-accent/80 hover:text-accent-light"
            >
              {copied === 'code' ? 'Copied' : 'Copy code'}
            </button>
          </div>
          <MarkdownNodes nodes={code} />
        </div>
      ) : null}
      {details.length > 0 ? (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setDetailsOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-left text-[11px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-zinc-200"
          >
            <span>{detailsOpen ? 'Hide lists & steps' : 'Show lists & steps'}</span>
            <span className="text-zinc-600">{detailsOpen ? '▲' : '▼'}</span>
          </button>
          {detailsOpen ? (
            <div className="mt-2 border-t border-white/[0.06] pt-2">
              <MarkdownNodes nodes={details} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
})

const ErrorBubble = memo(function ErrorBubble({ text, onRetry }) {
  return (
    <div className="w-full rounded-xl border border-rose-500/25 bg-rose-500/8 px-3.5 py-3">
      <p className="text-[13px] leading-relaxed text-rose-200">{text}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2.5 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-[11px] font-medium text-rose-200 hover:bg-rose-500/20"
        >
          Try again
        </button>
      ) : null}
    </div>
  )
})

const MessageBubble = memo(function MessageBubble({
  role,
  text,
  answerStyle = 'brief',
  teleprompter = false,
  onRetry,
  animateIn = false,
}) {
  const isUser = role === 'user'
  const isError = role === 'error'
  const nodes = useMemo(() => (role === 'ai' ? parseMarkdown(text) : []), [role, text])
  const fallback = role === 'ai' && nodes.length === 0 ? text : null
  const isBriefAi = role === 'ai' && answerStyle === 'brief'

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={
          isUser
            ? 'max-w-[86%] rounded-xl border border-accent/20 bg-accent/8 px-3 py-2 text-left text-[12.5px] text-gray-100'
            : isError
              ? 'w-full text-left'
              : isBriefAi
                ? `w-full text-left ${animateIn ? 'animate-answer-in' : ''}`
                : `w-full text-left text-[12.5px] text-gray-200 ${animateIn ? 'animate-answer-in' : ''}`
        }
      >
        {role === 'error' ? (
          <ErrorBubble text={text} onRetry={onRetry} />
        ) : role === 'ai' ? (
          isBriefAi ? (
            <BriefAnswer text={text} teleprompter={teleprompter} />
          ) : fallback ? (
            <p className="leading-[1.65]" dangerouslySetInnerHTML={{ __html: renderInline(text) }} />
          ) : (
            <MarkdownNodes nodes={nodes} />
          )
        ) : (
          <span className="whitespace-pre-wrap text-[13px] leading-relaxed">{text}</span>
        )}
      </div>
    </div>
  )
})

/** Brief mode: calm shell — no raw token stream on screen. */
function ComposingShell({ onAbort, teleprompter = false }) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), 2200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className={`mx-auto w-full min-h-[7rem] rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-5 ${
        teleprompter ? 'max-w-[46rem]' : 'max-w-[44rem]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-accent/85">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent/80" />
          <span className={`font-medium ${teleprompter ? 'text-[15px]' : 'text-[13px]'}`}>
            {slow ? 'Still composing…' : 'Composing answer…'}
          </span>
        </div>
        {onAbort ? (
          <button
            type="button"
            onClick={onAbort}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200"
          >
            Stop
          </button>
        ) : null}
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-zinc-500">
        Your answer will appear fully formatted when ready — no raw draft on screen.
      </p>
    </div>
  )
}

/** Detailed mode: throttled markdown preview while generating. */
function DetailedStreamPreview({ streamPreview, onAbort, teleprompter = false }) {
  const nodes = useMemo(() => parseMarkdown(streamPreview || ''), [streamPreview])
  const hasPreview = nodes.length > 0

  if (!hasPreview) return <ComposingShell onAbort={onAbort} teleprompter={teleprompter} />

  return (
    <div className={`mx-auto w-full space-y-2 ${teleprompter ? 'max-w-[46rem]' : 'max-w-[44rem]'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-accent/75">Draft preview</span>
        {onAbort ? (
          <button
            type="button"
            onClick={onAbort}
            className="rounded-lg border border-white/10 px-2 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-300"
          >
            Stop
          </button>
        ) : null}
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 opacity-90">
        <MarkdownNodes nodes={nodes} />
      </div>
    </div>
  )
}

function AnswerActionsRow({ onFollowUp, disabled }) {
  if (!onFollowUp) return null
  const btn =
    'rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200 disabled:opacity-40'
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      <button type="button" disabled={disabled} className={btn} onClick={() => onFollowUp('shorter')}>
        Shorter
      </button>
      <button type="button" disabled={disabled} className={btn} onClick={() => onFollowUp('deeper')}>
        Deeper
      </button>
      <button type="button" disabled={disabled} className={btn} onClick={() => onFollowUp('regenerate')}>
        Regenerate
      </button>
    </div>
  )
}

function AnswerPanelToolbar({ answerStyle, overlayAnswerView, onViewChange }) {
  const setView = (v) => {
    onViewChange?.(v)
    void panelIpc?.invoke('set-store', 'overlayAnswerView', v)
  }
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
      <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
        {[
          { id: 'latest', label: 'Latest' },
          { id: 'history', label: 'History' },
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setView(opt.id)}
            className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors ${
              overlayAnswerView === opt.id
                ? 'bg-accent/15 text-accent-light'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <span className="text-[10px] text-zinc-600">
        {answerStyle === 'brief' ? 'Brief · summary layout' : 'Detailed · full markdown'}
      </span>
    </div>
  )
}

const ASK_SOURCE_LABEL = {
  prompt: 'Typed prompt',
  prompt_audio: 'Typed prompt + session audio',
  prompt_screen: 'Typed prompt + screen / vision',
  prompt_audio_screen: 'Typed prompt + audio + screen',
  audio: 'Session / microphone audio',
  audio_screen: 'Audio + screen / vision',
  screen: 'Screen text / vision (no audio in request)',
  context: 'Resume · JD · playbooks only',
}

function labelForAskSource(s) {
  if (!s) return 'Assistant'
  return ASK_SOURCE_LABEL[s] || 'Assistant'
}

const ResponsePanelInner = React.forwardRef(function ResponsePanel(
  {
    messages,
    isThinking,
    streamTextRef,
    streamPulseRef,
    fontSize,
    answerStyle = 'brief',
    overlayAnswerView = 'latest',
    overlayTeleprompter = false,
    streamPreview = '',
    activeAskSource = null,
    sessionOn = false,
    onAbort,
    onFollowUp,
    onRetry,
  },
  ref,
) {
  const scrollRef = useRef(null)
  const answerAnchorRef = useRef(null)
  const scrollKickRef = useRef(null)
  /** While generating, keep viewport pinned to answer top unless user scrolls away. */
  const pinAnswerTopRef = useRef(false)
  const userScrolledRef = useRef(false)

  const turns = useMemo(() => {
    const raw = groupMessagesIntoTurns(messages)
    return raw.map((t) => ({
      ...t,
      /** Prefer assistant/error — set by main from the real request payload. */
      askSource: t.replies.find((r) => r.askSource)?.askSource || t.user?.askSource || null,
    }))
  }, [messages])
  const hasActiveReply = !!isThinking
  const [answerView, setAnswerView] = useState(overlayAnswerView)
  useEffect(() => {
    setAnswerView(overlayAnswerView === 'history' ? 'history' : 'latest')
  }, [overlayAnswerView])

  const visibleTurns = useMemo(() => {
    if (answerView !== 'latest' || turns.length === 0) return turns
    return [turns[turns.length - 1]]
  }, [turns, answerView])

  useEffect(() => {
    if (isThinking) {
      pinAnswerTopRef.current = true
      userScrolledRef.current = false
    }
  }, [isThinking])

  const scrollAnswerToTop = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    if (answerView === 'latest') {
      el.scrollTop = 0
      return
    }
    answerAnchorRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' })
  }, [answerView])

  useEffect(() => {
    if (scrollKickRef.current != null) cancelAnimationFrame(scrollKickRef.current)
    scrollKickRef.current = requestAnimationFrame(() => {
      scrollKickRef.current = null
      if (messages.length === 0 && !isThinking) {
        if (scrollRef.current) scrollRef.current.scrollTop = 0
        return
      }
      if (pinAnswerTopRef.current && !userScrolledRef.current) {
        scrollAnswerToTop()
      }
    })
    return () => {
      if (scrollKickRef.current != null) {
        cancelAnimationFrame(scrollKickRef.current)
        scrollKickRef.current = null
      }
    }
  }, [isThinking, messages, streamPreview, scrollAnswerToTop])

  return (
    <div
      ref={(r) => {
        scrollRef.current = r
        if (typeof ref === 'function') ref(r)
        else if (ref) ref.current = r
      }}
      className="response-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden"
      style={{
        fontSize: overlayTeleprompter
          ? fontSize === 'large'
            ? 16
            : fontSize === 'small'
              ? 14
              : 15
          : fontSize === 'large'
            ? 14
            : fontSize === 'small'
              ? 12
              : 13,
      }}
      onScroll={() => {
        if (!scrollRef.current || !pinAnswerTopRef.current) return
        if (scrollRef.current.scrollTop > 24) userScrolledRef.current = true
      }}
    >
      <div className="flex w-full flex-1 flex-col px-3 pb-2 pt-3">
        {(messages.length > 0 || isThinking) && !overlayTeleprompter && (
          <AnswerPanelToolbar
            answerStyle={answerStyle}
            overlayAnswerView={answerView}
            onViewChange={setAnswerView}
          />
        )}
        {messages.length === 0 && !isThinking && (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center text-gray-500">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              </svg>
            </div>
            <p className="text-sm font-medium">Start Listen, then ask for help</p>
            <p className="mt-2 max-w-[18rem] text-xs leading-relaxed opacity-90">
              <strong className="font-medium text-zinc-400">Ctrl+Enter</strong> — help from screen or audio
              <br />
              <strong className="font-medium text-zinc-400">Enter</strong> in the box — read screen
              <br />
              Type a question for a direct answer
            </p>
            {!sessionOn && (
              <p className="mt-3 text-[11px] text-zinc-600">Turn on Listen in the bar above to capture meeting audio.</p>
            )}
          </div>
        )}

        <div ref={answerAnchorRef} className="mx-auto w-full max-w-full">
          {visibleTurns.map((turn, idx) => {
            const isLatestTurn = turn.id === turns[turns.length - 1]?.id
            const hasAssistantDone = turn.replies.some((r) => r.role === 'ai' || r.role === 'error')
            const highlightLatest = isLatestTurn && hasAssistantDone && !hasActiveReply
            const ribbonSource =
              isLatestTurn && hasActiveReply ? (activeAskSource ?? turn.askSource) : turn.askSource
            const exchangeNum = turns.findIndex((t) => t.id === turn.id) + 1
            return (
              <div key={turn.id} className={idx > 0 ? 'mt-8 pt-8 border-t border-white/[0.06]' : ''}>
                {!overlayTeleprompter && (
                  <div className="mb-3 flex items-center gap-2">
                    <span className={`text-[10px] font-medium ${highlightLatest ? 'text-accent/80' : 'text-zinc-600'}`}>
                      {highlightLatest ? 'Latest reply' : answerView === 'history' ? `Exchange ${exchangeNum}` : 'Current'}
                    </span>
                    {ribbonSource && (
                      <>
                        <span className="h-px flex-1 bg-white/[0.05]" />
                        <span className="text-[10px] text-zinc-700">{labelForAskSource(ribbonSource)}</span>
                      </>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  {turn.user && !overlayTeleprompter && (
                    <div>
                      <p className="mb-1 text-[10px] text-zinc-600">You</p>
                      <MessageBubble role="user" text={turn.user.text} />
                    </div>
                  )}
                  {turn.heard && !overlayTeleprompter && (
                    <div>
                      <p className="mb-1 text-[10px] text-zinc-600">Question</p>
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-300">
                        {turn.heard.text}
                      </p>
                    </div>
                  )}
                  {turn.replies.length > 0 && (
                    <div>
                      {!overlayTeleprompter && <p className="mb-2 text-[10px] text-accent/70">Answer</p>}
                      <div className="space-y-2">
                        {turn.replies.map((m) => (
                          <MessageBubble
                            key={m.id}
                            role={m.role}
                            text={m.text}
                            answerStyle={answerStyle}
                            teleprompter={overlayTeleprompter}
                            onRetry={m.role === 'error' ? onRetry : undefined}
                            animateIn={m.role === 'ai' && isLatestTurn}
                          />
                        ))}
                      </div>
                      {isLatestTurn &&
                        turn.replies.some((r) => r.role === 'ai') &&
                        !hasActiveReply && (
                          <AnswerActionsRow onFollowUp={onFollowUp} disabled={!!isThinking} />
                        )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {hasActiveReply && isThinking && (
          <div className={`mx-auto w-full max-w-full ${messages.length > 0 ? 'mt-6 pt-6 border-t border-white/[0.06]' : 'mt-2'}`}>
            {!overlayTeleprompter && activeAskSource && (
              <p className="mb-2 text-[10px] text-zinc-600">{labelForAskSource(activeAskSource)}</p>
            )}
            {answerStyle === 'brief' ? (
              <ComposingShell onAbort={onAbort} teleprompter={overlayTeleprompter} />
            ) : (
              <DetailedStreamPreview
                streamPreview={streamPreview}
                onAbort={onAbort}
                teleprompter={overlayTeleprompter}
              />
            )}
            {/* Hidden refs kept for App stream lifecycle compatibility */}
            <div ref={streamTextRef} className="hidden" aria-hidden />
            <div ref={streamPulseRef} className="hidden" aria-hidden />
          </div>
        )}
      </div>
    </div>
  )
})

const ResponsePanel = memo(ResponsePanelInner)
export default ResponsePanel
