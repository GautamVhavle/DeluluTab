import { fetchJson } from '@/services/fetchJson'

export interface PictureLink {
  src: string
  title: string
}

const IMAGE = /\.(jpe?g|png|webp|avif|gif)(\?|#|$)/i

function httpsUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

/** A picture address hiding in a small JSON file: `{ "url": "https://…" }` or `{ "hdurl" }`. */
export function photoFromJson(value: unknown): PictureLink | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const src = httpsUrl(record.hdurl) ?? httpsUrl(record.url) ?? httpsUrl(record.image) ?? httpsUrl(record.src)
  if (!src) {
    const images = record.images
    if (Array.isArray(images) && images[0] && typeof images[0] === 'object') {
      const first = images[0] as Record<string, unknown>
      const nested = httpsUrl(first.url) ?? httpsUrl(first.src)
      if (!nested) return null
      return { src: nested, title: typeof first.title === 'string' ? first.title : 'Your photo' }
    }
    return null
  }
  const title = typeof record.title === 'string' && record.title.trim() ? record.title.trim() : 'Your photo'
  return { src, title }
}

/** An https picture, or JSON that points at one. */
export async function fetchPictureLink(raw: string, signal?: AbortSignal): Promise<PictureLink> {
  const href = httpsUrl(raw.trim())
  if (!href) throw new Error('Use an https link to a picture.')
  if (IMAGE.test(href)) return { src: href, title: 'Your photo' }
  try {
    const parsed = photoFromJson(await fetchJson(href, signal))
    if (!parsed) throw new Error('That file needs a picture address, like { "url": "https://…" }.')
    return parsed
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('That file')) throw err
    throw new Error("That link didn't load. Use a direct https picture, or JSON with a url.")
  }
}
