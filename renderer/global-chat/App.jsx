// Copyright (c) 2026 VeilAssist. All rights reserved.
// Phase 8 — standalone chat window (long threads without the floating overlay).

import React, { useEffect, useRef, useState } from 'react'
import { createIpcShim } from '../shared/ipcShim'
import brandLogo from '../shared/brandLogo'
import SimpleMarkdown from '../shared/SimpleMarkdown'
import { applyUiAccentTheme, normalizeUiAccentId } from '../shared/uiAccentThemes'

const ipc = createIpcShim()

export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const streamRef = useRef('')
  const listRef = useRef(null)

  useEffect(() => {
    ipc?.invoke('get-store', 'uiAccentTheme').then((id) => {
      applyUiAccentTheme(document.documentElement, normalizeUiAccentId(id))
    })
  }, [])

  useEffect(() => {
    if (!ipc) return
    const onStart = () => {
      streamRef.current = ''
      setMessages((prev) => {
        if (prev.some((m) => m.streaming)) return prev
        return [...prev, { role: 'assistant', text: '', id: `a-${Date.now()}`, streaming: true }]
      })
    }
    const onToken = (_, token) => {
      streamRef.current += token || ''
      const chunk = streamRef.current
      setMessages((prev) => {
        const next = [...prev]
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].role === 'assistant' && next[i].streaming) {
            next[i] = { ...next[i], text: chunk }
            break
          }
        }
        return next
      })
    }
    const onThinking = (_, v) => {
      setThinking(!!v)
      if (!v) onDone()
    }
    const onDone = () => {
      streamRef.current = ''
      setMessages((prev) =>
        prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)),
      )
    }
    const onError = (_, msg) => {
      setMessages((prev) => [
        ...prev.filter((m) => !m.streaming),
        { role: 'assistant', text: String(msg || 'Request failed'), id: `err-${Date.now()}`, error: true },
      ])
      setThinking(false)
    }
    const onAccent = (_, id) => applyUiAccentTheme(document.documentElement, normalizeUiAccentId(id))

    ipc.on('ai-start', onStart)
    ipc.on('ai-token', onToken)
    ipc.on('ai-thinking', onThinking)
    ipc.on('ai-aborted', onDone)
    ipc.on('ai-no-output', onDone)
    ipc.on('ai-error', onError)
    ipc.on('ui-accent-update', onAccent)

    return () => {
      ;['ai-start', 'ai-token', 'ai-thinking', 'ai-aborted', 'ai-no-output', 'ai-error', 'ui-accent-update'].forEach(
        (ch) => ipc.removeAllListeners(ch),
      )
    }
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  async function submit(e) {
    e?.preventDefault?.()
    const q = input.trim()
    if (!q || thinking) return
    setInput('')
    setThinking(true)
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: q, id: `u-${Date.now()}` },
      { role: 'assistant', text: '', id: `a-${Date.now()}`, streaming: true },
    ])
    await ipc?.invoke('ask-ai-with-transcript', q, '', {
      source: 'global_chat',
      noScreen: true,
      promptSummary: { hasTypedQuestion: true },
    })
  }

  return (
    <div className="gc-shell">
      <header className="gc-head">
        <div className="gc-head-title">
          <img src={brandLogo} alt="" className="gc-brand-logo" draggable={false} />
          <div>
            <h1 className="gc-title">Global Chat</h1>
            <p className="gc-sub">Text-only threads — no screen capture from this window.</p>
          </div>
        </div>
        <button
          type="button"
          className="gc-clear"
          onClick={() => {
            setMessages([])
            streamRef.current = ''
          }}
        >
          Clear
        </button>
      </header>

      <div ref={listRef} className="gc-list">
        {!messages.length ? (
          <p className="gc-empty">Ask anything — answers use your profile, memory, and AI provider settings.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`gc-msg gc-msg-${m.role}${m.error ? ' gc-msg-error' : ''}`}>
              <div className="gc-msg-label">{m.role === 'user' ? 'You' : 'Assistant'}</div>
              {m.role === 'assistant' ? (
                <SimpleMarkdown text={m.text || (m.streaming ? '…' : '')} />
              ) : (
                <p className="gc-msg-text">{m.text}</p>
              )}
            </div>
          ))
        )}
        {thinking && !messages.some((m) => m.streaming) ? (
          <p className="gc-thinking">Thinking…</p>
        ) : null}
      </div>

      <form className="gc-form" onSubmit={submit}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a question…"
          rows={2}
          className="gc-input"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void submit()
            }
          }}
        />
        <button type="submit" className="gc-send" disabled={thinking || !input.trim()}>
          Send
        </button>
      </form>

      <style>{`
        :root {
          --accent-rgb: 59 130 246;
          color-scheme: dark;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: "Segoe UI", system-ui, sans-serif;
          background: #0a0a0b;
          color: #fafafa;
        }
        .gc-shell {
          display: flex;
          flex-direction: column;
          height: 100vh;
          padding: 16px;
          gap: 12px;
        }
        .gc-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding-bottom: 12px;
        }
        .gc-head-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .gc-brand-logo {
          height: 28px;
          width: auto;
          display: block;
          object-fit: contain;
          flex-shrink: 0;
        }
        .gc-title { margin: 0; font-size: 18px; font-weight: 600; }
        .gc-sub { margin: 4px 0 0; font-size: 12px; color: #a1a1aa; }
        .gc-clear {
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.04);
          color: #e4e4e7;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
        }
        .gc-list {
          flex: 1;
          overflow: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-right: 4px;
        }
        .gc-empty, .gc-thinking {
          margin: 0;
          font-size: 13px;
          color: #71717a;
          line-height: 1.5;
        }
        .gc-msg {
          border-radius: 12px;
          padding: 10px 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .gc-msg-user {
          border-color: rgba(var(--accent-rgb), 0.25);
          background: rgba(var(--accent-rgb), 0.08);
        }
        .gc-msg-error { border-color: rgba(248,113,113,0.35); }
        .gc-msg-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #71717a;
          margin-bottom: 6px;
        }
        .gc-msg-text { margin: 0; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
        .gc-form {
          display: flex;
          gap: 8px;
          align-items: flex-end;
          border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: 12px;
        }
        .gc-input {
          flex: 1;
          resize: none;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.35);
          color: #fafafa;
          padding: 10px 12px;
          font-size: 14px;
          font-family: inherit;
        }
        .gc-send {
          border: none;
          border-radius: 10px;
          background: rgb(var(--accent-rgb));
          color: #fff;
          font-weight: 600;
          padding: 10px 16px;
          cursor: pointer;
        }
        .gc-send:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
