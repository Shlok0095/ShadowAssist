/**
 * Native HTTP for Capacitor APK — bypasses WebView CORS.
 * NVIDIA integrate.api.nvidia.com does NOT send Access-Control-Allow-Origin,
 * so fetch() from https://localhost fails with "Failed to fetch" even with a valid API key.
 */
import { Capacitor, CapacitorHttp } from '@capacitor/core'

export type MobileHttpResponse = {
  status: number
  text: string
  ok: boolean
}

export async function mobileApiPost(
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
): Promise<MobileHttpResponse> {
  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.post({
      url,
      headers,
      data: body,
      responseType: 'text',
    })
    const text =
      typeof res.data === 'string'
        ? res.data
        : res.data != null
          ? JSON.stringify(res.data)
          : ''
    return { status: res.status, text, ok: res.status >= 200 && res.status < 300 }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const text = await res.text()
  return { status: res.status, text, ok: res.ok }
}

export function isLikelyCorsOrNetworkError(message: string): boolean {
  return /failed to fetch|network error|load failed|network request failed/i.test(message)
}
