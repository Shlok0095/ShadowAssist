/**
 * Smoke test — overlay mouse capture policy (Natively-style renderer passthrough).
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
  if (!r.ignore || r.forward || r.useRendererPassthrough) {
    throw new Error('hidden overlay should ignore without renderer passthrough')
  }
}

// normal mode — capture all clicks
{
  const r = resolveOverlayMouseCapture({ overlayVisible: true, passthroughEnabled: false })
  if (r.ignore || r.useRendererPassthrough) {
    throw new Error('passthrough off should capture mouse (ignore=false)')
  }
}

// passthrough on — default forward; renderer captures on hover over UI
{
  const r = resolveOverlayMouseCapture({ overlayVisible: true, passthroughEnabled: true })
  if (!r.ignore || !r.forward || !r.useRendererPassthrough) {
    throw new Error('passthrough should use ignore+forward with renderer hover capture')
  }
}

// main process must expose IPC + sync (no cursor polling)
const mainSrc = fs.readFileSync(path.join(appRoot, 'main/index.js'), 'utf8')
for (const needle of [
  'overlayMousePolicy',
  'overlay:set-ignore-mouse-events',
  'overlay-mouse-passthrough',
]) {
  if (!mainSrc.includes(needle)) {
    throw new Error(`main/index.js missing ${needle} — passthrough not wired`)
  }
}
if (mainSrc.includes('tickMousePassthroughPoll') || mainSrc.includes('mousePassthroughPollTimer')) {
  throw new Error('main/index.js should not poll cursor for passthrough — use renderer hover')
}

const overlaySrc = fs.readFileSync(path.join(appRoot, 'renderer/overlay/App.jsx'), 'utf8')
if (!overlaySrc.includes('data-overlay-hit')) {
  throw new Error('overlay App.jsx missing data-overlay-hit markers')
}
if (!overlaySrc.includes('useOverlayMousePassthrough')) {
  throw new Error('overlay App.jsx missing useOverlayMousePassthrough hook')
}

console.log('OK overlay mouse capture policy')
