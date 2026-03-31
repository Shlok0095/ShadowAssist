import { SITE } from '@/config/site'

export function pickAsset(
  assets: { name: string; browser_download_url: string }[],
  test: (a: { name: string }) => boolean
) {
  for (const a of assets) {
    if (test(a)) return a
  }
  return null
}

export async function fetchLatestSetupUrl(): Promise<string> {
  const r = await fetch(SITE.apiLatestRelease)
  if (!r.ok) return SITE.releasesLatestUrl
  const data = (await r.json()) as { assets?: { name: string; browser_download_url: string }[] }
  const a = pickAsset(data.assets ?? [], (x) => /^ShadowAssist-Setup-.+\.exe$/i.test(x.name))
  return a?.browser_download_url ?? SITE.releasesLatestUrl
}

export async function fetchLatestPortableUrl(): Promise<string> {
  const r = await fetch(SITE.apiLatestRelease)
  if (!r.ok) return SITE.releasesLatestUrl
  const data = (await r.json()) as { assets?: { name: string; browser_download_url: string }[] }
  const a = pickAsset(data.assets ?? [], (x) => x.name === 'ShadowAssist.exe')
  return a?.browser_download_url ?? SITE.releasesLatestUrl
}
