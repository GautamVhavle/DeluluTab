import type { FontId } from '@/types'

/**
 * The typefaces on offer. They are Google Fonts, but bundled with the extension (via @fontsource) rather than
 * fetched from fonts.googleapis.com: they work offline, add no request to Google on every new tab, and sidestep
 * the extension CSP. Each one is its own lazy chunk, so only the chosen font is ever loaded.
 */
export interface FontOption {
  id: FontId
  label: string
  /** The CSS family name the package registers. */
  family: string
  /** Full stack, with system fallbacks for characters the font lacks. */
  stack: string
  note: string
  load: () => Promise<unknown>
}

const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
const stack = (family: string, tail = SANS) => `"${family}", ${tail}`

export const FONTS: FontOption[] = [
  { id: 'inter', label: 'Inter', family: 'Inter Variable', stack: stack('Inter Variable'), note: 'Clean and neutral', load: () => import('@fontsource-variable/inter/wght.css') },
  { id: 'jetbrains', label: 'JetBrains Mono', family: 'JetBrains Mono Variable', stack: stack('JetBrains Mono Variable', 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'), note: 'Monospaced, for code people', load: () => import('@fontsource-variable/jetbrains-mono/wght.css') },
  { id: 'outfit', label: 'Outfit', family: 'Outfit Variable', stack: stack('Outfit Variable'), note: 'Geometric and friendly', load: () => import('@fontsource-variable/outfit/wght.css') },
  { id: 'space-grotesk', label: 'Space Grotesk', family: 'Space Grotesk Variable', stack: stack('Space Grotesk Variable'), note: 'Quirky and technical', load: () => import('@fontsource-variable/space-grotesk/wght.css') },
  { id: 'cinzel', label: 'Cinzel', family: 'Cinzel Variable', stack: stack('Cinzel Variable', 'Georgia, "Times New Roman", serif'), note: 'Classical capitals', load: () => import('@fontsource-variable/cinzel/wght.css') },
]

export const fontById = (id: string) => FONTS.find((f) => f.id === id) ?? FONTS[0]

const loading = new Map<FontId, Promise<boolean>>()

/**
 * Loads a font's CSS and then its actual glyph file, so text is ready to paint in it (no swap, no layout jump).
 * Resolves true when ready; resolves false rather than throwing if it can't load, so the page falls back
 * to the system font instead of failing. Safe to call repeatedly.
 */
export function loadFont(id: FontId): Promise<boolean> {
  const existing = loading.get(id)
  if (existing) return existing
  const font = fontById(id)
  const promise = (async () => {
    try {
      await font.load()
      // The CSS only declares the faces; the file downloads when something uses it. Ask for it now.
      if (typeof document !== 'undefined' && document.fonts?.load) await document.fonts.load(`400 1em "${font.family}"`, 'Aa0')
      return true
    } catch {
      loading.delete(id) // allow a retry later
      return false
    }
  })()
  loading.set(id, promise)
  return promise
}

/** Points the page's sans-serif at the chosen font. */
export function applyFont(id: FontId, root: HTMLElement = document.documentElement) {
  root.style.setProperty('--font-sans', fontById(id).stack)
  root.dataset.font = id
}
