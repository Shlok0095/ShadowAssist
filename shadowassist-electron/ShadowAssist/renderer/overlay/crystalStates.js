// Status labels only — all colors live in index.css (:root).

export function statusLabel({ isThinking, sessionOn, micError }) {
  if (micError) return 'Disrupted'
  if (isThinking) return 'Refracting'
  if (sessionOn) return 'Attuned'
  return 'Dormant'
}
