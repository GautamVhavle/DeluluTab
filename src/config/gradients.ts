import { blendTones, toneFromHex, type Tone } from '@/utils/color'

/** How the palette is painted. Flow is the soft mesh; the others are their own fields. */
export type GradientStyle = 'flow' | 'clouds' | 'sunrise' | 'aurora' | 'watercolor'

export interface GradientPreset {
  id: string
  name: string
  /** Two to five stops. The field blends them; it is not a flat stripe. */
  colors: string[]
  tone: Tone
  /** The living palettes. Older presets stay so a saved choice still resolves. */
  live?: boolean
  /** Absent on older presets, which paint as flow. */
  style?: GradientStyle
}

function toneFor(colors: string[]): Tone {
  return blendTones(colors.map((color, i) => ({ tone: toneFromHex(color), weight: i === 0 ? 1.4 : 1 })))
}

function live(id: string, name: string, colors: string[], style: GradientStyle = 'flow'): GradientPreset {
  return { id, name, colors, tone: toneFor(colors), live: true, style }
}

function legacy(id: string, name: string, base: string, colors: [string, string, string]): GradientPreset {
  return { id, name, colors: [base, ...colors], tone: toneFor([base, ...colors]) }
}

/**
 * Living colour fields. The first twelve are the flow studies from the free
 * gradient builder (colours only, no type): a soft mesh, not a linear stripe.
 */
export const GRADIENTS: GradientPreset[] = [
  live('iridescent', 'Iridescent', ['#EAF4FC', '#1E50A2', '#F09199', '#895B8A']),
  live('opal', 'Opal', ['#F6F9FF', '#9BE0E8', '#C4B5F7', '#F8B8D9']),
  live('lagoon', 'Lagoon', ['#EAFBF7', '#5CE3E6', '#0F9CC2', '#274A78']),
  live('emerald', 'Emerald', ['#F0FBEF', '#8FE3B0', '#22C79A', '#0B5F51']),
  live('solar', 'Solar flare', ['#FFF6DE', '#FFC24B', '#F4664D', '#8A2E5E']),
  live('orchid', 'Orchid', ['#FBEFFB', '#E794C9', '#9678CE', '#4A3894']),
  live('peach', 'Peach glow', ['#FFF3EC', '#FFC9A3', '#F08A8C', '#B65E8C']),
  live('tide', 'Electric tide', ['#DFFBFF', '#6FD8F2', '#4C5BE0', '#2A2450']),
  live('sunset', 'Sunset', ['#FFE9C4', '#FFAE3F', '#F0574D', '#5D2A66']),
  live('mint', 'Mint ice', ['#F2FDF9', '#A8F0DC', '#52CBB0', '#147A5F']),
  live('midnight', 'Midnight bloom', ['#12142E', '#4C3894', '#B387E8', '#F6C6E2']),
  live('rose', 'Rose gold', ['#FFF4E8', '#FBC9AC', '#E79BA7', '#8E5A74']),
  live('blue-sky', 'Blue sky', ['#E7F3FF', '#9DCCFF', '#5B93E6', '#2C4E86'], 'clouds'),
  live('storm-light', 'Storm light', ['#EEF3F8', '#B7C3D1', '#6E7E93', '#2E3C4E'], 'clouds'),
  live('blossom-sky', 'Blossom sky', ['#FFF1F6', '#F7C1D4', '#E7A0C4', '#8E6AA8'], 'clouds'),
  live('night-clouds', 'Night clouds', ['#141A2E', '#3A4E7A', '#8B9BC4', '#D5DCF2'], 'clouds'),
  live('first-light', 'First light', ['#FFE7C2', '#FFB07A', '#F07A6A', '#5C2E55'], 'sunrise'),
  live('ember-dawn', 'Ember dawn', ['#FFD8A8', '#F08A4A', '#C4474A', '#3A1C2E'], 'sunrise'),
  live('pale-morning', 'Pale morning', ['#FDE7D2', '#F7B7A3', '#E7C4F0', '#8AA4D4'], 'sunrise'),
  live('northern', 'Northern lights', ['#07111F', '#3DDC97', '#7AF0C4', '#16324A'], 'aurora'),
  live('violet-curtain', 'Violet curtain', ['#070814', '#A855F7', '#F0ABFC', '#2A1860'], 'aurora'),
  live('solar-wind', 'Solar wind', ['#0A1020', '#38BDF8', '#FDE68A', '#1E3A5F'], 'aurora'),
  live('wet-wash', 'Wet wash', ['#F7F3EE', '#F3B6C6', '#8EC8E6', '#C7B4E8'], 'watercolor'),
  live('ink-bloom', 'Ink bloom', ['#F4F1EA', '#E8C39E', '#6FA8A0', '#3D5A80'], 'watercolor'),
  live('garden-wash', 'Garden wash', ['#F6F7E8', '#D4E6A5', '#7BC6A4', '#E7A0B4'], 'watercolor'),
  legacy('aurora', 'Aurora', '#07060f', ['#7c3aed', '#22d3ee', '#e11d48']),
  legacy('blue-hour', 'Blue hour', '#0b1026', ['#3b4cca', '#7a5cff', '#1fb5d4']),
  legacy('sodium-lamp', 'Sodium lamp', '#1a0f05', ['#ff8a1f', '#c2410c', '#fbbf24']),
  legacy('tidepool', 'Tidepool', '#04201f', ['#14b8a6', '#0ea5e9', '#2dd4bf']),
  legacy('night-bus', 'Night bus', '#120a1f', ['#e11d74', '#6d28d9', '#0ea5e9']),
  legacy('moss-and-rain', 'Moss & rain', '#0e1a14', ['#4d7c0f', '#15803d', '#0f766e']),
  legacy('last-train', 'Last train', '#0a0f1a', ['#38bdf8', '#1e3a8a', '#a78bfa']),
  legacy('paper-lantern', 'Paper lantern', '#f6e7d0', ['#f59e7b', '#f7c66b', '#e87aa3']),
  legacy('fog', 'Fog', '#e6ebf2', ['#94a3b8', '#c7d2fe', '#fecaca']),
]

export const DEFAULT_GRADIENT = GRADIENTS[0]

export const gradientById = (id: string) => GRADIENTS.find((g) => g.id === id) ?? DEFAULT_GRADIENT

/** Used when a picture cannot be loaded. A dark field, not the light default. */
export const DARK_GRADIENT = gradientById('midnight')

export function styleOf(preset: GradientPreset): GradientStyle {
  return preset.style ?? 'flow'
}

/** Swatches for building a palette. One of each stop from the living presets. */
export const GRADIENT_PALETTE = [...new Set(GRADIENTS.filter((g) => g.live).flatMap((g) => g.colors))]

const HEX = /^#[0-9a-fA-F]{6}$/

export function cleanGradientColors(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry): entry is string => typeof entry === 'string' && HEX.test(entry))
    .map((entry) => entry.toLowerCase())
    .slice(0, 5)
}

/** The colours actually on screen: a custom palette when it has at least two stops, otherwise the preset. */
export function colorsFor(preset: GradientPreset, custom: string[] | undefined): string[] {
  return custom && custom.length >= 2 ? custom : preset.colors
}

export function withColors(preset: GradientPreset, colors: string[]): GradientPreset {
  if (colors.length < 2 || colors.join() === preset.colors.join()) return preset
  return { ...preset, colors, tone: toneFor(colors) }
}

const SPOTS = [
  { x: 18, y: 24, w: 52, h: 58 },
  { x: 82, y: 16, w: 48, h: 52 },
  { x: 68, y: 78, w: 56, h: 50 },
  { x: 24, y: 80, w: 44, h: 46 },
  { x: 50, y: 46, w: 36, h: 40 },
]

/** Small still of a palette, in the shape of its style. The page draws the moving field. */
export function previewBackground(preset: GradientPreset): { backgroundColor: string; backgroundImage: string } {
  const colors = preset.colors
  if (styleOf(preset) === 'sunrise') {
    return { backgroundColor: colors[0], backgroundImage: `linear-gradient(180deg, ${colors.join(', ')})` }
  }
  if (styleOf(preset) === 'aurora') {
    const glow = colors[1] ?? colors[0]
    return {
      backgroundColor: colors[0],
      backgroundImage: `linear-gradient(180deg, transparent 22%, ${glow} 50%, transparent 78%)`,
    }
  }
  return { backgroundColor: colors[0], backgroundImage: blobsCss(colors) }
}

/** Small preview of a palette. The page itself draws the full moving field. */
export function blobsCss(colors: string[]) {
  return colors
    .map((color, i) => {
      const spot = SPOTS[i % SPOTS.length]
      return `radial-gradient(${spot.w}% ${spot.h}% at ${spot.x}% ${spot.y}%, ${color} 0%, transparent 68%)`
    })
    .join(', ')
}
