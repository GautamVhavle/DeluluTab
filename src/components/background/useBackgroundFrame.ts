import { useCallback, useEffect, useRef, useState } from 'react'
import { toneFromHex, type Tone } from '@/utils/color'
import { isHexColor } from '@/config/appearance'
import type { SolidEffect } from '@/types'
import { AMBIENT_VIDEOS, ambientById } from '@/config/ambientVideos'
import { colorsFor, DARK_GRADIENT, DEFAULT_GRADIENT, gradientById, GRADIENTS, withColors, type GradientPreset } from '@/config/gradients'
import { loadAmbient } from '@/services/ambientCache'
import { fetchPictureLink } from '@/services/pictureLink'
import { loadImage } from '@/utils/imageTone'
import { useHydrated } from '@/hooks/use-hydrated'
import { useAppStore, type BackgroundRotation } from '@/store/useAppStore'
import { readClipData, readImageData, useBackgroundLibrary } from '@/store/useBackgroundLibrary'

export interface Frame {
  /** What is shown (source + item). Re-resolving the same thing must not restart the fade. */
  key: string
  /** Unique per display, so showing A, B, A in quick succession gives A a fresh layer on top. */
  instance: number
  kind: 'gradient' | 'image' | 'video' | 'solid'
  gradient?: GradientPreset
  solid?: { color: string; effect: SolidEffect; to: string }
  src?: string
  /** Still shown until a live scene's first frame is ready. */
  poster?: string
  tone: Tone
  /** Drop a blob URL when this frame is replaced. */
  release?: () => void
  credit?: { text: string; url: string }
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

type ResolvedFrame = Omit<Frame, 'instance'> & { notice?: string }

const gradientFrame = (g: GradientPreset): ResolvedFrame => ({
  key: `gradient:${g.id}:${g.colors.join('-')}`,
  kind: 'gradient',
  gradient: g,
  tone: g.tone,
})

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
    const link = settings.imageLink.trim()
    if (link) {
      try {
        const photo = await fetchPictureLink(link)
        const tone = await loadImage(photo.src, '#0b1020')
        return { key: `link:${photo.src}`, kind: 'image', src: photo.src, tone }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'That picture link is not available.'
        if (lib.images.length === 0) return { ...gradientFrame(DARK_GRADIENT), notice: `${message} A dark gradient is on instead.` }
        const pinned = lib.images.find((i) => i.id === lib.pinnedImageId) ?? lib.images[0]
        const src = await readImageData(pinned.id)
        if (!src) return { ...gradientFrame(DARK_GRADIENT), notice: `${message} A dark gradient is on instead.` }
        const tone = await loadImage(src)
        return { key: `custom:${pinned.id}`, kind: 'image', src, tone, notice: message }
      }
    }
    if (lib.images.length === 0) return gradientFrame(DEFAULT_GRADIENT)
    const pinned = lib.images.find((i) => i.id === lib.pinnedImageId) ?? lib.images[0]
    const chosen = pick(lib.images, (i) => `custom:${i.id}`, lastKey, pinned, random)
    const src = await readImageData(chosen.id)
    if (!src) throw new Error('That image is missing from browser storage. Remove it and add it again.')
    const tone = await loadImage(src)
    return { key: `custom:${chosen.id}`, kind: 'image', src, tone }
  }

  if (settings.backgroundSource === 'solid') {
    const color = isHexColor(settings.solidColor) ? settings.solidColor.toLowerCase() : '#0b1020'
    const to = isHexColor(settings.solidEffectColor) ? settings.solidEffectColor.toLowerCase() : '#312e81'
    const effect = settings.solidEffect
    return {
      key: `solid:${color}:${effect}:${to}`,
      kind: 'solid',
      solid: { color, effect, to },
      tone: toneFromHex(color),
    }
  }

  if (settings.backgroundSource === 'video') {
    const uploadId = settings.ambientVideo.startsWith('upload:') ? settings.ambientVideo.slice('upload:'.length) : ''
    if (uploadId) {
      const clip = (lib.clips ?? []).find((item) => item.id === uploadId)
      const src = clip ? await readClipData(uploadId) : null
      if (clip && src) {
        return clip.kind === 'gif'
          ? { key: `clip:${clip.id}`, kind: 'image', src, tone: clip.tone }
          : { key: `clip:${clip.id}`, kind: 'video', src, tone: clip.tone }
      }
    }
    const pinned = ambientById(settings.ambientVideo)
    const chosen = pick(AMBIENT_VIDEOS, (video) => `video:${video.id}`, lastKey, pinned, random)
    const playable = await loadAmbient(chosen.url)
    return {
      key: `video:${chosen.id}`,
      kind: 'video',
      src: playable.src,
      poster: chosen.poster,
      release: playable.release,
      tone: chosen.tone,
      credit: { text: `${chosen.title} on Pexels`, url: chosen.page },
    }
  }

  const pinned = gradientById(settings.gradientPreset)
  const chosen = pick(GRADIENTS, (g) => `gradient:${g.id}`, lastKey, pinned, random)
  const custom = chosen.id === pinned.id ? colorsFor(chosen, settings.gradientColors) : chosen.colors
  return gradientFrame(withColors(chosen, custom))
}

/** Decides which background to show, and when to change it. */
export function useBackgroundFrame() {
  const appHydrated = useHydrated()
  const libraryHydrated = useHydrated(useBackgroundLibrary)
  const ready = appHydrated && libraryHydrated
  const source = useAppStore((s) => s.settings.backgroundSource)
  const gradientPreset = useAppStore((s) => s.settings.gradientPreset)
  const gradientColors = useAppStore((s) => s.settings.gradientColors?.join(',') ?? '')
  const ambientVideo = useAppStore((s) => s.settings.ambientVideo)
  const imageLink = useAppStore((s) => s.settings.imageLink)
  const solidColor = useAppStore((s) => s.settings.solidColor)
  const solidEffect = useAppStore((s) => s.settings.solidEffect)
  const solidEffectColor = useAppStore((s) => s.settings.solidEffectColor)
  const rotation = useAppStore((s) => s.settings.backgroundRotation)
  const imageIds = useBackgroundLibrary((s) => s.images.map((i) => i.id).join(','))
  const clipIds = useBackgroundLibrary((s) => (s.clips ?? []).map((clip) => clip.id).join(','))
  const pinnedImageId = useBackgroundLibrary((s) => s.pinnedImageId)
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
      if (id !== request.current) {
        next.release?.()
        return
      }
      const { notice, ...frame } = next
      if (notice) useBackgroundLibrary.setState({ status: 'error', error: notice })
      else useBackgroundLibrary.getState().clearError()
      if (frame.key === lastKey.current) {
        frame.release?.()
        return
      }
      lastKey.current = frame.key
      setFrame((current) => {
        current?.release?.()
        return { ...frame, instance: ++instances.current }
      })
    } catch (err) {
      if (id !== request.current) return
      useBackgroundLibrary.setState({ status: 'error', error: err instanceof Error ? err.message : 'Background failed to load.' })
      // Never leave the page without a background.
      setFrame((current) => {
        if (current) return current
        lastKey.current = gradientFrame(DARK_GRADIENT).key
        return { ...gradientFrame(DARK_GRADIENT), instance: ++instances.current }
      })
    }
  }, [])

  // Show something on boot and whenever the user changes what they're looking at.
  useEffect(() => {
    if (!ready) return
    run(booted.current ? 'config' : 'mount')
    booted.current = true
  }, [ready, source, gradientPreset, gradientColors, ambientVideo, imageLink, solidColor, solidEffect, solidEffectColor, imageIds, clipIds, pinnedImageId, run])

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
