// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Unauthorized copying or distribution is prohibited.

/**
 * Accent presets — saturated “neon” ramps (main / mid / light).
 * Default `neon` matches original ShadowAssist green (#22c55e family).
 */

export const DEFAULT_UI_ACCENT_ID = 'neon'

export const UI_ACCENT_THEMES = [
  { id: 'neon', label: 'Neon green', main: [34, 197, 94], mid: [5, 210, 120], light: [130, 255, 175] },
  { id: 'mint', label: 'Electric mint', main: [16, 245, 170], mid: [0, 200, 140], light: [150, 255, 230] },
  { id: 'teal', label: 'Teal surge', main: [20, 220, 200], mid: [6, 182, 158], light: [110, 255, 240] },
  { id: 'cyan', label: 'Cyber cyan', main: [0, 230, 255], mid: [0, 180, 220], light: [165, 255, 255] },
  { id: 'sky', label: 'Sky pulse', main: [56, 189, 248], mid: [14, 165, 233], light: [195, 245, 255] },
  { id: 'blue', label: 'Electric blue', main: [59, 130, 246], mid: [37, 99, 235], light: [165, 210, 255] },
  { id: 'indigo', label: 'Indigo glow', main: [99, 102, 241], mid: [67, 56, 202], light: [185, 195, 255] },
  { id: 'violet', label: 'Violet beam', main: [167, 139, 250], mid: [124, 58, 237], light: [230, 220, 255] },
  { id: 'fuchsia', label: 'Hot magenta', main: [232, 121, 249], mid: [192, 38, 211], light: [255, 200, 255] },
  { id: 'pink', label: 'Neon pink', main: [255, 92, 205], mid: [236, 72, 153], light: [255, 190, 240] },
  { id: 'rose', label: 'Rose flare', main: [251, 113, 133], mid: [244, 63, 94], light: [255, 210, 218] },
  { id: 'red', label: 'Crimson neon', main: [255, 71, 87], mid: [220, 38, 38], light: [255, 175, 182] },
  { id: 'orange', label: 'Plasma orange', main: [255, 130, 50], mid: [249, 115, 22], light: [255, 210, 140] },
  { id: 'amber', label: 'Gold amber', main: [251, 191, 36], mid: [245, 158, 11], light: [255, 238, 160] },
  { id: 'lime', label: 'Acid lime', main: [163, 230, 53], mid: [101, 217, 30], light: [235, 255, 130] },
  { id: 'copper', label: 'Neon copper', main: [255, 148, 72], mid: [215, 100, 48], light: [255, 218, 185] },
  { id: 'bronze', label: 'Bronze ember', main: [220, 132, 72], mid: [165, 88, 45], light: [255, 205, 155] },
  { id: 'mocha', label: 'Mocha glow', main: [195, 118, 78], mid: [130, 72, 48], light: [255, 200, 160] },
  { id: 'walnut', label: 'Walnut neon', main: [168, 100, 52], mid: [120, 62, 30], light: [255, 205, 135] },
  { id: 'chocolate', label: 'Chocolate', main: [145, 75, 48], mid: [95, 45, 32], light: [255, 185, 150] },
  { id: 'espresso', label: 'Espresso beam', main: [110, 62, 45], mid: [70, 40, 30], light: [255, 200, 168] },
]

export const UI_ACCENT_THEME_MAP = Object.fromEntries(UI_ACCENT_THEMES.map((t) => [t.id, t]))

export const UI_ACCENT_IDS = UI_ACCENT_THEMES.map((t) => t.id)

export function normalizeUiAccentId(id) {
  return UI_ACCENT_THEME_MAP[id] ? id : DEFAULT_UI_ACCENT_ID
}

export function applyUiAccentTheme(root, id) {
  const el = root || (typeof document !== 'undefined' ? document.documentElement : null)
  if (!el) return
  const t = UI_ACCENT_THEME_MAP[normalizeUiAccentId(id)]
  el.style.setProperty('--accent-rgb', `${t.main[0]} ${t.main[1]} ${t.main[2]}`)
  el.style.setProperty('--accent-mid-rgb', `${t.mid[0]} ${t.mid[1]} ${t.mid[2]}`)
  el.style.setProperty('--accent-light-rgb', `${t.light[0]} ${t.light[1]} ${t.light[2]}`)
}
