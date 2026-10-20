import { toneOf } from './imageTone'
import type { Tone } from './color'

const MAX_EDGE = 2560
const THUMB_EDGE = 220
export const MAX_FILE_BYTES = 30 * 1024 * 1024
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

export interface ProcessedImage {
  /** Wallpaper-sized JPEG data URL. */
  data: string
  /** Small JPEG data URL for the picker. */
  thumb: string
  tone: Tone
}

function render(bitmap: ImageBitmap, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#0f172a' // transparent PNGs would otherwise turn black
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** Downscales and recompresses an upload so a handful of wallpapers fit comfortably in chrome.storage.local. */
export async function processImageFile(file: File): Promise<ProcessedImage> {
  if (!ACCEPTED_TYPES.includes(file.type)) throw new Error(`${file.name}: use a JPEG, PNG, WebP or AVIF image.`)
  if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name}: images over 30 MB are too large.`)

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error(`${file.name}: couldn't read this image.`)
  }
  try {
    const full = render(bitmap, MAX_EDGE)
    const thumb = render(bitmap, THUMB_EDGE)
    return {
      data: full.toDataURL('image/jpeg', 0.84),
      thumb: thumb.toDataURL('image/jpeg', 0.7),
      tone: toneOf(thumb),
    }
  } finally {
    bitmap.close()
  }
}
