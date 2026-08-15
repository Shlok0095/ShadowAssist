import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { BackButton } from '../components/BackButton'
import ReactMarkdown from 'react-markdown'
import type { AppSettings } from '../profileTypes'
import type { useInterviewSession } from '../useInterviewSession'
import { useAutoScrollToBottom } from '../useAutoScroll'
import { compressImageDataUrl, providerSupportsMobileVision, readFileAsDataUrl } from '../imageQuestionExtract'
import { SettingToggleRow, SESSION_SETTING_ICONS } from './settings/SettingsPrimitives'

type Session = ReturnType<typeof useInterviewSession>

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 8.5h3.2l1.1-2.1h6.4l1.1 2.1H19.5A1.5 1.5 0 0 1 21 10v8.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5V10a1.5 1.5 0 0 1 1.5-1.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="14.2" r="3.1" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19.4 13.5a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.86 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 19V6M6.5 11.5 12 6l5.5 5.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <path d="M7.2 4.4v15.2L20.6 12 7.2 4.4Z" fill="currentColor" />
    </svg>
  )
}

const markdownComponents = {
  pre({ children }: { children?: ReactNode }) {
    return (
      <div className="mobile-code-wrap">
        <pre>{children}</pre>
      </div>
    )
  },
  code({ className, children }: { className?: string; children?: ReactNode }) {
    const block = Boolean(className)
    return <code className={block ? `mobile-code-block ${className}` : 'mobile-code-inline'}>{children}</code>
  },
}

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
  const [editText, setEditText] = useState('')
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [cameraBusy, setCameraBusy] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const leaveOpenRef = useRef(false)
  const settingsOpenRef = useRef(false)
  leaveOpenRef.current = leaveOpen
  settingsOpenRef.current = settingsOpen

  const paused = session.loopPhase === 'paused'
  const showTranscriptPanel = settings.showTranscription
  const { containerRef: mainScrollRef, endRef: historyEndRef } = useAutoScrollToBottom(settings.autoScroll, [
    session.turnHistory,
    session.streamingAnswer,
    session.isGenerating,
  ])

  useEffect(() => {
    if (session.transcriptEditing) setEditText(session.transcript)
  }, [session.transcriptEditing, session.transcript])

  useEffect(() => {
    const onHardwareBack = () => {
      if (leaveOpenRef.current) {
        setLeaveOpen(false)
        return
      }
      if (settingsOpenRef.current) {
        setSettingsOpen(false)
        return
      }
      setLeaveOpen(true)
    }
    window.addEventListener('veilassist:hardware-back', onHardwareBack)
    return () => window.removeEventListener('veilassist:hardware-back', onHardwareBack)
  }, [])

  const listeningActive =
    session.loopPhase === 'listening' ||
    /listening/i.test(session.listeningStatus || '') ||
    /listening/i.test(session.statusLabel || '')

  const reconnecting = /reconnecting/i.test(session.statusLabel || '')

  const headerStatus = session.starting
    ? 'Starting'
    : paused
      ? 'Paused'
      : reconnecting
        ? 'Reconnecting'
        : session.answerFailed
          ? 'Retry needed'
          : listeningActive
            ? 'Listening'
            : 'Ready'

  const onBack = () => {
    setSettingsOpen(false)
    setLeaveOpen(true)
  }

  const onPauseToggle = () => {
    setSettingsOpen(false)
    session.pauseSession()
  }

  const onCameraPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setCameraBusy(true)
    setCameraError(null)
    try {
      if (!providerSupportsMobileVision(settings)) {
        throw new Error('Pick NVIDIA, Groq, or OpenRouter for camera.')
      }
      const dataUrl = await readFileAsDataUrl(file)
      const compact = await compressImageDataUrl(dataUrl)
      session.sendPhotoQuestion(compact)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not read image'
      setCameraError(msg)
    } finally {
      setCameraBusy(false)
    }
  }

  return (
    <div className={`mobile-interview-shell${paused ? ' is-paused' : ''}`}>
      <header className="mobile-interview-header">
        <BackButton onClick={onBack} />
        <p className="mobile-interview-header-status" role="status">
          {headerStatus}
        </p>
        <div className="mobile-interview-header-actions">
          {paused ? (
            <button
              type="button"
              className="mobile-interview-resume-btn"
              aria-label="Resume session"
              onClick={session.resumeSession}
            >
              <PlayIcon />
            </button>
          ) : (
            <button
              type="button"
              className="mobile-interview-stop-btn"
              aria-label="Pause session"
              onClick={onPauseToggle}
            >
              <span className="mobile-interview-stop-icon" />
            </button>
          )}
          <button
            type="button"
            className="mobile-home-settings"
            aria-label="Session settings"
            onClick={() => setSettingsOpen((o) => !o)}
          >
            <GearIcon />
          </button>
        </div>
      </header>

      <div className="mobile-interview-body">
        {session.error ? (
          <div className="mobile-interview-error mobile-interview-error-inline">
            <span>{session.error}</span>
            <button type="button" className="mobile-error-dismiss" onClick={() => session.clearError?.()}>
              ✕
            </button>
          </div>
        ) : null}

        {cameraError ? (
          <div className="mobile-interview-error mobile-interview-error-inline">
            <span>{cameraError}</span>
            <button type="button" className="mobile-error-dismiss" onClick={() => setCameraError(null)}>
              ✕
            </button>
          </div>
        ) : null}

        {session.answerFailed ? (
          <div className="mobile-interview-error mobile-interview-error-inline">
            <span>Answer failed.</span>
            <button type="button" className="mobile-interview-settings-link" onClick={session.retryFailedAnswer}>
              Retry
            </button>
          </div>
        ) : null}

        <main ref={mainScrollRef} className="mobile-interview-main">
          {session.turnHistory.map((turn, i) => (
            <article key={`turn-${i}-${turn.question.slice(0, 24)}`} className="mobile-interview-turn">
              <p className="mobile-interview-turn-q">{turn.question}</p>
              <div className="mobile-interview-turn-a">
                <ReactMarkdown components={markdownComponents}>{turn.answer}</ReactMarkdown>
              </div>
            </article>
          ))}

          {session.isGenerating && session.streamingQuestion ? (
            <article className="mobile-interview-turn mobile-interview-turn-live">
              <p className="mobile-interview-turn-q">{session.streamingQuestion}</p>
              <div className="mobile-interview-turn-a">
                {session.streamingAnswer ? (
                  <p className="mobile-interview-stream-text is-live">{session.streamingAnswer}</p>
                ) : (
                  <span className="mobile-interview-stream-placeholder">Composing…</span>
                )}
              </div>
            </article>
          ) : null}

          {session.isGenerating && !session.streamingQuestion ? (
            <div className="mobile-interview-generating">
              <span className="mobile-interview-spinner" />
              Generating
            </div>
          ) : null}

          <div ref={historyEndRef} />
        </main>
      </div>

      <footer className="mobile-interview-footer">
        {showTranscriptPanel ? (
          <div className={`mobile-interview-transcript-mini${transcriptOpen ? ' is-open' : ''}`}>
            <button
              type="button"
              className="mobile-transcript-toggle"
              aria-expanded={transcriptOpen}
              onClick={() => setTranscriptOpen((o) => !o)}
            >
              <span className="mobile-transcript-toggle-label">Transcription</span>
              <span className="mobile-transcript-preview">
                {session.transcript.trim() || '…'}
              </span>
              <span className="mobile-transcript-chevron" aria-hidden>
                {transcriptOpen ? '▾' : '▴'}
              </span>
            </button>
            {transcriptOpen ? (
              <div
                className="mobile-interview-transcript-expanded"
                onClick={() => {
                  if (!session.isGenerating) session.setTranscriptEditing(true)
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !session.isGenerating) session.setTranscriptEditing(true)
                }}
              >
                {session.transcriptEditing ? (
                  <textarea
                    className="mobile-interview-transcript-edit"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={() => session.setTranscriptManual(editText)}
                    rows={3}
                    aria-label="Edit transcription"
                  />
                ) : (
                  session.transcript || '…'
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mobile-interview-actions">
          <button type="button" className="mobile-interview-action-btn" onClick={session.newQuestion}>
            ↻ New Question
          </button>
          <span className="mobile-interview-action-dot" aria-hidden />
          <button type="button" className="mobile-interview-action-btn" onClick={session.assistNow}>
            ✦ Assist
          </button>
        </div>

        <div className="mobile-interview-input-bar">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="mobile-hidden-input"
            onChange={onCameraPick}
          />
          <div className="mobile-interview-composer">
            <button
              type="button"
              className={`mobile-interview-think ${session.thinkMode ? 'active' : ''}`}
              onClick={() => session.setThinkMode((t) => !t)}
            >
              Think
            </button>
            <button
              type="button"
              className="mobile-interview-camera"
              aria-label="Capture question from camera"
              disabled={cameraBusy || session.isGenerating}
              onClick={() => fileInputRef.current?.click()}
            >
              {cameraBusy ? <span className="mobile-interview-spinner" /> : <CameraIcon />}
            </button>
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
              <SendIcon />
            </button>
          </div>
        </div>
      </footer>

      {settingsOpen ? (
        <div className="mobile-sheet-root">
          <button
            type="button"
            className="mobile-interview-settings-backdrop"
            aria-label="Close settings"
            onClick={() => setSettingsOpen(false)}
          />
          <div className="mobile-interview-settings-pop" role="dialog" aria-labelledby="session-sheet-title">
            <div className="mobile-sheet-handle" aria-hidden />
            <div className="mobile-interview-settings-pop-head">
              <strong id="session-sheet-title">Session</strong>
              <button
                type="button"
                className="mobile-interview-settings-close"
                aria-label="Close"
                onClick={() => setSettingsOpen(false)}
              >
                ✕
              </button>
            </div>
            <SettingToggleRow
              icon={SESSION_SETTING_ICONS.transcription}
              label="Transcription"
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
              label="Auto-answer"
              on={settings.autoAnswer}
              onChange={(v) => onPatchSettings({ autoAnswer: v })}
            />
            <div className="mobile-interview-settings-pop-actions">
              <button
                type="button"
                className="mobile-interview-settings-link"
                onClick={() => {
                  setSettingsOpen(false)
                  onOpenSettings()
                }}
              >
                Full settings
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {leaveOpen ? (
        <div className="mobile-leave-overlay" role="dialog" aria-modal="true" aria-labelledby="leave-title">
          <button type="button" className="mobile-leave-backdrop" aria-label="Stay" onClick={() => setLeaveOpen(false)} />
          <div className="mobile-leave-sheet">
            <h2 id="leave-title" className="mobile-leave-title">
              Close Interview?
            </h2>
            <p className="mobile-leave-copy">Are you sure you want to close this interview session?</p>
            <button type="button" className="mobile-leave-stay" onClick={() => setLeaveOpen(false)}>
              Stay
            </button>
            <button
              type="button"
              className="mobile-leave-end"
              onClick={() => {
                setLeaveOpen(false)
                session.stopSession()
              }}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
