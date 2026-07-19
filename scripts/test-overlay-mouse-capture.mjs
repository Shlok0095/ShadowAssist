/**
 * Smoke test — overlay mouse capture policy (passthrough must not block notch clicks).
 */
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const root = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(root, '..')
const require = createRequire(import.meta.url)

const { isPointInBounds, resolveOverlayMouseCapture } = require(path.join(
  appRoot,
  'lib/overlayMousePolicy.js',
))
const storeSchema = require(path.join(appRoot, 'lib/store.js')).schema

if (!storeSchema.overlayMousePassthroughEnabled) {
  throw new Error('store missing overlayMousePassthroughEnabled')
}
if (storeSchema.overlayMousePassthroughEnabled.default !== false) {
  throw new Error('overlayMousePassthroughEnabled should default to false')
}

// point-in-bounds
if (!isPointInBounds({ x: 5, y: 5 }, { x: 0, y: 0, width: 10, height: 10 })) {
  throw new Error('expected cursor inside bounds')
}
if (isPointInBounds({ x: 10, y: 5 }, { x: 0, y: 0, width: 10, height: 10 })) {
  throw new Error('expected cursor outside bounds (right edge exclusive)')
}

// hidden overlay always ignores input
{
  const r = resolveOverlayMouseCapture({ overlayVisible: false, passthroughEnabled: true })
  if (!r.ignore || r.forward || r.usePassthroughPoll) {
    throw new Error('hidden overlay should ignore without passthrough poll')
  }
}

// normal mode — capture all clicks
{
  const r = resolveOverlayMouseCapture({ overlayVisible: true, passthroughEnabled: false })
  if (r.ignore || r.usePassthroughPoll) {
    throw new Error('passthrough off should capture mouse (ignore=false)')
  }
}

// passthrough on + cursor outside — forward clicks
{
  const r = resolveOverlayMouseCapture({
    overlayVisible: true,
    passthroughEnabled: true,
    cursorInsideOverlay: false,
  })
  if (!r.ignore || !r.forward || !r.usePassthroughPoll) {
    throw new Error('passthrough outside should forward clicks')
  }
}

// passthrough on + cursor inside — MUST capture (notch buttons work)
{
  const r = resolveOverlayMouseCapture({
    overlayVisible: true,
    passthroughEnabled: true,
    cursorInsideOverlay: true,
  })
  if (r.ignore || r.forward || !r.usePassthroughPoll) {
    throw new Error('passthrough inside overlay must capture mouse for UI clicks')
  }
}

// main process must poll cursor when passthrough is enabled (not a permanent forward:true)
const mainSrc = fs.readFileSync(path.join(appRoot, 'main/index.js'), 'utf8')
for (const needle of ['overlayMousePolicy', 'mousePassthroughPoll', 'getCursorScreenPoint']) {
  if (!mainSrc.includes(needle)) {
    throw new Error(`main/index.js missing ${needle} — passthrough poll not wired`)
  }
}

console.log('OK overlay mouse capture policy')
