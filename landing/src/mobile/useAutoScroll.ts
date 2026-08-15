import { useEffect, useRef } from 'react'

/** Scroll a container to bottom when deps change (chat-style auto-scroll). */
export function useAutoScrollToBottom(enabled: boolean, deps: unknown[]) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!enabled) return
    const el = containerRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
  }, [enabled, ...deps])

  return { containerRef, endRef }
}
