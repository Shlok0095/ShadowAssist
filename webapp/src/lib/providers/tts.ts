/**
 * Text-to-speech provider contract.
 *
 * v1 uses the browser's free Web Speech `SpeechSynthesis` (Milestone 6); this
 * interface lets us swap in a hosted neural voice later without touching the
 * session loop. Kept minimal and transport-agnostic.
 */

export interface TtsSpeakOptions {
  text: string
  voice?: string
  rate?: number
  onStart?: () => void
  onEnd?: () => void
}

export interface TtsProvider {
  readonly name: string
  speak(options: TtsSpeakOptions): Promise<void>
  cancel(): void
}
