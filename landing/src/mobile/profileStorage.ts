import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_PROFILE,
  type AppSettings,
  type PersonalProfile,
} from './profileTypes'
import {
  getChatProviderMeta,
  getProviderApiKey,
  getProviderModel,
} from './providerRegistry'
import { normalizeSttProvider } from './sttRegistry'

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
  const parsed = readJson<AppSettings>(STORAGE_SETTINGS, DEFAULT_APP_SETTINGS)
  return {
    ...DEFAULT_APP_SETTINGS,
    ...parsed,
    sttProvider: normalizeSttProvider(parsed.sttProvider),
    colorScheme: parsed.colorScheme === 'light' ? 'light' : 'dark',
  }
}

export function saveAppSettings(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings))
  } catch {
    /* ignore */
  }
}

export function getActiveApiKey(settings: AppSettings): string {
  return getProviderApiKey(settings, settings.provider)
}

export function getActiveModel(settings: AppSettings): string {
  return getProviderModel(settings, settings.provider)
}

export function getActiveProviderMeta(settings: AppSettings) {
  return getChatProviderMeta(settings.provider)
}
