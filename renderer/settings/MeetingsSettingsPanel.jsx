// Copyright (c) 2026 VeilAssist. All rights reserved.

import React, { useState } from 'react'
import { createIpcShim } from '../shared/ipcShim'
import {
  formatDateKeyLabel,
  formatMeetingDuration,
  formatMeetingTime,
  formatMeetingWhen,
} from './settingsFormatters'
import { SectionTitle, SettingsFieldLabel, SettingsPage, ToggleSwitch } from './SettingsComponents'
import SimpleMarkdown from '../shared/SimpleMarkdown'
import MeetingDetailsModal from './MeetingDetailsModal'
import { useBrand } from '../shared/branding'

const ipc = createIpcShim()

export default function MeetingsSettingsPanel({
  googleCalendarConnectedEmail,
  googleCalendarOAuthReady,
  googleCalendarUsingEmbeddedOAuth,
  googleCalendarClientId,
  googleCalendarClientSecret,
  onGoogleCalendarClientIdChange,
  onGoogleCalendarClientSecretChange,
  onSaveGoogleCalendarOAuth,
  calendarConnectBusy,
  calendarErr,
  onConnectGoogleCalendar,
  onCancelGoogleCalendarConnect,
  onDisconnectGoogleCalendar,
  onRefreshCalendarMeetings,
  calendarEventsLoading,
  calendarRemindersEnabled,
  onCalendarRemindersEnabledChange,
  calendarReminderMinutes,
  onCalendarReminderMinutesChange,
  meetingForegroundDetectionEnabled,
  onMeetingForegroundDetectionChange,
  calendarMeetings,
  availableDateKeys,
  effectiveDateKey,
  selectedCalendarDate,
  onSelectedCalendarDateChange,
  meetingsForSelectedDate,
  meetingSessions,
  expandedMeetingId,
  onExpandedMeetingIdChange,
  onMeetingSessionsChange,
  followUpDraftEnabled = false,
}) {
  const { name } = useBrand()
  const [detailsSessionId, setDetailsSessionId] = useState(null)
  return (
    <SettingsPage
      title="Meeting"
      description="Google Calendar, meeting detection, and session recaps."
    >
      <section className="glass-panel overflow-hidden p-6">
        <SectionTitle className="text-sm">Google Calendar</SectionTitle>
        <p className="mt-1 text-[11px] text-zinc-500">
          Connect to see upcoming accepted meetings and get start-time reminders.
        </p>

        <div className="mt-4 settings-row-tile flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {googleCalendarConnectedEmail ? (
              <p className="text-sm text-gray-200">
                Connected as <span className="font-medium">{googleCalendarConnectedEmail}</span>
              </p>
            ) : (
              <p className="text-sm text-zinc-500">Not connected</p>
            )}
            {googleCalendarUsingEmbeddedOAuth && (
              <p className="mt-1 text-[10px] text-zinc-600">Using bundled OAuth credentials</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {googleCalendarConnectedEmail ? (
              <>
                <button
                  type="button"
                  onClick={() => void onRefreshCalendarMeetings()}
                  disabled={calendarEventsLoading}
                  className="btn-ghost px-3 py-1.5 text-xs"
                >
                  {calendarEventsLoading ? 'Refreshing…' : 'Refresh'}
                </button>
                <button
                  type="button"
                  onClick={() => void onDisconnectGoogleCalendar()}
                  disabled={calendarConnectBusy}
                  className="btn-ghost px-3 py-1.5 text-xs text-rose-300"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void onConnectGoogleCalendar()}
                  disabled={calendarConnectBusy}
                  className="flex items-center gap-2 rounded-lg border border-white/15 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-100 disabled:opacity-60"
                >
                  {calendarConnectBusy ? 'Connecting…' : 'Connect Google Calendar'}
                </button>
                {calendarConnectBusy && (
                  <button
                    type="button"
                    onClick={() => void onCancelGoogleCalendarConnect()}
                    className="btn-ghost px-3 py-1.5 text-xs text-amber-200"
                  >
                    Cancel
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {calendarConnectBusy && (
          <p className="mt-3 text-[11px] text-amber-200/80">Waiting for Google sign-in in your browser…</p>
        )}
        {!!calendarErr && <p className="mt-3 text-xs text-rose-300">{calendarErr}</p>}

        <div className="mt-4 settings-row-tile flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <span className="font-medium text-gray-200">Start-time reminders</span>
            <p className="mt-1 text-xs text-zinc-600">Notify before accepted meetings start.</p>
          </div>
          <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
            <ToggleSwitch checked={calendarRemindersEnabled} onChange={onCalendarRemindersEnabledChange} />
            <select
              value={String(calendarReminderMinutes)}
              onChange={(e) => onCalendarReminderMinutesChange(Math.max(0, Number(e.target.value || 0)))}
              className="input-shadow px-3 py-2 text-xs"
              disabled={!calendarRemindersEnabled}
            >
              <option value="0" className="bg-void-900">
                At start time
              </option>
              <option value="5" className="bg-void-900">
                5 min before
              </option>
              <option value="10" className="bg-void-900">
                10 min before
              </option>
              <option value="15" className="bg-void-900">
                15 min before
              </option>
            </select>
          </div>
        </div>

        <div className="mt-4 settings-row-tile flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <span className="font-medium text-gray-200">Meeting app detection</span>
            <p className="mt-1 text-xs text-zinc-600">Top-right toast when Zoom, Teams, Meet, or Webex is active (Windows).</p>
          </div>
          <ToggleSwitch checked={meetingForegroundDetectionEnabled} onChange={onMeetingForegroundDetectionChange} />
        </div>

        {!googleCalendarOAuthReady && (
          <details className="mt-4 rounded-xl border border-white/[0.06] bg-black/15 p-4">
            <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600 hover:text-zinc-400">
              Developer setup
            </summary>
            <div className="mt-3 space-y-3">
              <p className="text-[11px] text-zinc-500">
                Set <span className="font-mono">VEILASSIST_GOOGLE_CAL_CLIENT_ID</span> and{' '}
                <span className="font-mono">VEILASSIST_GOOGLE_CAL_CLIENT_SECRET</span> in your environment, or enter credentials
                below (stored encrypted).
              </p>
              <div>
                <SettingsFieldLabel>OAuth Client ID</SettingsFieldLabel>
                <input
                  type="text"
                  value={googleCalendarClientId}
                  onChange={(e) => onGoogleCalendarClientIdChange(e.target.value)}
                  placeholder="xxxx.apps.googleusercontent.com"
                  className="input-shadow w-full px-3 py-2.5 font-mono text-xs"
                />
              </div>
              <div>
                <SettingsFieldLabel>OAuth Client Secret</SettingsFieldLabel>
                <input
                  type="password"
                  value={googleCalendarClientSecret}
                  onChange={(e) => onGoogleCalendarClientSecretChange(e.target.value)}
                  placeholder="Stored encrypted on this device"
                  className="input-shadow w-full px-3 py-2.5 font-mono text-xs"
                />
              </div>
              <button type="button" onClick={() => void onSaveGoogleCalendarOAuth()} className="btn-ghost px-4 py-2 text-xs">
                Save OAuth credentials
              </button>
            </div>
          </details>
        )}

        {calendarMeetings.length > 0 && (
          <div className="mt-5 border-t border-white/[0.06] pt-5">
            <SettingsFieldLabel>Upcoming ({calendarMeetings.length})</SettingsFieldLabel>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[200px_1fr]">
              <select
                value={effectiveDateKey}
                onChange={(e) => onSelectedCalendarDateChange(e.target.value)}
                className="input-shadow w-full px-2.5 py-2 text-xs"
              >
                {availableDateKeys.map((k) => (
                  <option key={k} value={k} className="bg-void-900">
                    {formatDateKeyLabel(k)}
                  </option>
                ))}
              </select>
              <div className="space-y-2">
                {meetingsForSelectedDate.map((m) => (
                  <div key={m.id} className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
                    <div className="text-[13px] font-medium text-gray-200">{m.title}</div>
                    <div className="mt-0.5 text-[11px] text-zinc-500">
                      {formatMeetingTime(m.start)}
                      {m.end ? ` – ${formatMeetingTime(m.end)}` : ''}
                    </div>
                    {m.meetLink ? (
                      <a
                        href={m.meetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-[11px] text-accent underline"
                      >
                        Join link
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="glass-panel overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-6 py-4">
          <div>
            <SectionTitle className="text-sm">Session recaps</SectionTitle>
            <p className="mt-1 text-[11px] text-zinc-500">
              When you Stop Listen, {name} saves structured notes here (AI summary when your chat key is set).
            </p>
          </div>
          {meetingSessions.length > 0 ? (
            <button
              type="button"
              className="shrink-0 text-[11px] text-zinc-500 hover:text-red-300"
              onClick={async () => {
                if (!window.confirm('Delete all saved session recaps?')) return
                await ipc?.invoke('meeting-sessions:clear')
                onMeetingSessionsChange([])
                onExpandedMeetingIdChange(null)
              }}
            >
              Clear all
            </button>
          ) : null}
        </div>
        <div className="px-6 py-5">
          {meetingSessions.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No recaps yet. Start Listen, join a meeting, then Stop — a summary appears here.
            </p>
          ) : (
            <ul className="space-y-3">
              {meetingSessions.map((s) => {
                const open = expandedMeetingId === s.id
                const preview = (() => {
                  const lines = String(s.summary || '').split('\n').map((l) => l.trim()).filter(Boolean)
                  const body = lines.find(
                    (l) => !/^##\s/.test(l) && !/^\*\*[^*]+\*\*:?$/.test(l) && !/^-\s/.test(l),
                  )
                  return (body || lines[0] || '').replace(/^#+\s*/, '').replace(/\*\*/g, '')
                })()
                return (
                  <li key={s.id} className="settings-row-tile overflow-hidden">
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                      onClick={() => onExpandedMeetingIdChange(open ? null : s.id)}
                    >
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-gray-200">
                          {s.modeName || 'Session'}
                          <span className="ml-2 text-[11px] font-normal text-zinc-500">
                            {formatMeetingDuration(s.durationMs)}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-zinc-500">{formatMeetingWhen(s.startedAt)}</div>
                        {!open && preview ? (
                          <p className="mt-2 truncate text-[12px] text-zinc-400">{preview.replace(/^#+\s*/, '')}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-zinc-600">
                        {s.summarySource === 'llm' ? 'AI' : 'Local'}
                      </span>
                    </button>
                    {open ? (
                      <div className="border-t border-white/[0.06] px-4 py-3">
                        <div className="max-h-80 overflow-y-auto rounded-lg border border-white/[0.06] bg-black/20 p-3">
                          <SimpleMarkdown text={s.summary} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3">
                          <button
                            type="button"
                            className="text-[11px] text-accent hover:text-accent/80"
                            onClick={(ev) => {
                              ev.stopPropagation()
                              setDetailsSessionId(s.id)
                            }}
                          >
                            View details
                          </button>
                          <button
                            type="button"
                            className="text-[11px] text-zinc-400 hover:text-zinc-200"
                            onClick={async (ev) => {
                              ev.stopPropagation()
                              const r = await ipc?.invoke('meeting-sessions:export', s.id)
                              if (r?.ok && r.path) window.alert(`Exported to ${r.path}`)
                            }}
                          >
                            Export Markdown
                          </button>
                          <button
                            type="button"
                            className="text-[11px] text-red-400/90 hover:text-red-300"
                            onClick={async () => {
                              await ipc?.invoke('meeting-sessions:delete', s.id)
                              onMeetingSessionsChange(meetingSessions.filter((x) => x.id !== s.id))
                              onExpandedMeetingIdChange(null)
                            }}
                          >
                            Delete recap
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      {detailsSessionId ? (
        <MeetingDetailsModal
          sessionId={detailsSessionId}
          followUpDraftEnabled={followUpDraftEnabled}
          onClose={() => setDetailsSessionId(null)}
        />
      ) : null}
    </SettingsPage>
  )
}
