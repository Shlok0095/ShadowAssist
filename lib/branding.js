// Copyright (c) 2026 VeilAssist. All rights reserved.
// Dynamic branding — app display name and custom logos, persisted per-user.
// Pure Node helpers only (no `electron` import) so this module is safe to bundle
// into renderer builds as well as require() from the main process.

const path = require('path')
const fs = require('fs')

const DEFAULT_BRAND_NAME = 'VeilAssist'
const MAX_BRAND_NAME_LENGTH = 40
const BRAND_ASSETS_DIR = 'brand'
const BRAND_LOGO_FILE = 'logo.png'
const BRAND_OVERLAY_LOGO_FILE = 'overlaylogo.png'

/** Trim, strip control characters, and cap length. Empty → default. */
function sanitizeBrandName(input) {
  if (typeof input !== 'string') return DEFAULT_BRAND_NAME
  const cleaned = input
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_BRAND_NAME_LENGTH)
  return cleaned.length > 0 ? cleaned : DEFAULT_BRAND_NAME
}

/** Store value: custom configured name, or '' (= default) to avoid clobbering. */
function normalizeBrandNameForStore(input) {
  const name = sanitizeBrandName(input)
  return name === DEFAULT_BRAND_NAME ? '' : name
}

/** Resolve effective brand name from a possibly-empty store value. */
function resolveBrandName(stored) {
  return sanitizeBrandName(stored)
}

/**
 * Read the effective brand name from the persisted store when available.
 * Safe in any main-process context; falls back to the default on any error
 * (e.g. when invoked from a bundled/renderer context without electron-store).
 */
function resolveBrandNameFromStore() {
  try {
    const store = require('./store')
    return resolveBrandName(store.get('brandName'))
  } catch (_) {
    return DEFAULT_BRAND_NAME
  }
}

/** Directory under userData that holds the user's custom brand assets. */
function getBrandAssetsDir(userDataPath) {
  return path.join(userDataPath, BRAND_ASSETS_DIR)
}

/** File name used for a given brand logo kind ('app' | 'overlay'). */
function getBrandLogoFileName(kind) {
  return kind === 'overlay' ? BRAND_OVERLAY_LOGO_FILE : BRAND_LOGO_FILE
}

/** Absolute path to a custom brand logo if it exists, else '' — never null. */
function getBrandLogoSrcPath(userDataPath, kind) {
  const p = path.join(getBrandAssetsDir(userDataPath), getBrandLogoFileName(kind))
  try {
    return fs.existsSync(p) ? p : ''
  } catch (_) {
    return ''
  }
}

/** True when the user has set a custom logo of the given kind. */
function hasCustomBrandLogo(userDataPath, kind) {
  return !!getBrandLogoSrcPath(userDataPath, kind)
}

/** Verify raw bytes look like a supported raster image (PNG / JPEG / BMP / GIF). */
function isSupportedImageBytes(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return false
  return (
    buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) ||
    (buf[0] === 0x42 && buf[1] === 0x4d) ||
    (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46)
  )
}

/** Copy a user-picked logo into the brand assets dir. Returns dest path or throws. */
function persistBrandLogo(srcPath, userDataPath, kind) {
  const destDir = getBrandAssetsDir(userDataPath)
  fs.mkdirSync(destDir, { recursive: true })
  const dest = path.join(destDir, getBrandLogoFileName(kind))
  fs.copyFileSync(srcPath, dest)
  return dest
}

/** Remove a custom brand logo of the given kind. Returns true when removed. */
function removeBrandLogo(userDataPath, kind) {
  const p = getBrandLogoSrcPath(userDataPath, kind)
  if (!p) return false
  try {
    fs.unlinkSync(p)
    return true
  } catch (_) {
    return false
  }
}

module.exports = {
  DEFAULT_BRAND_NAME,
  MAX_BRAND_NAME_LENGTH,
  sanitizeBrandName,
  normalizeBrandNameForStore,
  resolveBrandName,
  resolveBrandNameFromStore,
  getBrandAssetsDir,
  getBrandLogoFileName,
  getBrandLogoSrcPath,
  hasCustomBrandLogo,
  isSupportedImageBytes,
  persistBrandLogo,
  removeBrandLogo,
}
/** Rollup/Vite ESM interop when importing this CJS module from the renderer. */
module.exports.default = module.exports