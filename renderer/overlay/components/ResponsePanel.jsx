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

/** Parse markdown; unclosed ``` at EOF still yields a code block (for streaming). */
function parseMarkdown(text) {
  const lines = text.split('\n')
  const out = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (/^```(\w*)$/.test(line)) {
      const lang = RegExp.$1
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
    if (/^###\s+(.+)$/.test(line)) {
      out.push({ type: 'h3', content: RegExp.$1 })
      i++
      continue
    }
    if (/^##\s+(.+)$/.test(line)) {
      out.push({ type: 'h2', content: RegExp.$1 })
      i++
      continue
    }
    if (/^#\s+(.+)$/.test(line)) {
      out.push({ type: 'h1', content: RegExp.$1 })
      i++
      continue
    }
    if (/^[-*]\s+(.+)$/.test(line)) {
      const items = []
      while (i < lines.length && /^[-*]\s+(.+)$/.test(lines[i])) {
        items.push(RegExp.$1)
        i++
      }
      out.push({ type: 'ul', items })
      continue
    }
    if (/^\d+\.\s+(.+)$/.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\.\s+(.+)$/.test(lines[i])) {
        items.push(RegExp.$1)
        i++
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
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-100">$1</strong>')
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
            ? 'max-w-[88%] rounded-2xl border border-accent/30 bg-accent/12 px-3.5 py-2.5 text-left text-sm text-gray-100 shadow-sm'
            : isError
              ? 'w-full rounded-2xl border border-rose-500/35 bg-rose-500/10 px-3.5 py-2.5 text-left text-sm text-rose-200'
              : 'w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3 text-left text-sm text-gray-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
        }
      >
        {role === 'ai' ? (
          fallback ? (
            <p className="leading-[1.65]" dangerouslySetInnerHTML={{ __html: renderInline(text) }} />
          ) : (
            <div className="space-y-1.5 text-left text-gray-200 [&_p]:leading-[1.65] [&_li]:leading-relaxed">
              {nodes.map((n, i) => {
                if (n.type === 'code') return <CodeBlock key={i} lang={n.lang} content={n.content} />
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
                      className="mb-0.5 mt-2 text-sm font-semibold text-gray-200 first:mt-0"
                      dangerouslySetInnerHTML={{ __html: renderInline(n.content) }}
                    />
                  )
                if (n.type === 'ul')
                  return (
                    <ul key={i} className="my-1.5 list-disc space-y-1 pl-5 marker:text-accent/70">
                      {n.items.map((x, j) => (
                        <li key={j} dangerouslySetInnerHTML={{ __html: renderInline(x) }} />
                      ))}
                    </ul>
                  )
                if (n.type === 'ol')
                  return (
                    <ol key={i} className="my-1.5 list-decimal space-y-1 pl-5 marker:text-accent/70">
                      {n.items.map((x, j) => (
                        <li key={j} dangerouslySetInnerHTML={{ __html: renderInline(x) }} />
                      ))}
                    </ol>
                  )
                return <p key={i} className="text-[13px]" dangerouslySetInnerHTML={{ __html: renderInline(n.content) }} />
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

/** Live stream: highlight.js only after commit (MessageBubble); here plain code for smooth scroll */
function StreamingBlock({ text, isThinking }) {
  const nodes = useMemo(() => parseMarkdown(text), [text])
  const hasCode = nodes.some((n) => n.type === 'code')
  if (!text && isThinking) return null
  if (!text) return null

  if (hasCode || nodes.length > 0) {
    return (
      <div className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3 text-left text-sm text-gray-200">
        <div className="space-y-1.5 text-left">
          {nodes.map((n, i) => {
            if (n.type === 'code') return <CodeBlock key={i} lang={n.lang} content={n.content} suppressHighlight />
            if (n.type === 'h1')
              return (
                <h1 key={i} className="text-base font-bold text-gray-50" dangerouslySetInnerHTML={{ __html: renderInline(n.content) }} />
              )
            if (n.type === 'h2')
              return (
                <h2 key={i} className="text-sm font-bold text-gray-100" dangerouslySetInnerHTML={{ __html: renderInline(n.content) }} />
              )
            if (n.type === 'h3')
              return (
                <h3 key={i} className="text-sm font-semibold text-gray-200" dangerouslySetInnerHTML={{ __html: renderInline(n.content) }} />
              )
            if (n.type === 'ul')
              return (
                <ul key={i} className="list-disc space-y-1 pl-5">
                  {n.items.map((x, j) => (
                    <li key={j} dangerouslySetInnerHTML={{ __html: renderInline(x) }} />
                  ))}
                </ul>
              )
            if (n.type === 'ol')
              return (
                <ol key={i} className="list-decimal space-y-1 pl-5">
                  {n.items.map((x, j) => (
                    <li key={j} dangerouslySetInnerHTML={{ __html: renderInline(x) }} />
                  ))}
                </ol>
              )
            return <p key={i} className="whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: renderInline(n.content) }} />
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3 text-left font-mono text-[13px] leading-relaxed text-gray-200 whitespace-pre-wrap">
      {text}
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

const ResponsePanel = React.forwardRef(function ResponsePanel(
  { messages, streaming, isThinking, fontSize, activeAskSource = null },
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
  const hasActiveReply = !!(streaming || (isThinking && !streaming))

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

      if (messages.length === 0 && !streaming) {
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
  }, [streaming, messages])

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
        {messages.length === 0 && !streaming && !isThinking && (
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
              <div key={turn.id} className={idx > 0 ? 'mt-16 border-t border-dashed border-white/[0.14] pt-14' : ''}>
                <section
                  className={`rounded-2xl border px-4 py-3 ${
                    highlightLatest
                      ? 'border-accent/30 bg-zinc-950/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_0_1px_rgb(var(--accent-rgb)/0.12)]'
                      : 'border-white/[0.07] bg-black/22'
                  }`}
                >
                  <div
                    className={`mb-4 flex items-center justify-between gap-2 rounded-lg border px-3 py-2 ${
                      highlightLatest
                        ? 'border-accent/25 bg-accent/8'
                        : 'border-white/[0.07] bg-black/30'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-accent-mid/95">
                        {labelForAskSource(ribbonSource)}
                      </p>
                      <p className="mt-0.5 text-[9px] font-medium text-zinc-500">
                        {highlightLatest ? 'Latest finished reply' : `Exchange ${idx + 1}`}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-5">
                    {turn.user && (
                      <div>
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">You (typed)</p>
                        <MessageBubble role="user" text={turn.user.text} />
                      </div>
                    )}
                    {turn.heard && (
                      <div className={turn.user ? 'border-t border-white/[0.06] pt-5' : ''}>
                        <p className="text-[13px] font-medium leading-relaxed text-gray-200">Question:</p>
                        <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-gray-200">
                          {turn.heard.text}
                        </p>
                      </div>
                    )}
                    {turn.replies.length > 0 && (
                      <div className={turn.heard || turn.user ? 'border-t border-white/[0.06] pt-5' : ''}>
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-accent-mid/85">Answer</p>
                        <div className="space-y-3">
                          {turn.replies.map((m) => (
                            <MessageBubble key={m.id} role={m.role} text={m.text} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )
          })}
        </div>

        {hasActiveReply && (
          <div
            className={`mx-auto w-full max-w-full ${messages.length > 0 ? 'mt-16 border-t border-dashed border-accent/35 pt-12' : 'mt-2'}`}
          >
            <div className="mb-4 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent-mid">Answer (in progress)</p>
              {activeAskSource ? (
                <p className="mt-1 text-[10px] font-medium text-zinc-400">{labelForAskSource(activeAskSource)}</p>
              ) : null}
            </div>
            {isThinking && !streaming && (
              <div className="flex items-center gap-1.5 text-amber-400/90">
                <span className="animate-pulse">●</span>
                <span className="animate-pulse delay-75">●</span>
                <span className="animate-pulse delay-150">●</span>
              </div>
            )}
            {streaming ? (
              <div className="w-full">
                <StreamingBlock text={streaming} isThinking={isThinking} />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
})

export default ResponsePanel
