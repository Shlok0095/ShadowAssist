/// <reference types="vite/client" />

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface Window {
  SpeechRecognition?: typeof SpeechRecognition
  webkitSpeechRecognition?: typeof SpeechRecognition
}

interface ImportMetaEnv {
  readonly VITE_REPO_OWNER?: string
  readonly VITE_REPO_NAME?: string
  readonly VITE_ROLLING_TAG?: string
  readonly VITE_BASE_PATH?: string
  readonly VITE_SITE_ORIGIN?: string
  readonly VITE_DOWNLOAD_SETUP_URL?: string
  readonly VITE_API_ORIGIN?: string
  readonly VITE_MOBILE_APK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.md?raw' {
  const src: string
  export default src
}

declare module '*.txt?raw' {
  const src: string
  export default src
}
