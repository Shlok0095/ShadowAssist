import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Drizzle + postgres.js are server-only; keep them out of the client bundle.
  serverExternalPackages: ['postgres'],
  // The repo root has its own lockfile (the VeilAssist desktop app); pin tracing
  // to this app so Vercel/Next resolve the correct workspace root.
  outputFileTracingRoot: __dirname,
  // Typed route hrefs across the App Router.
  typedRoutes: true,
}

export default nextConfig
