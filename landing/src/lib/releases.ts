import { SITE } from '@/config/site'

/** Metadata from GitHub only — never used for navigation or downloads. */
export type RollingReleaseMeta = {
  tagName: string
  publishedAt: string | null
}

/**
 * Fetches rolling release metadata for display (version line, “Updated” date).
 * Returns null on any failure — callers must not depend on this for downloads.
 */
export async function fetchRollingReleaseMeta(): Promise<RollingReleaseMeta | null> {
  try {
    const r = await fetch(SITE.apiRollingRelease)
    if (!r.ok) return null
    const data = (await r.json()) as { tag_name?: string; published_at?: string | null }
    if (!data.tag_name) return null
    return { tagName: data.tag_name, publishedAt: data.published_at ?? null }
  } catch {
    return null
  }
}

export function formatReleaseDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
