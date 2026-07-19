/**
 * Normalize overlaylogo.png for overlay notch only (white glyph, transparent bg).
 */
import path from 'path'
import { fileURLToPath } from 'url'
import { prepareBrandImage } from './lib/prepareBrandImage.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const overlayLogoPath = path.join(root, 'overlaylogo.png')

try {
  const result = await prepareBrandImage({
    inputPath: overlayLogoPath,
    outputPath: overlayLogoPath,
    squircleClip: false,
    luminanceAlpha: true,
  })
  console.log(
    '[prepare-overlay-logo]',
    `${result.outputSize}x${result.outputSize}`,
    `(trimmed ${result.width}x${result.height}, transparent glyph, ~${result.fillPct}% fill)`,
  )
} catch (err) {
  console.error('[prepare-overlay-logo]', err.message || err)
  process.exit(1)
}
