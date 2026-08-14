/**
 * Speech-to-text provider contract.
 *
 * The live pipeline (Milestone 5) speaks only to this interface, never to a
 * concrete vendor. Concrete adapters live behind our own `/api/stt/stream`
 * proxy so vendor keys never reach the browser.
 *
 * Default target is a free/open-source path (NVIDIA NIM / Riva streaming STT,
 * mirroring the approach used by the existing VeilAssist desktop app); a
 * Deepgram adapter is provided for parity. Concrete implementations are added
 * in Milestone 5 — this file only pins the shared types.
 */

export interface SttWord {
  text: string
  startMs: number
  endMs: number
  speaker?: number
  confidence?: number
}

export interface SttTranscriptEvent {
  type: 'transcript'
  isFinal: boolean
  text: string
  words: SttWord[]
  /** Rolling timestamp of when this event was produced, ms since epoch. */
  receivedAtMs: number
}

export interface SttUtteranceEndEvent {
  type: 'utterance_end'
  lastWordEndMs: number
}

export interface SttErrorEvent {
  type: 'error'
  code: string
  message: string
}

export type SttEvent = SttTranscriptEvent | SttUtteranceEndEvent | SttErrorEvent

export interface SttSessionOptions {
  sampleRateHz: number // expected 16000
  interimResults: boolean
  diarize: boolean
  /** Silence, in ms, before the provider emits an utterance-end. ~800ms. */
  endpointingMs: number
}

/** A single live transcription session over a bidirectional audio stream. */
export interface SttSession {
  /** Push a chunk of 16kHz mono PCM (Int16) audio. */
  sendAudio(pcm: ArrayBuffer): void
  /** Subscribe to transcript / utterance-end / error events. */
  on(handler: (event: SttEvent) => void): () => void
  /** Gracefully finish and flush any pending audio. */
  close(): Promise<void>
}

export interface SttProvider {
  readonly name: string
  openSession(options: SttSessionOptions): Promise<SttSession>
}
