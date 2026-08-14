import { useCallback, useEffect, useState } from 'react'
import { getActiveApiKey, loadAppSettings, loadProfile, saveAppSettings, saveProfile } from './profileStorage'
import { profileIsReady, type AppSettings, type PersonalProfile } from './profileTypes'
import { useInterviewSession } from './useInterviewSession'
import { HomeScreen } from './screens/HomeScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { PersonalInfoScreen } from './screens/PersonalInfoScreen'
import { InterviewScreen } from './screens/InterviewScreen'
import './mobile-interview.css'

type AppScreen = 'home' | 'settings' | 'personal-info'

export default function MobileInterviewApp() {
  const [screen, setScreen] = useState<AppScreen>('home')
  const [profile, setProfile] = useState<PersonalProfile>(() => loadProfile())
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings())

  const session = useInterviewSession(profile, settings)

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
    document.documentElement.style.background = '#0a0a0b'
    return () => {
      document.documentElement.style.background = ''
    }
  }, [])

  const fontClass =
    settings.fontSize === 'small'
      ? 'mobile-font-small'
      : settings.fontSize === 'large'
        ? 'mobile-font-large'
        : 'mobile-font-standard'

  if (session.phase === 'interview') {
    return (
      <InterviewScreen
        session={session}
        settings={settings}
        onOpenSettings={() => setScreen('settings')}
        onPatchSettings={updateSettings}
        fontClass={fontClass}
      />
    )
  }

  if (screen === 'personal-info') {
    return (
      <div className={`mobile-interview-root ${fontClass}`}>
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
      <div className={`mobile-interview-root ${fontClass}`}>
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
    <div className={`mobile-interview-root ${fontClass}`}>
      <HomeScreen
        profileReady={profileIsReady(profile)}
        hasApiKey={!!getActiveApiKey(settings)}
        onOpenSettings={() => setScreen('settings')}
        onStart={session.startSession}
      />
      {session.error ? <div className="mobile-interview-error">{session.error}</div> : null}
    </div>
  )
}
