import { useEffect, useState } from 'react'
import { fetchRollingReleaseMeta, formatReleaseDate } from '@/lib/releases'

export type DownloadMetaBanner =
  | { kind: 'loading' }
  | { kind: 'ok'; tag: string; updatedLabel: string | null }
  | { kind: 'error' }

/**
 * Non-blocking metadata for the download section. Failures never affect hrefs.
 */
export function useRollingReleaseMeta(): DownloadMetaBanner {
  const [state, setState] = useState<DownloadMetaBanner>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    fetchRollingReleaseMeta().then((meta) => {
      if (cancelled) return
      if (!meta) {
        setState({ kind: 'error' })
        return
      }
      setState({
        kind: 'ok',
        tag: meta.tagName,
        updatedLabel: formatReleaseDate(meta.publishedAt),
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
