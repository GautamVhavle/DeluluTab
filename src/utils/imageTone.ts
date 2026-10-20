import { DEFAULT_TONE, brightnessOf, toHex, toneFromHex, type Tone } from './color'

const SAMPLE = 32

/** Average color and brightness of an image, sampled on a tiny canvas. Throws if the canvas is tainted. */
export function toneOf(source: CanvasImageSource): Tone {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SAMPLE
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return DEFAULT_TONE
  ctx.drawImage(source, 0, 0, SAMPLE, SAMPLE)
  const { data } = ctx.getImageData(0, 0, SAMPLE, SAMPLE)

  let r = 0, g = 0, b = 0, brightness = 0
  const pixels = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
    brightness += brightnessOf(data[i], data[i + 1], data[i + 2])
  }
  return { brightness: brightness / pixels, color: toHex(r / pixels, g / pixels, b / pixels) }
}

function attempt(src: string, cors: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (cors) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image failed to load'))
    img.src = src
  })
}

/**
 * Preloads and decodes `src` (so a crossfade never shows a half-loaded image) and measures its tone.
 * Falls back to `fallbackColor` when the pixels can't be read (no CORS headers).
 */
export async function loadImage(src: string, fallbackColor?: string): Promise<Tone> {
  let img: HTMLImageElement
  let readable = true
  try {
    img = await attempt(src, true)
  } catch (err) {
    if (src.startsWith('data:')) throw err
    img = await attempt(src, false)
    readable = false
  }
  try {
    await img.decode()
  } catch {
    // decode() can reject for already-displayable images; onload is enough.
  }
  if (readable) {
    try {
      return toneOf(img)
    } catch {
      // fall through
    }
  }
  return fallbackColor ? toneFromHex(fallbackColor) : DEFAULT_TONE
}
