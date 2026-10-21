import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Tone } from '@/utils/color'
import { processClipFile, MAX_CLIPS } from '@/utils/clipFiles'
import { processImageFile } from '@/utils/imageFiles'
import { createChromeStorage, subscribeToExternalChanges } from '@/services/storage/chromeStorage'

/**
 * Device-local background data. Kept out of the synced app store: images are far past the 8KB
 * sync item limit.
 */

const STORAGE_KEY = 'delulutab:bg-library'
const IMAGE_KEY = (id: string) => `delulutab:bg-image:${id}`
const CLIP_KEY = (id: string) => `delulutab:bg-clip:${id}`
const MAX_IMAGES = 20

const storage = createChromeStorage('local')

export interface UploadedImage {
  id: string
  name: string
  /** Small data URL for the picker grid. */
  thumb: string
  tone: Tone
  bytes: number
}

export interface UploadedClip {
  id: string
  name: string
  kind: 'video' | 'gif'
  thumb: string
  tone: Tone
  bytes: number
}

type Status = 'idle' | 'loading' | 'error'

interface LibraryState {
  images: UploadedImage[]
  clips: UploadedClip[]
  /** Image shown when the slideshow is off. */
  pinnedImageId: string | null

  // runtime only (not persisted)
  status: Status
  error: string
  /** Bumped by "shuffle now". */
  skipTick: number

  addImages: (files: File[]) => Promise<string[]>
  addClips: (files: File[]) => Promise<string[]>
  removeImage: (id: string) => Promise<void>
  removeClip: (id: string) => Promise<void>
  pinImage: (id: string) => void
  skip: () => void
  clearError: () => void
}

export const readImageData = async (id: string) => (await storage.getItem(IMAGE_KEY(id))) as string | null
export const readClipData = async (id: string) => (await storage.getItem(CLIP_KEY(id))) as string | null

export const useBackgroundLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      images: [],
      clips: [],
      pinnedImageId: null,
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

      addClips: async (files) => {
        const problems: string[] = []
        for (const file of files) {
          if (get().clips.length >= MAX_CLIPS) {
            problems.push(`You can keep up to ${MAX_CLIPS} clips. Remove one to add more.`)
            break
          }
          try {
            const processed = await processClipFile(file)
            const id = crypto.randomUUID()
            try {
              await storage.setItem(CLIP_KEY(id), processed.data)
            } catch {
              await storage.removeItem(CLIP_KEY(id))
              throw new Error(`${file.name}: browser storage is full. Remove a clip and try again.`)
            }
            set((s) => ({
              clips: [...s.clips, { id, name: file.name, kind: processed.kind, thumb: processed.thumb, tone: processed.tone, bytes: file.size }],
            }))
          } catch (err) {
            problems.push(err instanceof Error ? err.message : `${file.name}: couldn't add this clip.`)
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

      removeClip: async (id) => {
        await storage.removeItem(CLIP_KEY(id))
        set((s) => ({ clips: s.clips.filter((clip) => clip.id !== id) }))
      },

      pinImage: (id) => set({ pinnedImageId: id }),

      skip: () => set((s) => ({ skipTick: s.skipTick + 1 })),
      clearError: () => set({ status: 'idle', error: '' }),
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      migrate: (persisted) => {
        const state = { ...(persisted as Record<string, unknown>) }
        delete state.unsplashKey
        delete state.unsplashQueue
        delete state.unsplashQueueQuery
        delete state.unsplashFetchedAt
        return state as unknown as LibraryState
      },
      storage: createJSONStorage(() => storage),
      partialize: (s) => ({
        images: s.images,
        clips: s.clips,
        pinnedImageId: s.pinnedImageId,
      }),
    },
  ),
)

subscribeToExternalChanges(STORAGE_KEY, () => void useBackgroundLibrary.persist.rehydrate())
