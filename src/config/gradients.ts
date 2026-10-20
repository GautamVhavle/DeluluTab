import { blendTones, toneFromHex, type Tone } from '@/utils/color'

interface Blob {
  color: string
  /** Position and size, as percentages. */
  x: number
  y: number
  w: number
  h: number
}

export interface GradientPreset {
  id: string
  name: string
  base: string
  blobs: [Blob, Blob, Blob]
  tone: Tone
}

function preset(id: string, name: string, base: string, colors: [string, string, string]): GradientPreset {
  const blobs: GradientPreset['blobs'] = [
    { color: colors[0], x: 18, y: 22, w: 46, h: 52 },
    { color: colors[1], x: 82, y: 18, w: 42, h: 48 },
    { color: colors[2], x: 40, y: 88, w: 56, h: 50 },
  ]
  const tone = blendTones([
    { tone: toneFromHex(base), weight: 0.55 },
    ...blobs.map((b) => ({ tone: toneFromHex(b.color), weight: 0.15 })),
  ])
  return { id, name, base, blobs, tone }
}

export const GRADIENTS: GradientPreset[] = [
  preset('aurora', 'Aurora', '#07060f', ['#7c3aed', '#22d3ee', '#e11d48']),
  preset('blue-hour', 'Blue hour', '#0b1026', ['#3b4cca', '#7a5cff', '#1fb5d4']),
  preset('sodium-lamp', 'Sodium lamp', '#1a0f05', ['#ff8a1f', '#c2410c', '#fbbf24']),
  preset('tidepool', 'Tidepool', '#04201f', ['#14b8a6', '#0ea5e9', '#2dd4bf']),
  preset('night-bus', 'Night bus', '#120a1f', ['#e11d74', '#6d28d9', '#0ea5e9']),
  preset('moss-and-rain', 'Moss & rain', '#0e1a14', ['#4d7c0f', '#15803d', '#0f766e']),
  preset('last-train', 'Last train', '#0a0f1a', ['#38bdf8', '#1e3a8a', '#a78bfa']),
  preset('paper-lantern', 'Paper lantern', '#f6e7d0', ['#f59e7b', '#f7c66b', '#e87aa3']),
  preset('fog', 'Fog', '#e6ebf2', ['#94a3b8', '#c7d2fe', '#fecaca']),
]

export const DEFAULT_GRADIENT = GRADIENTS[0]

export const gradientById = (id: string) => GRADIENTS.find((g) => g.id === id) ?? DEFAULT_GRADIENT

export function blobsCss(g: GradientPreset) {
  return g.blobs
    .map((b) => `radial-gradient(${b.w}% ${b.h}% at ${b.x}% ${b.y}%, ${b.color} 0%, transparent 70%)`)
    .join(', ')
}
