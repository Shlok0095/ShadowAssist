// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import React, { useEffect, useMemo, useRef, memo, useState } from 'react'

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

const MessageBubble = memo(function MessageBubble({ role, text }) {
  const isUser = role === 'user'
  const isError = role === 'error'
  const nodes = useMemo(() => (role === 'ai' ? parseMarkdown(text) : []), [role, text])
  const fallback = role === 'ai' && nodes.length === 0 ? text : null

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={
          isUser
            ? 'max-w-[86%] rounded-xl border border-accent/20 bg-accent/8 px-3 py-2 text-left text-[12.5px] text-gray-100'
            : isError
              ? 'w-full rounded-xl border border-rose-500/25 bg-rose-500/8 px-3 py-2.5 text-left text-[12.5px] text-rose-200'
              : 'w-full text-left text-[12.5px] text-gray-200'
        }
      >
        {role === 'ai' ? (
          fallback ? (
            <p className="leading-[1.65]" dangerouslySetInnerHTML={{ __html: renderInline(text) }} />
          ) : (
            <div className="space-y-1.5 text-left text-gray-200 [&_p]:leading-[1.65] [&_li]:leading-relaxed">
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
        ) : (
          <span className="whitespace-pre-wrap text-[13px] leading-relaxed">{text}</span>
        )}
      </div>
    </div>
  )
})

/**
 * Stream shell in React; live text is updated via refs (direct DOM) from App — O(1) per batch, no React re-render per token.
 * The streamTextRef div uses whitespace-pre-wrap so inline markdown (bold, code, bullets) renders
 * as the App injects tokens directly via innerHTML.
 */
function StreamDomMount({ streamTextRef, streamPulseRef, isThinking }) {
  if (!isThinking) return null
  return (
    <div className="w-full min-h-[2.75rem] rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3 text-left [contain:layout]">
      <div ref={streamPulseRef} className="flex items-center gap-1.5 pb-1.5 text-accent/80">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent/80" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent/60 delay-75" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent/40 delay-150" />
      </div>
      <div
        ref={streamTextRef}
        className="stream-text min-h-[1em] text-left text-[13px] leading-relaxed text-gray-200"
        style={{ whiteSpace: 'pre-wrap' }}
      />
    </div>
  )
}

/** Match onScroll “stick to bottom” tolerance */
const FOLLOW_BOTTOM_PX = 56

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
  { messages, isThinking, streamTextRef, streamPulseRef, fontSize, activeAskSource = null },
  ref,
) {
  const scrollRef = useRef(null)
  const autoScroll = useRef(true)
  const scrollKickRef = useRef(null)
  /** Last content height when we synced — scroll advances only by new pixels (response-sized steps) */
  const lastScrollHeightRef = useRef(0)

  const turns = useMemo(() => {
    const raw = groupMessagesIntoTurns(messages)
    return raw.map((t) => ({
      ...t,
      /** Prefer assistant/error — set by main from the real request payload. */
      askSource: t.replies.find((r) => r.askSource)?.askSource || t.user?.askSource || null,
    }))
  }, [messages])
  const hasActiveReply = !!isThinking

  useEffect(() => {
    if (scrollKickRef.current != null) cancelAnimationFrame(scrollKickRef.current)
    scrollKickRef.current = requestAnimationFrame(() => {
      scrollKickRef.current = null
      const el = scrollRef.current
      if (!el) return

      const sh = el.scrollHeight
      const ch = el.clientHeight
      const max = Math.max(0, sh - ch)
      const distFromBottom = sh - el.scrollTop - ch

      if (!autoScroll.current) {
        lastScrollHeightRef.current = sh
        return
      }

      if (messages.length === 0 && !isThinking) {
        lastScrollHeightRef.current = sh
        el.scrollTop = 0
        return
      }

      const prevSh = lastScrollHeightRef.current
      const growth = prevSh > 0 ? sh - prevSh : sh

      if (prevSh === 0) {
        el.scrollTop = max
        lastScrollHeightRef.current = el.scrollHeight
        return
      }

      const wasFollowing = distFromBottom <= growth + FOLLOW_BOTTOM_PX
      if (growth > 0 && wasFollowing) {
        el.scrollTop = Math.min(el.scrollTop + growth, max)
      } else if (growth <= 0 && distFromBottom <= FOLLOW_BOTTOM_PX) {
        el.scrollTop = max
      }

      lastScrollHeightRef.current = el.scrollHeight
    })
    return () => {
      if (scrollKickRef.current != null) {
        cancelAnimationFrame(scrollKickRef.current)
        scrollKickRef.current = null
      }
    }
  }, [isThinking, messages])

  return (
    <div
      ref={(r) => {
        scrollRef.current = r
        if (typeof ref === 'function') ref(r)
        else if (ref) ref.current = r
      }}
      className="response-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden"
      style={{ fontSize: fontSize === 'large' ? 14 : fontSize === 'small' ? 12 : 13 }}
      onScroll={() => {
        if (!scrollRef.current) return
        autoScroll.current =
          scrollRef.current.scrollHeight - scrollRef.current.scrollTop - scrollRef.current.clientHeight < 50
      }}
    >
      <div className="flex w-full flex-1 flex-col px-3 pb-2 pt-3">
        {messages.length === 0 && !isThinking && (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center text-gray-500">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              </svg>
            </div>
            <p className="text-sm font-medium">Press Listen or Ctrl+Enter</p>
            <p className="mt-1 text-xs opacity-80">I&apos;ll whisper answers in your ear</p>
          </div>
        )}

        <div className="mx-auto w-full max-w-full">
          {turns.map((turn, idx) => {
            const last = idx === turns.length - 1
            const hasAssistantDone = turn.replies.some((r) => r.role === 'ai' || r.role === 'error')
            const highlightLatest = last && hasAssistantDone && !hasActiveReply
            const ribbonSource =
              last && hasActiveReply ? (activeAskSource ?? turn.askSource) : turn.askSource
            return (
              <div key={turn.id} className={idx > 0 ? 'mt-8 pt-8 border-t border-white/[0.06]' : ''}>
                {/* Exchange label */}
                <div className="mb-3 flex items-center gap-2">
                  <span className={`text-[10px] font-medium ${highlightLatest ? 'text-accent/80' : 'text-zinc-600'}`}>
                    {highlightLatest ? 'Latest reply' : `Exchange ${idx + 1}`}
                  </span>
                  {ribbonSource && (
                    <>
                      <span className="h-px flex-1 bg-white/[0.05]" />
                      <span className="text-[10px] text-zinc-700">{labelForAskSource(ribbonSource)}</span>
                    </>
                  )}
                </div>

                <div className="space-y-4">
                  {turn.user && (
                    <div>
                      <p className="mb-1 text-[10px] text-zinc-600">You</p>
                      <MessageBubble role="user" text={turn.user.text} />
                    </div>
                  )}
                  {turn.heard && (
                    <div>
                      <p className="mb-1 text-[10px] text-zinc-600">Question</p>
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-300">
                        {turn.heard.text}
                      </p>
                    </div>
                  )}
                  {turn.replies.length > 0 && (
                    <div>
                      <p className="mb-2 text-[10px] text-accent/70">Answer</p>
                      <div className="space-y-2">
                        {turn.replies.map((m) => (
                          <MessageBubble key={m.id} role={m.role} text={m.text} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {hasActiveReply && (
          <div className={`mx-auto w-full max-w-full ${messages.length > 0 ? 'mt-8 pt-8 border-t border-white/[0.06]' : 'mt-2'}`}>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[10px] text-accent/80">Answering…</span>
              {activeAskSource && (
                <>
                  <span className="h-px flex-1 bg-white/[0.05]" />
                  <span className="text-[10px] text-zinc-700">{labelForAskSource(activeAskSource)}</span>
                </>
              )}
            </div>
            {isThinking ? (
              <StreamDomMount streamTextRef={streamTextRef} streamPulseRef={streamPulseRef} isThinking={isThinking} />
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
})

const ResponsePanel = memo(ResponsePanelInner)
export default ResponsePanel
