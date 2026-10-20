export interface UnsplashPhoto {
  id: string
  /** Hotlinkable base URL; size/quality params are added when displayed. */
  raw: string
  /** Unsplash's dominant color, used if the image can't be sampled. */
  color: string
  author: string
  authorUrl: string
  /** Called once when a photo is used, per Unsplash API guidelines. */
  downloadLocation: string
}

const UTM = 'utm_source=delulutab&utm_medium=referral'

export const unsplashImageUrl = (p: UnsplashPhoto) =>
  `${p.raw}${p.raw.includes('?') ? '&' : '?'}w=2560&q=80&fit=max&auto=format`

export const unsplashCreditUrl = (p: UnsplashPhoto) => `${p.authorUrl}?${UTM}`
export const UNSPLASH_HOME = `https://unsplash.com/?${UTM}`

export class UnsplashError extends Error {}

export async function fetchRandomPhotos(accessKey: string, query: string, count = 12): Promise<UnsplashPhoto[]> {
  const params = new URLSearchParams({ count: String(count), orientation: 'landscape', content_filter: 'high' })
  if (query.trim()) params.set('query', query.trim())

  let res: Response
  try {
    res = await fetch(`https://api.unsplash.com/photos/random?${params}`, {
      headers: { Authorization: `Client-ID ${accessKey}`, 'Accept-Version': 'v1' },
    })
  } catch {
    throw new UnsplashError("Can't reach Unsplash. Check your connection.")
  }

  if (res.status === 401) throw new UnsplashError('Unsplash rejected that access key. Check it and try again.')
  if (res.status === 403) throw new UnsplashError('Unsplash rate limit reached (50 requests an hour on a demo key). Try again later.')
  if (res.status === 404) throw new UnsplashError(`No Unsplash photos found for “${query}”.`)
  if (!res.ok) throw new UnsplashError(`Unsplash returned an error (${res.status}).`)

  const data = await res.json()
  const list: any[] = Array.isArray(data) ? data : [data]
  return list.map((p) => ({
    id: p.id,
    raw: p.urls.raw,
    color: p.color ?? '#0f172a',
    author: p.user?.name ?? 'Unknown',
    authorUrl: p.user?.links?.html ?? 'https://unsplash.com',
    downloadLocation: p.links?.download_location ?? '',
  }))
}

/** Fire-and-forget notification that a photo was used. */
export function trackDownload(accessKey: string, photo: UnsplashPhoto) {
  if (!photo.downloadLocation) return
  fetch(photo.downloadLocation, { headers: { Authorization: `Client-ID ${accessKey}` } }).catch(() => {})
}
