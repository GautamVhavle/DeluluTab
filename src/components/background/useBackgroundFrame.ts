import { useCallback, useEffect, useRef, useState } from 'react'
import type { Tone } from '@/utils/color'
import { DEFAULT_GRADIENT, gradientById, GRADIENTS, type GradientPreset } from '@/config/gradients'
import { loadImage } from '@/utils/imageTone'
import { trackDownload, unsplashCreditUrl, unsplashImageUrl, type UnsplashPhoto } from '@/services/unsplash'
import { useHydrated } from '@/hooks/use-hydrated'
import { useAppStore, type BackgroundRotation } from '@/store/useAppStore'
import { readImageData, useBackgroundLibrary } from '@/store/useBackgroundLibrary'

export interface Frame {
  /** What is shown (source + item). Re-resolving the same thing must not restart the fade. */
  key: string
  /** Unique per display, so showing A, B, A in quick succession gives A a fresh layer on top. */
  instance: number
  kind: 'gradient' | 'image'
  gradient?: GradientPreset
  src?: string
  tone: Tone
  credit?: { name: string; url: string }
}

const ROTATION_MS: Partial<Record<BackgroundRotation, number>> = {
  '1m': 60_000,
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '1h': 60 * 60_000,
}

/**
 * - mount:  a tab just opened (random pick if the slideshow is on, else the pinned one)
 * - config: the user changed source/preset/topic/pinned image (show exactly what they chose)
 * - tick:   the slideshow timer fired
 * - skip:   "shuffle now"
 */
type Reason = 'mount' | 'config' | 'tick' | 'skip'

type ResolvedFrame = Omit<Frame, 'instance'>

const gradientFrame = (g: GradientPreset): ResolvedFrame => ({ key: `gradient:${g.id}`, kind: 'gradient', gradient: g, tone: g.tone })

const tracked = new Set<string>()

function pick<T>(pool: T[], keyOf: (t: T) => string, lastKey: string | undefined, pinned: T | undefined, random: boolean): T {
  if (!random && pinned) return pinned
  const options = pool.length > 1 ? pool.filter((p) => keyOf(p) !== lastKey) : pool
  return options[Math.floor(Math.random() * options.length)]
}

async function resolveFrame(reason: Reason, lastKey: string | undefined): Promise<ResolvedFrame> {
  const { settings } = useAppStore.getState()
  const lib = useBackgroundLibrary.getState()
  const rotating = settings.backgroundRotation !== 'off'
  const random = reason === 'tick' || reason === 'skip' || (reason === 'mount' && rotating)

  if (settings.backgroundSource === 'custom') {
    if (lib.images.length === 0) return gradientFrame(DEFAULT_GRADIENT)
    const pinned = lib.images.find((i) => i.id === lib.pinnedImageId) ?? lib.images[0]
    const chosen = pick(lib.images, (i) => `custom:${i.id}`, lastKey, pinned, random)
    const src = await readImageData(chosen.id)
    if (!src) throw new Error('That image is missing from browser storage. Remove it and add it again.')
    const tone = await loadImage(src)
    return { key: `custom:${chosen.id}`, kind: 'image', src, tone }
  }

  if (settings.backgroundSource === 'unsplash') {
    await lib.ensureUnsplashQueue(settings.unsplashQuery)
    const queue = useBackgroundLibrary.getState().unsplashQueue
    if (queue.length === 0) throw new Error(`No Unsplash photos found for “${settings.unsplashQuery}”.`)
    const chosen: UnsplashPhoto = pick(queue, (p) => `unsplash:${p.id}`, lastKey, queue[0], random || reason === 'config')
    const tone = await loadImage(unsplashImageUrl(chosen), chosen.color)
    if (!tracked.has(chosen.id)) {
      tracked.add(chosen.id)
      trackDownload(lib.unsplashKey, chosen)
    }
    return {
      key: `unsplash:${chosen.id}`,
      kind: 'image',
      src: unsplashImageUrl(chosen),
      tone,
      credit: { name: chosen.author, url: unsplashCreditUrl(chosen) },
    }
  }

  const pinned = gradientById(settings.gradientPreset)
  return gradientFrame(pick(GRADIENTS, (g) => `gradient:${g.id}`, lastKey, pinned, random))
}

/** Decides which background to show, and when to change it. */
export function useBackgroundFrame() {
  const appHydrated = useHydrated()
  const libraryHydrated = useHydrated(useBackgroundLibrary)
  const ready = appHydrated && libraryHydrated
  const source = useAppStore((s) => s.settings.backgroundSource)
  const gradientPreset = useAppStore((s) => s.settings.gradientPreset)
  const unsplashQuery = useAppStore((s) => s.settings.unsplashQuery)
  const rotation = useAppStore((s) => s.settings.backgroundRotation)
  const imageIds = useBackgroundLibrary((s) => s.images.map((i) => i.id).join(','))
  const pinnedImageId = useBackgroundLibrary((s) => s.pinnedImageId)
  const unsplashKey = useBackgroundLibrary((s) => s.unsplashKey)
  const skipTick = useBackgroundLibrary((s) => s.skipTick)

  const [frame, setFrame] = useState<Frame | null>(null)
  const lastKey = useRef<string | undefined>(undefined)
  const request = useRef(0)
  const booted = useRef(false)
  const instances = useRef(0)

  const run = useCallback(async (reason: Reason) => {
    const id = ++request.current
    try {
      const next = await resolveFrame(reason, lastKey.current)
      if (id !== request.current) return // a newer request won
      if (useAppStore.getState().settings.backgroundSource !== 'unsplash') useBackgroundLibrary.getState().clearError()
      if (next.key === lastKey.current) return // already showing it
      lastKey.current = next.key
      setFrame({ ...next, instance: ++instances.current })
    } catch (err) {
      if (id !== request.current) return
      useBackgroundLibrary.setState({ status: 'error', error: err instanceof Error ? err.message : 'Background failed to load.' })
      // Never leave the page without a background.
      setFrame((current) => {
        if (current) return current
        lastKey.current = gradientFrame(DEFAULT_GRADIENT).key
        return { ...gradientFrame(DEFAULT_GRADIENT), instance: ++instances.current }
      })
    }
  }, [])

  // Show something on boot and whenever the user changes what they're looking at.
  useEffect(() => {
    if (!ready) return
    run(booted.current ? 'config' : 'mount')
    booted.current = true
  }, [ready, source, gradientPreset, unsplashQuery, imageIds, pinnedImageId, unsplashKey, run])

  const interval = ROTATION_MS[rotation]
  useEffect(() => {
    if (!ready || !interval) return
    const id = setInterval(() => {
      if (!document.hidden) run('tick')
    }, interval)
    return () => clearInterval(id)
  }, [ready, interval, run])

  const lastSkip = useRef(skipTick)
  useEffect(() => {
    if (skipTick === lastSkip.current) return
    lastSkip.current = skipTick
    run('skip')
  }, [skipTick, run])

  return frame
}
