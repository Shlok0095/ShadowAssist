/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REPO_OWNER?: string
  readonly VITE_REPO_NAME?: string
  readonly VITE_ROLLING_TAG?: string
  readonly VITE_BASE_PATH?: string
  readonly VITE_SITE_ORIGIN?: string
  readonly VITE_DOWNLOAD_SETUP_URL?: string
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
