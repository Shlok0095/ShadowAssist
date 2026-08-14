import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { AppSettings } from '../profileTypes'
import type { useInterviewSession } from '../useInterviewSession'

type Session = ReturnType<typeof useInterviewSession>

function Toggle({
  on,
  onChange,
}: {
  on: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      className={`mobile-interview-toggle ${on ? 'on' : ''}`}
      aria-pressed={on}
      onClick={() => onChange(!on)}
    >
      <span className="mobile-interview-toggle-knob" />
    </button>
  )
}

export function InterviewScreen({
  session,
  settings,
  onOpenSettings,
  onPatchSettings,
  fontClass,
}: {
  session: Session
  settings: AppSettings
  onOpenSettings: () => void
  onPatchSettings: (patch: Partial<AppSettings>) => void
  fontClass: string
}) {
  const [typed, setTyped] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const showTranscriptPanel = settings.showTranscription

  return (
    <div className={`mobile-interview-root ${fontClass}`}>
      <header className="mobile-interview-header">
        <button type="button" className="mobile-interview-icon-btn" aria-label="Back" onClick={session.stopSession}>
          ←
        </button>
        <div className="mobile-interview-stop-wrap">
          <button type="button" className="mobile-interview-stop-btn" aria-label="Stop" onClick={session.stopSession}>
            <span style={{ width: 14, height: 14, background: '#f87171', borderRadius: 2 }} />
          </button>
          <span className="mobile-interview-stop-label">Stop</span>
        </div>
        <button
          type="button"
          className="mobile-interview-icon-btn"
          aria-label="Session settings"
          onClick={() => setSettingsOpen((o) => !o)}
        >
          ☰
        </button>
      </header>

      {settingsOpen ? (
        <div className="mobile-interview-settings-pop">
          <div className="mobile-settings-row">
            <span>Show Transcription</span>
            <Toggle
              on={settings.showTranscription}
              onChange={(v) => onPatchSettings({ showTranscription: v })}
            />
          </div>
          <button type="button" className="mt-2 text-xs text-blue-400" onClick={onOpenSettings}>
            Open full settings →
          </button>
          <button type="button" className="mt-2 text-xs text-white/40" onClick={() => setSettingsOpen(false)}>
            Close ✕
          </button>
        </div>
      ) : null}

      {session.error ? <div className="mobile-interview-error">{session.error}</div> : null}

      <main className="mobile-interview-main">
        {session.starting ? (
          <div className="mobile-interview-generating">
            <span className="mobile-interview-spinner" />
            Starting…
          </div>
        ) : null}

        {!session.answer && !session.isGenerating ? (
          <div>
            <h2 className="mobile-interview-hero-title">Ready to assist</h2>
            <p className="mobile-interview-hero-sub">
              Questions will be detected automatically. Tap &quot;Assist&quot; anytime for immediate help.
            </p>
          </div>
        ) : null}

        {session.answer ? (
          <div className="mobile-interview-answer">
            <ReactMarkdown>{session.answer}</ReactMarkdown>
            <div ref={session.answerEndRef} />
          </div>
        ) : null}

        {session.isGenerating ? (
          <div className="mobile-interview-generating">
            <span className="mobile-interview-spinner" />
            Generating Answer
          </div>
        ) : null}
      </main>

      {showTranscriptPanel ? (
        <div className="mobile-interview-transcript-card" style={{ margin: '0 16px 8px' }}>
          <div className="mobile-interview-transcript-head">
            <span>🎤 Transcription</span>
            <span>⌃</span>
          </div>
          <div className="mobile-interview-transcript-body">
            {session.transcript || 'Transcription will appear here…'}
          </div>
        </div>
      ) : null}

      <div className="mobile-interview-actions">
        <button type="button" className="mobile-interview-action-btn" onClick={session.newQuestion}>
          ↻ New Question
        </button>
        <button type="button" className="mobile-interview-action-btn" onClick={session.assistNow}>
          ✦ Assist
        </button>
      </div>

      <div className="mobile-interview-input-bar">
        <button
          type="button"
          className={`mobile-interview-think ${session.thinkMode ? 'active' : ''}`}
          onClick={() => session.setThinkMode((t) => !t)}
        >
          Think
        </button>
        <div className="mobile-interview-input-wrap">
          <input
            className="mobile-interview-input"
            placeholder="Ask about your interview…"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && typed.trim()) {
                session.sendTypedQuestion(typed)
                setTyped('')
              }
            }}
          />
          <button
            type="button"
            className="mobile-interview-send"
            disabled={!typed.trim() || session.isGenerating}
            aria-label="Send"
            onClick={() => {
              if (!typed.trim()) return
              session.sendTypedQuestion(typed)
              setTyped('')
            }}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
