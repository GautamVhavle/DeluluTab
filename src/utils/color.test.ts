import { describe, expect, it } from 'vitest'
import { GRADIENTS, styleOf, withColors } from '@/config/gradients'
import { gradientDimAlpha, scrimFor, surfaceFor, toneFromHex } from '@/utils/color'

describe('surfaceFor', () => {
  it('treats a pale wallpaper as light and a night wallpaper as dark', () => {
    expect(surfaceFor(toneFromHex('#f6f9ff').brightness)).toBe('light')
    expect(surfaceFor(toneFromHex('#07060f').brightness)).toBe('dark')
  })

  it('keeps a dark veil available for a bright photo in dark type', () => {
    const scrim = scrimFor(toneFromHex('#f4f7fb'), true, 12, false)
    expect(scrim.alpha).toBeGreaterThan(0.5)
  })
})

describe('gradientDimAlpha', () => {
  it('is a dark tint that grows with the slider and stays off at zero', () => {
    expect(gradientDimAlpha(0)).toBe(0)
    expect(gradientDimAlpha(60)).toBeGreaterThan(0.7)
    expect(gradientDimAlpha(30)).toBeGreaterThan(gradientDimAlpha(10))
  })
})

describe('gradient styles', () => {
  it('offers flow, clouds, sunrise, aurora and watercolors', () => {
    const styles = new Set(GRADIENTS.filter((g) => g.live).map((g) => styleOf(g)))
    expect(styles).toEqual(new Set(['flow', 'clouds', 'sunrise', 'aurora', 'watercolor']))
  })

  it('keeps the painting style when the palette is customised', () => {
    const clouds = GRADIENTS.find((g) => g.id === 'blue-sky')
    expect(clouds).toBeTruthy()
    expect(styleOf(withColors(clouds!, ['#112233', '#abcdef']))).toBe('clouds')
  })
})
