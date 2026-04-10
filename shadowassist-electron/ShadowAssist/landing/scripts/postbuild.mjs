import { copyFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const index = join(root, 'index.html')
const notFound = join(root, '404.html')

if (!existsSync(index)) {
  console.error('[postbuild] dist/index.html missing')
  process.exit(1)
}
copyFileSync(index, notFound)
console.log('[postbuild] Copied index.html -> 404.html (GitHub Pages SPA fallback)')
