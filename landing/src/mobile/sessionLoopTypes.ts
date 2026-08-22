/** Turn-taking state for the listen → answer → re-listen loop (single source of truth). */
export type SessionLoopPhase = 'idle' | 'listening' | 'generating_answer' | 'paused'

export type SessionTurn = {
  question: string
  answer: string
  at: number
}

export type SessionSnapshot = {
  sessionActive: boolean
  loopPhase: SessionLoopPhase
  transcript: string
  answer: string
  turnHistory: SessionTurn[]
  updatedAt: number
}

export const SESSION_SNAPSHOT_KEY = 'veilassist.mobile.sessionSnapshot.v1'
export const MAX_TURN_HISTORY = 24

export function loopPhaseLabel(
  phase: SessionLoopPhase,
  extras?: { reconnecting?: boolean; sttError?: string; answerFailed?: boolean },
): string {
  if (extras?.answerFailed) return 'Answer failed — tap to retry'
  if (extras?.reconnecting) return 'Reconnecting…'
  if (extras?.sttError) return extras.sttError
  switch (phase) {
    case 'listening':
      return 'Listening'
    case 'generating_answer':
      return 'Listening'
    case 'paused':
      return 'Paused (app backgrounded)'
    case 'idle':
      return 'Ready'
    default:
      return ''
  }
}
