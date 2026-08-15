import { useEffect, useRef, useState } from 'react'
import { BackButton } from '../components/BackButton'
import ReactMarkdown from 'react-markdown'
import type { AppSettings } from '../profileTypes'
import type { useInterviewSession } from '../useInterviewSession'
import { SettingToggleRow, SESSION_SETTING_ICONS } from './settings/SettingsPrimitives'

type Session = ReturnType<typeof useInterviewSession>

export function InterviewScreen({
  session,
  settings,
  onOpenSettings,
  onPatchSettings,
}: {
  session: Session
  settings: AppSettings
  onOpenSettings: () => void
  onPatchSettings: (patch: Partial<AppSettings>) => void
}) {
  const [typed, setTyped] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const transcriptEndRef = useRef<HTMLDivElement | null>(null)

  const showTranscriptPanel = settings.showTranscription

  useEffect(() => {
    if (!settings.autoScroll || !showTranscriptPanel) return
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [session.transcript, settings.autoScroll, showTranscriptPanel])

  return (
    <>
      <header className="mobile-interview-header">
        <BackButton onClick={session.stopSession} />
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
          <SettingToggleRow
            icon={SESSION_SETTING_ICONS.transcription}
            label="Show Transcription"
            on={settings.showTranscription}
            onChange={(v) => onPatchSettings({ showTranscription: v })}
          />
          <SettingToggleRow
            icon={SESSION_SETTING_ICONS.autoScroll}
            label="Auto-scroll"
            on={settings.autoScroll}
            onChange={(v) => onPatchSettings({ autoScroll: v })}
          />
          <SettingToggleRow
            icon={SESSION_SETTING_ICONS.autoAnswer}
            label="Auto-answer questions"
            on={settings.autoAnswer}
            onChange={(v) => onPatchSettings({ autoAnswer: v })}
          />
          <div className="mobile-interview-settings-pop-actions">
            <button type="button" className="mobile-interview-settings-link" onClick={onOpenSettings}>
              Open full settings
            </button>
            <button
              type="button"
              className="mobile-interview-settings-close"
              aria-label="Close"
              onClick={() => setSettingsOpen(false)}
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}

      {session.error ? (
        <div className="mobile-interview-error mobile-interview-error-inline">
          <span>{session.error}</span>
          <button type="button" className="mobile-error-dismiss" onClick={() => session.clearError?.()}>
            ✕
          </button>
        </div>
      ) : null}

      <main className="mobile-interview-main">
        {session.starting ? (
          <div className="mobile-interview-generating">
            <span className="mobile-interview-spinner" />
            {session.startingMessage || 'Starting…'}
          </div>
        ) : null}

        {!session.answer && !session.isGenerating && !session.starting ? (
          <div>
            <h2 className="mobile-interview-hero-title">
              {session.listeningStatus ? 'Listening…' : 'Ready to assist'}
            </h2>
            <p className="mobile-interview-hero-sub">
              Speak your interview question. Answers appear after speech is transcribed — not before.
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
            <span className="mobile-interview-transcript-status">
              {session.listeningStatus || ''}
            </span>
          </div>
          <div className="mobile-interview-transcript-body">
            {session.transcript || 'Transcription will appear here…'}
            <div ref={transcriptEndRef} />
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
    </>
  )
}
