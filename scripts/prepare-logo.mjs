/**
 * Normalize logo.png for app / taskbar use (squircle clip).
 */
import path from 'path'
import { fileURLToPath } from 'url'
import { prepareBrandImage } from './lib/prepareBrandImage.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const logoPath = path.join(root, 'logo.png')

try {
  const result = await prepareBrandImage({
    inputPath: logoPath,
    outputPath: logoPath,
    squircleClip: true,
  })
  console.log(
    '[prepare-logo]',
    `${result.outputSize}x${result.outputSize}`,
    `(trimmed ${result.width}x${result.height}, transparent squircle, ~${result.fillPct}% fill)`,
  )
} catch (err) {
  console.error('[prepare-logo]', err.message || err)
  process.exit(1)
}
