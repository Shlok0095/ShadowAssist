import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_PROFILE,
  type AppSettings,
  type PersonalProfile,
} from './profileTypes'

const STORAGE_PROFILE = 'veilassist.mobile.profile.v1'
const STORAGE_SETTINGS = 'veilassist.mobile.appSettings.v1'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return { ...fallback, ...JSON.parse(raw) } as T
  } catch {
    return fallback
  }
}

export function loadProfile(): PersonalProfile {
  const parsed = readJson<PersonalProfile>(STORAGE_PROFILE, DEFAULT_PROFILE)
  return {
    ...DEFAULT_PROFILE,
    ...parsed,
    experience: Array.isArray(parsed.experience) ? parsed.experience : [],
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    education: Array.isArray(parsed.education) ? parsed.education : [],
  }
}

export function saveProfile(profile: PersonalProfile) {
  try {
    localStorage.setItem(
      STORAGE_PROFILE,
      JSON.stringify({ ...profile, updatedAt: Date.now() }),
    )
  } catch {
    /* ignore */
  }
}

export function loadAppSettings(): AppSettings {
  return readJson<AppSettings>(STORAGE_SETTINGS, DEFAULT_APP_SETTINGS)
}

export function saveAppSettings(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings))
  } catch {
    /* ignore */
  }
}

export function getActiveApiKey(settings: AppSettings): string {
  if (settings.provider === 'nvidia') return settings.nvidiaKey.trim()
  if (settings.provider === 'groq') return settings.groqKey.trim()
  return settings.apiKey.trim()
}

export function getActiveModel(settings: AppSettings): string {
  if (settings.provider === 'nvidia') return settings.nvidiaModel.trim()
  if (settings.provider === 'groq') return settings.groqModel.trim()
  return settings.selectedModel.trim()
}
