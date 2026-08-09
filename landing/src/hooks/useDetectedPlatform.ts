import { useEffect, useState } from 'react'

export type DetectedPlatform = 'windows' | 'macos' | 'linux' | 'unknown'
export type PlatformId = Exclude<DetectedPlatform, 'unknown'>

function detectPlatform(): DetectedPlatform {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent.toLowerCase()
  const platform = (navigator.platform || '').toLowerCase()

  if (/win/.test(platform) || ua.includes('windows')) return 'windows'
  if (/mac/.test(platform) || ua.includes('mac os') || ua.includes('macintosh')) return 'macos'
  if (/linux/.test(platform) || ua.includes('linux') || ua.includes('cros')) return 'linux'
  return 'unknown'
}

/** Best-effort OS detection for download CTAs — defaults to Windows when unknown. */
export function useDetectedPlatform() {
  const [platform, setPlatform] = useState<DetectedPlatform>('unknown')

  useEffect(() => {
    setPlatform(detectPlatform())
  }, [])

  const preferred = platform === 'unknown' ? 'windows' : platform
  return { platform, preferred, isDetected: platform !== 'unknown' }
}
