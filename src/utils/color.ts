export interface Tone {
  /** Perceived brightness, 0 (black) to 1 (white). */
  brightness: number
  /** Average color as #rrggbb. */
  color: string
}

export const DEFAULT_TONE: Tone = { brightness: 0.3, color: '#0f172a' }

export function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  if (Number.isNaN(n) || full.length !== 6) return [15, 23, 42]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function toHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')
}

/** Rec. 709 luma on gamma-encoded values: matches how bright something looks, so mid-grey is ~0.5. */
export function brightnessOf(r: number, g: number, b: number) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

export function toneFromHex(hex: string): Tone {
  const [r, g, b] = parseHex(hex)
  return { brightness: brightnessOf(r, g, b), color: toHex(r, g, b) }
}

/** Weighted average of several tones. */
export function blendTones(parts: { tone: Tone; weight: number }[]): Tone {
  const total = parts.reduce((sum, p) => sum + p.weight, 0)
  let r = 0, g = 0, b = 0
  for (const { tone, weight } of parts) {
    const [pr, pg, pb] = parseHex(tone.color)
    r += (pr * weight) / total
    g += (pg * weight) / total
    b += (pb * weight) / total
  }
  return { brightness: brightnessOf(r, g, b), color: toHex(r, g, b) }
}

/** Above this, a wallpaper reads as light, so type sitting directly on it should be dark. */
export const LIGHT_SURFACE = 0.56

export function surfaceFor(brightness: number): 'light' | 'dark' {
  return brightness > LIGHT_SURFACE ? 'light' : 'dark'
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/** Dark tint on a living gradient. The slider is 0–60; zero leaves the colour alone, sixty is a deep veil. */
export function gradientDimAlpha(dim: number) {
  return (clamp(dim, 0, 60) / 60) * 0.78
}

/**
 * Adaptive overlay: brighter backgrounds get a heavier dark scrim in dark mode, and darker
 * backgrounds get a heavier pale veil in light mode, so the theme's text color always has contrast.
 * `dim` (0-60) is the user's extra push on top.
 */
export function scrimFor(tone: Tone, isDark: boolean, dim: number, gentle = false) {
  const base = isDark ? '#020617' : '#f8fafc'
  const need = isDark ? tone.brightness : 1 - tone.brightness
  // A living gradient should stay visible. A picture still gets the heavier veil.
  const alpha = gentle
    ? clamp(0.08 + 0.28 * need + dim / 160, 0, 0.7)
    : clamp(0.2 + 0.5 * need + dim / 100, 0, 0.94)
  // A hint of the image's own color keeps the overlay from looking like a flat grey sheet.
  const color = `color-mix(in srgb, ${tone.color} 14%, ${base})`
  return { color, alpha }
}
