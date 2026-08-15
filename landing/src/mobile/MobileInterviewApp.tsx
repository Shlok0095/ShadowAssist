import { useCallback, useEffect, useRef, useState } from 'react'
import { getActiveApiKey, loadAppSettings, loadProfile, saveAppSettings, saveProfile } from './profileStorage'
import { profileIsReady, type AppSettings, type PersonalProfile } from './profileTypes'
import { sttKeyConfigured } from './sttRegistry'
import { useInterviewSession } from './useInterviewSession'
import { HomeScreen } from './screens/HomeScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { PersonalInfoScreen } from './screens/PersonalInfoScreen'
import { InterviewScreen } from './screens/InterviewScreen'
import './mobile-interview.css'

type AppScreen = 'home' | 'settings' | 'personal-info'

export default function MobileInterviewApp() {
  const [screen, setScreen] = useState<AppScreen>('home')
  const [overlayScreen, setOverlayScreen] = useState<AppScreen | null>(null)
  const [profile, setProfile] = useState<PersonalProfile>(() => loadProfile())
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings())

  const session = useInterviewSession(profile, settings)
  const restoredRef = useRef(false)

  const sessionRef = useRef(session)
  sessionRef.current = session

  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    session.restoreSessionFromSnapshot()
  }, [session.restoreSessionFromSnapshot])

  useEffect(() => {
    let remove: (() => void) | undefined
    void import('@capacitor/app')
      .then(async ({ App }) => {
        const handle = await App.addListener('backButton', () => {
          const s = sessionRef.current
          if (overlayScreen) {
            setOverlayScreen(overlayScreen === 'personal-info' ? 'settings' : null)
            return
          }
          if (s.phase === 'interview') {
            window.dispatchEvent(new Event('veilassist:hardware-back'))
            return
          }
          if (screen !== 'home') {
            setScreen(screen === 'personal-info' ? 'settings' : 'home')
            return
          }
          void App.exitApp()
        })
        remove = () => void handle.remove()
      })
      .catch(() => {
        /* web */
      })
    return () => remove?.()
  }, [overlayScreen, screen])

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      saveAppSettings(next)
      return next
    })
  }, [])

  const updateProfile = useCallback((next: PersonalProfile) => {
    setProfile(next)
    saveProfile(next)
  }, [])

  useEffect(() => {
    const bg = settings.colorScheme === 'light' ? '#f2f2f7' : '#0c0c0d'
    document.documentElement.style.background = bg
    document.documentElement.style.colorScheme = settings.colorScheme
    document.body.style.background = bg
    document.body.style.colorScheme = settings.colorScheme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
    const applyViewport = () => {
      const vv = window.visualViewport
      const height = Math.round(vv?.height ?? window.innerHeight)
      document.documentElement.style.setProperty('--app-height', `${height}px`)
    }
    applyViewport()
    window.visualViewport?.addEventListener('resize', applyViewport)
    window.visualViewport?.addEventListener('scroll', applyViewport)
    window.addEventListener('resize', applyViewport)
    return () => {
      document.documentElement.style.background = ''
      document.body.style.background = ''
      window.visualViewport?.removeEventListener('resize', applyViewport)
      window.visualViewport?.removeEventListener('scroll', applyViewport)
      window.removeEventListener('resize', applyViewport)
    }
  }, [settings.colorScheme])

  const fontClass =
    settings.fontSize === 'small'
      ? 'mobile-font-small'
      : settings.fontSize === 'large'
        ? 'mobile-font-large'
        : 'mobile-font-standard'
  const themeClass = settings.colorScheme === 'light' ? 'mobile-theme-light' : 'mobile-theme-dark'
  const rootClass = `mobile-interview-root ${fontClass} ${themeClass}`

  if (session.phase === 'interview') {
    return (
      <div className={rootClass}>
        <InterviewScreen
          session={session}
          settings={settings}
          onOpenSettings={() => setOverlayScreen('settings')}
          onPatchSettings={updateSettings}
        />
        {overlayScreen ? (
          <div className="mobile-overlay">
            {overlayScreen === 'settings' ? (
              <SettingsScreen
                settings={settings}
                onChange={updateSettings}
                onBack={() => setOverlayScreen(null)}
                onOpenPersonalInfo={() => setOverlayScreen('personal-info')}
              />
            ) : (
              <PersonalInfoScreen
                profile={profile}
                onChange={updateProfile}
                onBack={() => setOverlayScreen('settings')}
              />
            )}
          </div>
        ) : null}
      </div>
    )
  }

  if (screen === 'personal-info') {
    return (
      <div className={rootClass}>
        <PersonalInfoScreen
          profile={profile}
          onChange={updateProfile}
          onBack={() => setScreen('settings')}
        />
      </div>
    )
  }

  if (screen === 'settings') {
    return (
      <div className={rootClass}>
        <SettingsScreen
          settings={settings}
          onChange={updateSettings}
          onBack={() => setScreen('home')}
          onOpenPersonalInfo={() => setScreen('personal-info')}
        />
      </div>
    )
  }

  return (
    <div className={rootClass}>
      <HomeScreen
        profileReady={profileIsReady(profile)}
        hasApiKey={!!getActiveApiKey(settings)}
        hasSttKey={settings.sttMode !== 'cloud' || sttKeyConfigured(settings, settings.sttProvider)}
        onOpenSettings={() => setScreen('settings')}
        onStart={session.startSession}
      />
      {session.error ? <div className="mobile-interview-error">{session.error}</div> : null}
    </div>
  )
}
