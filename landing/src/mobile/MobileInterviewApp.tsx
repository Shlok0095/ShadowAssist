import { useCallback, useEffect, useRef, useState } from 'react'
import { getActiveApiKey, loadAppSettings, loadProfile, saveAppSettings, saveProfile } from './profileStorage'
import { profileIsReady, type AppSettings, type PersonalProfile } from './profileTypes'
import { sttKeyConfigured } from './sttRegistry'
import { useInterviewSession } from './useInterviewSession'
import { deriveInterviewTopic } from './deriveInterviewTopic'
import { requestLaunchPermissions } from './runtimePermissions'
import { HomeScreen } from './screens/HomeScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { AdvancedSettingsScreen } from './screens/AdvancedSettingsScreen'
import { PersonalInfoScreen } from './screens/PersonalInfoScreen'
import { FontSizeScreen } from './screens/FontSizeScreen'
import { InterviewScreen } from './screens/InterviewScreen'
import { micFromInterviewLanguage } from './settingsCatalog'
import './mobile-interview.css'

type AppScreen = 'home' | 'settings' | 'personal-info' | 'font-size' | 'advanced-settings'

function isSettingsChild(s: AppScreen | null) {
  return s === 'personal-info' || s === 'font-size' || s === 'advanced-settings'
}

export default function MobileInterviewApp() {
  const [screen, setScreen] = useState<AppScreen>('home')
  const [overlayScreen, setOverlayScreen] = useState<AppScreen | null>(null)
  const [profile, setProfile] = useState<PersonalProfile>(() => loadProfile())
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings())

  const session = useInterviewSession(profile, settings)
  const restoredRef = useRef(false)

  const sessionRef = useRef(session)
  sessionRef.current = session

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
    if (restoredRef.current) return
    restoredRef.current = true
    session.restoreSessionFromSnapshot()
    void requestLaunchPermissions()
  }, [session.restoreSessionFromSnapshot])

  useEffect(() => {
    if (settings.interviewTopicLocked) return
    const derived = deriveInterviewTopic(profile)
    if (!derived || derived === settings.interviewTopic) return
    updateSettings({ interviewTopic: derived })
  }, [profile, settings.interviewTopic, settings.interviewTopicLocked, updateSettings])

  useEffect(() => {
    const mic = micFromInterviewLanguage(settings.interviewLanguage)
    if (settings.micListenLanguage === mic) return
    updateSettings({ micListenLanguage: mic })
  }, [settings.interviewLanguage, settings.micListenLanguage, updateSettings])

  useEffect(() => {
    let remove: (() => void) | undefined
    void import('@capacitor/app')
      .then(async ({ App }) => {
        const handle = await App.addListener('backButton', () => {
          const s = sessionRef.current
          const sheetBack = new CustomEvent('veilassist:settings-back', { cancelable: true })
          window.dispatchEvent(sheetBack)
          if (sheetBack.defaultPrevented) return
          if (overlayScreen) {
            setOverlayScreen(isSettingsChild(overlayScreen) ? 'settings' : null)
            return
          }
          if (s.phase === 'interview') {
            window.dispatchEvent(new Event('veilassist:hardware-back'))
            return
          }
          if (screen !== 'home') {
            setScreen(isSettingsChild(screen) ? 'settings' : 'home')
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

  useEffect(() => {
    const bg = settings.colorScheme === 'light' ? '#f2f2f7' : '#0c0c0d'
    document.documentElement.style.background = bg
    document.documentElement.style.colorScheme = settings.colorScheme
    document.body.style.background = bg
    document.body.style.colorScheme = settings.colorScheme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
    let viewportRaf = 0
    const applyViewport = () => {
      if (viewportRaf) return
      viewportRaf = requestAnimationFrame(() => {
        viewportRaf = 0
        const vv = window.visualViewport
        const height = Math.round(vv?.height ?? window.innerHeight)
        document.documentElement.style.setProperty('--app-height', `${height}px`)
      })
    }
    applyViewport()
    window.visualViewport?.addEventListener('resize', applyViewport, { passive: true })
    window.visualViewport?.addEventListener('scroll', applyViewport, { passive: true })
    window.addEventListener('resize', applyViewport, { passive: true })
    return () => {
      if (viewportRaf) cancelAnimationFrame(viewportRaf)
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
        : settings.fontSize === 'xlarge'
          ? 'mobile-font-xlarge'
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
                onOpenFontSize={() => setOverlayScreen('font-size')}
                onOpenAdvancedSettings={() => setOverlayScreen('advanced-settings')}
              />
            ) : overlayScreen === 'font-size' ? (
              <FontSizeScreen
                settings={settings}
                onChange={updateSettings}
                onBack={() => setOverlayScreen('settings')}
              />
            ) : overlayScreen === 'advanced-settings' ? (
              <AdvancedSettingsScreen
                settings={settings}
                onChange={updateSettings}
                onBack={() => setOverlayScreen('settings')}
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

  if (screen === 'font-size') {
    return (
      <div className={rootClass}>
        <FontSizeScreen
          settings={settings}
          onChange={updateSettings}
          onBack={() => setScreen('settings')}
        />
      </div>
    )
  }

  if (screen === 'advanced-settings') {
    return (
      <div className={rootClass}>
        <AdvancedSettingsScreen
          settings={settings}
          onChange={updateSettings}
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
          onOpenFontSize={() => setScreen('font-size')}
          onOpenAdvancedSettings={() => setScreen('advanced-settings')}
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
