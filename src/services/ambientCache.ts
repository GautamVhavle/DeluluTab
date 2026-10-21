/**
 * One live background at a time, kept in the Cache API (this device only).
 * A hit plays from memory. A miss starts streaming immediately and saves the file
 * in the background, so the first viewing is not blocked on a full download.
 * The next new tab then plays the saved copy and makes no request.
 */
const CACHE = 'delulutab-ambient-v1'

export interface PlayableVideo {
  src: string
  release: () => void
}

async function openCache() {
  if (typeof caches === 'undefined') return null
  try {
    return await caches.open(CACHE)
  } catch {
    return null
  }
}

async function remember(cache: Cache, url: string) {
  const response = await fetch(url)
  if (!response.ok) return
  await cache.put(url, response)
  const keys = await cache.keys()
  await Promise.all(keys.filter((request) => request.url !== url).map((request) => cache.delete(request)))
}

export async function loadAmbient(url: string): Promise<PlayableVideo> {
  const cache = await openCache()
  if (cache) {
    try {
      const saved = await cache.match(url)
      if (saved) {
        const src = URL.createObjectURL(await saved.blob())
        return { src, release: () => URL.revokeObjectURL(src) }
      }
    } catch {
      // A broken cache entry should not stop the stream.
    }
    void remember(cache, url).catch(() => {})
  }
  return { src: url, release: () => {} }
}
