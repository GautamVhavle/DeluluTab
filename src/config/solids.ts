import { isHexColor } from '@/config/appearance'

/** Built-in flat colours. Dark ones first, then a few light ones. */
export const SOLID_PRESETS: { name: string; hex: string }[] = [
  { name: 'Ink', hex: '#0b1020' },
  { name: 'Slate', hex: '#1e293b' },
  { name: 'Plum', hex: '#2a1848' },
  { name: 'Pine', hex: '#10241c' },
  { name: 'Wine', hex: '#2c1218' },
  { name: 'Ocean', hex: '#0c2233' },
  { name: 'Sand', hex: '#e6dcc8' },
  { name: 'Paper', hex: '#f3f0e8' },
]

export const MAX_SOLID_CUSTOM = 8

export function cleanSolidList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const entry of value) {
    if (!isHexColor(entry)) continue
    const hex = entry.toLowerCase()
    if (seen.has(hex) || SOLID_PRESETS.some((preset) => preset.hex === hex)) continue
    seen.add(hex)
    out.push(hex)
    if (out.length >= MAX_SOLID_CUSTOM) break
  }
  return out
}
