import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { useInterviewSession } from './useInterviewSession'
import { saveJobDescription, saveResume, speechRecognitionAvailable } from './interviewTypes'
import './mobile-interview.css'

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      className={`mobile-interview-toggle ${on ? 'on' : ''}`}
      aria-pressed={on}
      aria-label={label}
      onClick={() => onChange(!on)}
    >
      <span className="mobile-interview-toggle-knob" />
    </button>
  )
}

function SetupView({
  resume,
  setResume,
  jobDescription,
  setJobDescription,
  onStart,
  speechOk,
}: {
  resume: string
  setResume: (v: string) => void
  jobDescription: string
  setJobDescription: (v: string) => void
  onStart: () => void
  speechOk: boolean
}) {
  return (
    <div className="mobile-interview-setup">
      <div className="flex items-center gap-2 mb-6">
        <img src="/logo.png" alt="VeilAssist" className="mobile-interview-logo" />
        <span className="text-sm font-semibold text-white/80">Interview</span>
      </div>
      <h1 className="mobile-interview-hero-title">Start your interview session</h1>
      <p className="mobile-interview-hero-sub">
        Paste your resume, then tap Start. VeilAssist listens on your phone, transcribes questions, and
        generates answers when you finish speaking (or tap Assist).
      </p>
      {!speechOk ? (
        <p className="mobile-interview-error" style={{ margin: '16px 0' }}>
          Use Chrome on Android for live speech. Typed questions still work from the bar below after you start.
        </p>
      ) : null}
      <label htmlFor="resume">Resume / background</label>
      <textarea
        id="resume"
        value={resume}
        onChange={(e) => setResume(e.target.value)}
        placeholder="Paste your resume or key experience bullets…"
      />
      <label htmlFor="jd">Job description (optional)</label>
      <textarea
        id="jd"
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        placeholder="Role requirements, company, stack…"
      />
      <button
        type="button"
        className="mobile-interview-primary"
        onClick={() => {
          saveResume(resume)
          saveJobDescription(jobDescription)
          onStart()
        }}
      >
        Start interview
      </button>
      <p className="mt-4 text-center text-[11px] text-white/35">
        <Link to="/download" className="text-blue-400 underline">Desktop app</Link> ·{' '}
        <Link to="/" className="text-blue-400 underline">Website</Link>
      </p>
    </div>
  )
}

export default function MobileInterviewApp() {
  const session = useInterviewSession()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const speechOk = speechRecognitionAvailable()

  useEffect(() => {
    document.documentElement.style.background = '#0a0a0b'
    return () => {
      document.documentElement.style.background = ''
    }
  }, [])

  if (session.phase === 'setup') {
    return (
      <div className="mobile-interview-root">
        <SetupView
          resume={session.resume}
          setResume={session.setResume}
          jobDescription={session.jobDescription}
          setJobDescription={session.setJobDescription}
          onStart={session.startSession}
          speechOk={speechOk}
        />
        {session.error ? <div className="mobile-interview-error">{session.error}</div> : null}
      </div>
    )
  }

  const showTranscriptPanel = session.settings.showTranscription

  return (
    <div className="mobile-interview-root">
      <header className="mobile-interview-header">
        <Link to="/app" className="mobile-interview-icon-btn" aria-label="Back to setup" onClick={() => session.stopSession()}>
          ←
        </Link>
        <div className="mobile-interview-stop-wrap">
          <button type="button" className="mobile-interview-stop-btn" aria-label="Stop session" onClick={session.stopSession}>
            <span style={{ width: 14, height: 14, background: '#f87171', borderRadius: 2 }} />
          </button>
          <span className="mobile-interview-stop-label">Stop</span>
        </div>
        <button
          type="button"
          className="mobile-interview-icon-btn"
          aria-label="Settings"
          onClick={() => setSettingsOpen((o) => !o)}
        >
          ☰
        </button>
      </header>

      {settingsOpen ? (
        <div className="mobile-interview-settings-pop">
          <div className="mobile-interview-setting-row">
            <span>Show Transcription</span>
            <Toggle
              label="Show transcription"
              on={session.settings.showTranscription}
              onChange={(v) => session.updateSettings({ showTranscription: v })}
            />
          </div>
          <div className="mobile-interview-setting-row">
            <span>Auto-scroll</span>
            <Toggle
              label="Auto-scroll"
              on={session.settings.autoScroll}
              onChange={(v) => session.updateSettings({ autoScroll: v })}
            />
          </div>
          <div className="mobile-interview-setting-row">
            <span>Auto-answer questions</span>
            <Toggle
              label="Auto-answer"
              on={session.settings.autoAnswer}
              onChange={(v) => session.updateSettings({ autoAnswer: v })}
            />
          </div>
          <button
            type="button"
            className="mt-2 text-xs text-white/40"
            onClick={() => setSettingsOpen(false)}
          >
            Close ✕
          </button>
        </div>
      ) : null}

      {session.error ? <div className="mobile-interview-error">{session.error}</div> : null}

      <main className="mobile-interview-main">
        {!session.answer && !session.isGenerating ? (
          <div>
            <h2 className="mobile-interview-hero-title">Ready to assist.</h2>
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
            {session.transcript || 'Listening… speak your interview question.'}
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
