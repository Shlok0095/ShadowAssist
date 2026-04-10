/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REPO_OWNER?: string
  readonly VITE_REPO_NAME?: string
  readonly VITE_ROLLING_TAG?: string
  readonly VITE_BASE_PATH?: string
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
