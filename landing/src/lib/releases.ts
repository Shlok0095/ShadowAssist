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
  try {
    const r = await fetch(SITE.apiRollingRelease)
    if (!r.ok) return SITE.downloadSetupExeUrl
    const data = (await r.json()) as { assets?: { name: string; browser_download_url: string }[] }
    const assets = data.assets ?? []
    const a =
      pickAsset(assets, (x) => x.name.toLowerCase() === 'shadowassist-setup.exe') ??
      pickAsset(assets, (x) => /^ShadowAssist-Setup-.+\.exe$/i.test(x.name))
    return a?.browser_download_url ?? SITE.downloadSetupExeUrl
  } catch {
    return SITE.downloadSetupExeUrl
  }
}

export async function fetchLatestPortableUrl(): Promise<string> {
  try {
    const r = await fetch(SITE.apiRollingRelease)
    if (!r.ok) return SITE.downloadPortableExeUrl
    const data = (await r.json()) as { assets?: { name: string; browser_download_url: string }[] }
    const a = pickAsset(data.assets ?? [], (x) => x.name === 'ShadowAssist.exe')
    return a?.browser_download_url ?? SITE.downloadPortableExeUrl
  } catch {
    return SITE.downloadPortableExeUrl
  }
}
