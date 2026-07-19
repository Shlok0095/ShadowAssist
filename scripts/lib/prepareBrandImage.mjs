/**
 * Shared brand image prep: trim, square pad, transparent canvas, optional squircle / luminance alpha.
 */
import fs from 'fs'
import sharp from 'sharp'

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

async function applyLuminanceAlpha(pngBuffer) {
  const { data, info } = await sharp(pngBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
    data[i + 3] = Math.min(255, Math.round(lum))
  }
  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer()
}

async function applySquircleClip(pngBuffer, radiusRatio) {
  const fitMeta = await sharp(pngBuffer).metadata()
  const fw = fitMeta.width || 1
  const fh = fitMeta.height || 1
  const maskRadius = Math.round(Math.min(fw, fh) * radiusRatio)
  const maskSvg = `<svg width="${fw}" height="${fh}"><rect width="${fw}" height="${fh}" rx="${maskRadius}" ry="${maskRadius}" fill="white"/></svg>`
  const maskPng = await sharp(Buffer.from(maskSvg)).resize(fw, fh, { fit: 'fill' }).png().toBuffer()
  return sharp(pngBuffer).composite([{ input: maskPng, blend: 'dest-in' }]).png().toBuffer()
}

/**
 * @param {object} opts
 * @param {string} opts.inputPath
 * @param {string} opts.outputPath
 * @param {number} [opts.outputSize]
 * @param {number} [opts.padRatio]
 * @param {number} [opts.trimThreshold]
 * @param {boolean} [opts.squircleClip]
 * @param {number} [opts.squircleRadiusRatio]
 * @param {boolean} [opts.luminanceAlpha] — white-on-black glyphs → transparent background
 */
export async function prepareBrandImage({
  inputPath,
  outputPath,
  outputSize = 1024,
  padRatio = 0.03,
  trimThreshold = 15,
  squircleClip = false,
  squircleRadiusRatio = 0.215,
  luminanceAlpha = false,
}) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Missing image at ${inputPath}`)
  }

  const trimmed = await sharp(inputPath)
    .ensureAlpha()
    .trim({ threshold: trimThreshold })
    .toBuffer({ resolveWithObject: true })
  const tw = trimmed.info.width
  const th = trimmed.info.height
  if (!tw || !th) {
    throw new Error(`Could not trim ${inputPath}`)
  }

  const contentMax = Math.max(tw, th)
  const squarePadTop = Math.floor((contentMax - th) / 2)
  const squarePadBottom = Math.ceil((contentMax - th) / 2)
  const squarePadLeft = Math.floor((contentMax - tw) / 2)
  const squarePadRight = Math.ceil((contentMax - tw) / 2)

  const innerSize = Math.round(outputSize * (1 - padRatio * 2))

  let fitted = await sharp(trimmed.data)
    .extend({
      top: squarePadTop,
      bottom: squarePadBottom,
      left: squarePadLeft,
      right: squarePadRight,
      background: TRANSPARENT,
    })
    .resize(innerSize, innerSize, { fit: 'inside', background: TRANSPARENT })
    .png()
    .toBuffer()

  if (luminanceAlpha) {
    fitted = await applyLuminanceAlpha(fitted)
  }
  if (squircleClip) {
    fitted = await applySquircleClip(fitted, squircleRadiusRatio)
  }

  const fitMeta = await sharp(fitted).metadata()
  const fw = fitMeta.width || innerSize
  const fh = fitMeta.height || innerSize

  const tmpPath = `${outputPath}.prepared.tmp.png`
  await sharp({
    create: {
      width: outputSize,
      height: outputSize,
      channels: 4,
      background: TRANSPARENT,
    },
  })
    .composite([{ input: fitted, gravity: 'center' }])
    .png()
    .toFile(tmpPath)

  fs.renameSync(tmpPath, outputPath)

  const fillPct = Math.round((Math.max(fw, fh) / outputSize) * 100)
  return { width: tw, height: th, fillPct, outputSize }
}
