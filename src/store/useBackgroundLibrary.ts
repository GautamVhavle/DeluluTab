import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Tone } from '@/utils/color'
import { processImageFile } from '@/utils/imageFiles'
import { fetchRandomPhotos, UnsplashError, type UnsplashPhoto } from '@/services/unsplash'
import { createChromeStorage, subscribeToExternalChanges } from '@/services/storage/chromeStorage'

/**
 * Device-local background data. Kept out of the synced app store: images are far past the 8KB
 * sync item limit, and an Unsplash key shouldn't roam between machines.
 */

const STORAGE_KEY = 'delulutab:bg-library'
const IMAGE_KEY = (id: string) => `delulutab:bg-image:${id}`
const MAX_IMAGES = 20
const QUEUE_SIZE = 30
const QUEUE_MAX_AGE_MS = 6 * 60 * 60 * 1000
const QUEUE_LOW_WATER = 4

const storage = createChromeStorage('local')

export interface UploadedImage {
  id: string
  name: string
  /** Small data URL for the picker grid. */
  thumb: string
  tone: Tone
  bytes: number
}

type Status = 'idle' | 'loading' | 'error'

interface LibraryState {
  images: UploadedImage[]
  /** Image shown when the slideshow is off. */
  pinnedImageId: string | null
  unsplashKey: string
  unsplashQueue: UnsplashPhoto[]
  unsplashQueueQuery: string
  unsplashFetchedAt: number

  // runtime only (not persisted)
  status: Status
  error: string
  /** Bumped by "shuffle now". */
  skipTick: number

  addImages: (files: File[]) => Promise<string[]>
  removeImage: (id: string) => Promise<void>
  pinImage: (id: string) => void
  setUnsplashKey: (key: string) => void
  /** Makes sure the queue holds photos for `query`; throws UnsplashError when it can't. */
  ensureUnsplashQueue: (query: string) => Promise<void>
  skip: () => void
  clearError: () => void
}

let inflight: Promise<void> | null = null

export const readImageData = async (id: string) => (await storage.getItem(IMAGE_KEY(id))) as string | null

export const useBackgroundLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      images: [],
      pinnedImageId: null,
      unsplashKey: '',
      unsplashQueue: [],
      unsplashQueueQuery: '',
      unsplashFetchedAt: 0,
      status: 'idle',
      error: '',
      skipTick: 0,

      addImages: async (files) => {
        const problems: string[] = []
        for (const file of files) {
          if (get().images.length >= MAX_IMAGES) {
            problems.push(`You can keep up to ${MAX_IMAGES} images. Remove one to add more.`)
            break
          }
          try {
            const processed = await processImageFile(file)
            const id = crypto.randomUUID()
            try {
              await storage.setItem(IMAGE_KEY(id), processed.data)
            } catch {
              await storage.removeItem(IMAGE_KEY(id))
              throw new Error(`${file.name}: browser storage is full. Remove an image and try again.`)
            }
            set((s) => ({
              images: [...s.images, { id, name: file.name, thumb: processed.thumb, tone: processed.tone, bytes: processed.data.length }],
              pinnedImageId: s.pinnedImageId ?? id,
            }))
          } catch (err) {
            problems.push(err instanceof Error ? err.message : `${file.name}: couldn't add this image.`)
          }
        }
        return problems
      },

      removeImage: async (id) => {
        await storage.removeItem(IMAGE_KEY(id))
        set((s) => {
          const images = s.images.filter((i) => i.id !== id)
          return { images, pinnedImageId: s.pinnedImageId === id ? (images[0]?.id ?? null) : s.pinnedImageId }
        })
      },

      pinImage: (id) => set({ pinnedImageId: id }),

      setUnsplashKey: (key) => set({ unsplashKey: key.trim(), unsplashQueue: [], unsplashQueueQuery: '', unsplashFetchedAt: 0 }),

      ensureUnsplashQueue: async (query) => {
        const s = get()
        if (!s.unsplashKey) throw new UnsplashError('Add your Unsplash access key to load photos.')
        const sameQuery = s.unsplashQueueQuery === query
        const fresh = sameQuery && s.unsplashQueue.length >= QUEUE_LOW_WATER && Date.now() - s.unsplashFetchedAt < QUEUE_MAX_AGE_MS
        if (fresh) return
        if (inflight) return inflight

        set({ status: 'loading' })
        inflight = (async () => {
          try {
            const photos = await fetchRandomPhotos(s.unsplashKey, query)
            const known = sameQuery ? get().unsplashQueue : []
            const seen = new Set(known.map((p) => p.id))
            const merged = [...known, ...photos.filter((p) => !seen.has(p.id))].slice(-QUEUE_SIZE)
            set({ unsplashQueue: merged, unsplashQueueQuery: query, unsplashFetchedAt: Date.now(), status: 'idle', error: '' })
          } catch (err) {
            set({ status: 'error', error: err instanceof Error ? err.message : 'Unsplash request failed.' })
            // An aging queue for the same topic is still good to show; only fail when there's nothing.
            if (!(sameQuery && get().unsplashQueue.length > 0)) throw err
          } finally {
            inflight = null
          }
        })()
        return inflight
      },

      skip: () => set((s) => ({ skipTick: s.skipTick + 1 })),
      clearError: () => set({ status: 'idle', error: '' }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => storage),
      partialize: (s) => ({
        images: s.images,
        pinnedImageId: s.pinnedImageId,
        unsplashKey: s.unsplashKey,
        unsplashQueue: s.unsplashQueue,
        unsplashQueueQuery: s.unsplashQueueQuery,
        unsplashFetchedAt: s.unsplashFetchedAt,
      }),
    },
  ),
)

subscribeToExternalChanges(STORAGE_KEY, () => void useBackgroundLibrary.persist.rehydrate())
