import { brightnessOf, parseHex } from '@/utils/color'

export const MIN_FONT_SCALE = 85
export const MAX_FONT_SCALE = 130
export const FONT_SCALE_STEP = 5

export const clampFontScale = (n: number) =>
  Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, Math.round(n / FONT_SCALE_STEP) * FONT_SCALE_STEP))

export const ACCENT_PRESETS: { id: string; name: string; hex: string }[] = [
  { id: 'violet', name: 'Violet', hex: '#7c3aed' },
  { id: 'blue', name: 'Blue', hex: '#3b82f6' },
  { id: 'sky', name: 'Sky', hex: '#0ea5e9' },
  { id: 'teal', name: 'Teal', hex: '#14b8a6' },
  { id: 'green', name: 'Green', hex: '#22c55e' },
  { id: 'amber', name: 'Amber', hex: '#f59e0b' },
  { id: 'orange', name: 'Orange', hex: '#f97316' },
  { id: 'rose', name: 'Rose', hex: '#f43f5e' },
  { id: 'pink', name: 'Pink', hex: '#ec4899' },
]

export const isHexColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const [r, g, b] = parseHex(hex).map((v) => v / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l: l * 100 }
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 }
}

const fmt = (n: number) => Math.round(n * 10) / 10

/**
 * CSS variable values (shadcn's "H S% L%" format) for an accent color. Lightness is kept in a readable band so a
 * near-white or near-black pick still gives buttons and focus rings you can see, and the text on top switches
 * between white and dark by contrast.
 */
export function accentVars(hex: string) {
  const { h, s, l } = hexToHsl(hex)
  const light = Math.min(68, Math.max(32, l))
  const [r, g, b] = parseHex(hex)
  // Perceived brightness of the *adjusted* color decides the label color.
  const adjusted = hexFromHsl(h, s, light)
  const [ar, ag, ab] = parseHex(adjusted)
  void r, g, b
  const dark = brightnessOf(ar, ag, ab) > 0.6
  return {
    primary: `${fmt(h)} ${fmt(s)}% ${fmt(light)}%`,
    foreground: dark ? '222 47% 11%' : '210 40% 98%',
  }
}

function hexFromHsl(h: number, s: number, l: number) {
  const sat = s / 100
  const lig = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sat * Math.min(lig, 1 - lig)
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const to = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`
}

/** Writes (or clears) the appearance overrides on <html>. Inline custom properties beat the stylesheet's :root / .dark values. */
export function applyAppearance(root: HTMLElement, options: { fontScale: number; accent: string | null }) {
  root.style.fontSize = options.fontScale === 100 ? '' : `${options.fontScale}%`
  if (options.accent && isHexColor(options.accent)) {
    const { primary, foreground } = accentVars(options.accent)
    root.style.setProperty('--primary', `hsl(${primary})`)
    root.style.setProperty('--ring', `hsl(${primary})`)
    root.style.setProperty('--primary-foreground', `hsl(${foreground})`)
  } else {
    for (const name of ['--primary', '--ring', '--primary-foreground']) root.style.removeProperty(name)
  }
}
