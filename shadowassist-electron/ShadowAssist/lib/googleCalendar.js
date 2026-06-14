// Copyright (c) 2026 VeilAssist. All rights reserved.
// Google Calendar OAuth + accepted-events fetch.

const crypto = require('crypto')
const http = require('http')
const { URL, URLSearchParams } = require('url')
const { shell } = require('electron')

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
const GOOGLE_CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
const GOOGLE_SCOPE_CALENDAR_READONLY = 'https://www.googleapis.com/auth/calendar.readonly'
const GOOGLE_SCOPE_EMAIL = 'https://www.googleapis.com/auth/userinfo.email'

const OAUTH_TIMEOUT_MS = 2 * 60 * 1000
const TOKEN_REFRESH_GRACE_MS = 60 * 1000
let activeOauthSession = null

function randomState() {
  return crypto.randomBytes(16).toString('hex')
}

function nowMs() {
  return Date.now()
}

function parseJsonSafe(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function postForm(url, formData) {
  const body = new URLSearchParams(formData)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  })
  const raw = await res.text()
  const json = parseJsonSafe(raw)
  if (!res.ok) {
    throw new Error(json?.error_description || json?.error || `HTTP ${res.status}`)
  }
  return json
}

async function fetchJson(url, accessToken) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const raw = await res.text()
  const json = parseJsonSafe(raw)
  if (!res.ok) {
    throw new Error(json?.error?.message || json?.error || `HTTP ${res.status}`)
  }
  return json
}

function validateClientConfig(clientId, clientSecret) {
  const id = String(clientId || '').trim()
  const sec = String(clientSecret || '').trim()
  if (!id || !sec) throw new Error('Missing Google Calendar client credentials')
  return { id, sec }
}

function resolveOAuthClientConfig(storeGet) {
  const envId = String(process.env.VeilAssist_GOOGLE_CAL_CLIENT_ID || '').trim()
  const envSecret = String(process.env.VeilAssist_GOOGLE_CAL_CLIENT_SECRET || '').trim()
  const storeId = String(storeGet('googleCalendarClientId') || '').trim()
  const storeSecret = String(storeGet('googleCalendarClientSecret') || '').trim()
  const id = envId || storeId
  const sec = envSecret || storeSecret
  const oauthReady = !!(id && sec)
  return { id, sec, oauthReady, usingEmbeddedOAuth: !!(envId && envSecret) }
}

function createAuthUrl(clientId, redirectUri, state) {
  const u = new URL(GOOGLE_AUTH_URL)
  u.searchParams.set('client_id', clientId)
  u.searchParams.set('redirect_uri', redirectUri)
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('scope', `${GOOGLE_SCOPE_CALENDAR_READONLY} ${GOOGLE_SCOPE_EMAIL}`)
  u.searchParams.set('access_type', 'offline')
  u.searchParams.set('prompt', 'consent')
  u.searchParams.set('state', state)
  return u.toString()
}

function buildUpcomingEventsUrl() {
  const u = new URL(GOOGLE_CALENDAR_EVENTS_URL)
  u.searchParams.set('singleEvents', 'true')
  u.searchParams.set('orderBy', 'startTime')
  u.searchParams.set('timeMin', new Date().toISOString())
  u.searchParams.set('maxResults', '25')
  return u.toString()
}

function normalizeCalendarEvents(items, connectedEmail) {
  const me = String(connectedEmail || '').trim().toLowerCase()
  const out = []
  for (const ev of Array.isArray(items) ? items : []) {
    if (!ev || ev.status === 'cancelled') continue
    const attendees = Array.isArray(ev.attendees) ? ev.attendees : []
    const selfAttendee = attendees.find((a) => a?.self === true)
    const byEmail = me ? attendees.find((a) => String(a?.email || '').toLowerCase() === me) : null
    const organizerSelf = ev?.organizer?.self === true
    const response = String(selfAttendee?.responseStatus || byEmail?.responseStatus || '').toLowerCase()
    const accepted = organizerSelf || response === 'accepted'
    if (!accepted) continue

    const startIso = ev?.start?.dateTime || ev?.start?.date || ''
    const endIso = ev?.end?.dateTime || ev?.end?.date || ''
    const conference = Array.isArray(ev?.conferenceData?.entryPoints)
      ? ev.conferenceData.entryPoints.find((p) => p?.entryPointType === 'video')?.uri || ''
      : ''

    out.push({
      id: String(ev.id || ''),
      title: String(ev.summary || 'Untitled meeting'),
      description: String(ev.description || ''),
      start: String(startIso || ''),
      end: String(endIso || ''),
      location: String(ev.location || ''),
      organizer: String(ev?.organizer?.email || ev?.organizer?.displayName || ''),
      meetLink: String(ev.hangoutLink || conference || ''),
      acceptedResponse: response || (organizerSelf ? 'organizer' : ''),
    })
  }
  return out
}

async function refreshAccessTokenIfNeeded(storeGet, storeSet) {
  const access = String(storeGet('googleCalendarAccessToken') || '').trim()
  const refresh = String(storeGet('googleCalendarRefreshToken') || '').trim()
  const { id: clientId, sec: clientSecret } = resolveOAuthClientConfig(storeGet)
  const expires = Number(storeGet('googleCalendarTokenExpiry') || 0)
  if (!refresh || !clientId || !clientSecret) throw new Error('Google Calendar is not connected')

  const stillValid = access && expires > nowMs() + TOKEN_REFRESH_GRACE_MS
  if (stillValid) return access

  const tok = await postForm(GOOGLE_TOKEN_URL, {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refresh,
  })
  const nextAccess = String(tok?.access_token || '').trim()
  const expiresIn = Number(tok?.expires_in || 3600)
  if (!nextAccess) throw new Error('Google token refresh failed')
  storeSet('googleCalendarAccessToken', nextAccess)
  storeSet('googleCalendarTokenExpiry', nowMs() + expiresIn * 1000)
  return nextAccess
}

function getConnectionStatus(storeGet) {
  const { id: clientId, sec: clientSecret, oauthReady, usingEmbeddedOAuth } = resolveOAuthClientConfig(storeGet)
  const refresh = String(storeGet('googleCalendarRefreshToken') || '').trim()
  return {
    connected: !!(clientId && clientSecret && refresh),
    connectedEmail: String(storeGet('googleCalendarConnectedEmail') || '').trim(),
    oauthReady,
    usingEmbeddedOAuth,
  }
}

function disconnectGoogleCalendar(storeSet) {
  storeSet('googleCalendarAccessToken', '')
  storeSet('googleCalendarRefreshToken', '')
  storeSet('googleCalendarTokenExpiry', 0)
  storeSet('googleCalendarConnectedEmail', '')
}

async function completeGoogleOAuthWithLoopback(storeGet, storeSet) {
  if (activeOauthSession) {
    throw new Error('A Google Calendar sign-in is already in progress')
  }
  try {
    const cfg = resolveOAuthClientConfig(storeGet)
    const { id: clientId, sec: clientSecret } = validateClientConfig(cfg.id, cfg.sec)

    const state = randomState()
    const { code, redirectUri } = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const u = new URL(req.url || '/', 'http://127.0.0.1')
        if (u.pathname !== '/google-calendar/callback') {
          res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
          res.end('Not Found')
          return
        }
        const incomingState = String(u.searchParams.get('state') || '')
        const incomingCode = String(u.searchParams.get('code') || '')
        const err = String(u.searchParams.get('error') || '')
        if (err) {
          res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
          res.end('<h3>Google sign-in cancelled. You can close this tab.</h3>')
          if (err === 'access_denied') {
            reject(new Error('Google blocked this account. Add it as a Test user in OAuth consent screen or publish the app to Production.'))
            return
          }
          reject(new Error(err))
          return
        }
        if (!incomingCode || incomingState !== state) {
          res.writeHead(400, { 'content-type': 'text/html; charset=utf-8' })
          res.end('<h3>Invalid OAuth callback. You can close this tab.</h3>')
          reject(new Error('Invalid OAuth callback'))
          return
        }
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        res.end('<h3>Google Calendar connected. You can close this tab.</h3>')
        resolve({ code: incomingCode, redirectUri: activeRedirectUri })
      } catch (e) {
        reject(e)
      }
    })

    let done = false
    let activeRedirectUri = ''
    const finish = (fn) => (value) => {
      if (done) return
      done = true
      clearTimeout(timer)
      try {
        server.close()
      } catch {}
      fn(value)
    }
    const timer = setTimeout(
      () => finish(reject)(new Error('Google sign-in timed out. If Google showed a 403 screen, this email is not an approved tester yet.')),
      OAUTH_TIMEOUT_MS,
    )
    server.on('error', finish(reject))
    activeOauthSession = {
      cancel: () => {
        finish(reject)(new Error('Google sign-in cancelled from VeilAssist.'))
      },
    }
    server.listen(0, '127.0.0.1', async () => {
      try {
        const addr = server.address()
        const port = Number(addr && typeof addr === 'object' ? addr.port : 0)
        if (!port) throw new Error('Failed to bind OAuth callback port')
        activeRedirectUri = `http://127.0.0.1:${port}/google-calendar/callback`
        const authUrl = createAuthUrl(clientId, activeRedirectUri, state)
        await shell.openExternal(authUrl)
      } catch (e) {
        finish(reject)(e)
      }
    })

    resolve = finish(resolve)
    reject = finish(reject)
    })

    const tok = await postForm(GOOGLE_TOKEN_URL, {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    })

    const accessToken = String(tok?.access_token || '').trim()
    const refreshToken = String(tok?.refresh_token || '').trim()
    const expiresIn = Number(tok?.expires_in || 3600)
    if (!accessToken || !refreshToken) {
      throw new Error('Google OAuth did not return refresh/access token')
    }

    // Best-effort account email. Calendar sync itself does not depend on this call.
    let email = ''
    try {
      const userInfo = await fetchJson(GOOGLE_USERINFO_URL, accessToken)
      email = String(userInfo?.email || '').trim()
    } catch {
      email = String(storeGet('googleCalendarConnectedEmail') || '').trim()
    }

    storeSet('googleCalendarAccessToken', accessToken)
    storeSet('googleCalendarRefreshToken', refreshToken)
    storeSet('googleCalendarTokenExpiry', nowMs() + expiresIn * 1000)
    storeSet('googleCalendarConnectedEmail', email)

    return { connected: true, connectedEmail: email }
  } finally {
    activeOauthSession = null
  }
}

async function listUpcomingAcceptedMeetings(storeGet, storeSet) {
  const access = await refreshAccessTokenIfNeeded(storeGet, storeSet)
  const json = await fetchJson(buildUpcomingEventsUrl(), access)
  const connectedEmail = String(storeGet('googleCalendarConnectedEmail') || '').trim()
  const meetings = normalizeCalendarEvents(json?.items, connectedEmail)
  return { meetings }
}

function cancelGoogleOAuthInProgress() {
  if (!activeOauthSession?.cancel) return { cancelled: false }
  activeOauthSession.cancel()
  return { cancelled: true }
}

module.exports = {
  getConnectionStatus,
  disconnectGoogleCalendar,
  completeGoogleOAuthWithLoopback,
  listUpcomingAcceptedMeetings,
  cancelGoogleOAuthInProgress,
}
