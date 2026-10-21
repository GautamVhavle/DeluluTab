/**
 * Slow, loopable scenes. Free to use under the Pexels license (no account, no key).
 * Each clip uses the sharpest file Pexels actually publishes for it. Six of them
 * have a real 4K master. The rest stop at 1080p or 720p, so those stay at that size
 * instead of pointing at a missing file. The first play streams it and keeps one
 * copy on this device. `poster` is a still shipped with the extension.
 */
import { toneFromHex, type Tone } from '@/utils/color'

export interface AmbientVideo {
  id: string
  title: string
  /** Swatch shown until the still loads, and the scrim color until the video is on screen. */
  tone: Tone
  /** Direct file. CORS is open, so it can be cached. */
  url: string
  page: string
  /** Still of the clip, bundled so choosing a scene does not download it first. */
  poster: string
}

const clip = (id: string, pexelsId: number, file: string, title: string, hex: string): AmbientVideo => ({
  id,
  title,
  tone: toneFromHex(hex),
  url: `https://videos.pexels.com/video-files/${pexelsId}/${pexelsId}-${file}.mp4`,
  page: `https://www.pexels.com/video/${pexelsId}/`,
  poster: `${import.meta.env.BASE_URL || './'}ambient/${id}.jpg`,
})

export const AMBIENT_VIDEOS: AmbientVideo[] = [
  clip('golden-coast', 1093662, 'hd_1920_1080_30fps', 'Golden coast', '#8a5a32'),
  clip('turquoise-shore', 1409899, 'uhd_3840_2160_25fps', 'Turquoise shore', '#1f6f78'),
  clip('open-water', 3571264, 'uhd_3840_2160_30fps', 'Open water', '#0f4c5c'),
  clip('deep-ocean', 1918465, 'uhd_3840_2160_24fps', 'Deep ocean', '#1c4a45'),
  clip('misty-forest', 4496266, 'hd_1920_1080_25fps', 'Misty forest', '#7d8b96'),
  clip('waterfall', 6981411, 'hd_1920_1080_25fps', 'Waterfall', '#1d4a32'),
  clip('above-clouds', 4763824, 'uhd_3840_2160_24fps', 'Above the clouds', '#5f8f62'),
  clip('still-fjord', 857198, 'hd_1280_720_25fps', 'Still fjord', '#8aa0b0'),
  clip('night-sky', 857195, 'hd_1280_720_25fps', 'Night sky', '#1c2a4a'),
  clip('milky-way', 857136, 'hd_1280_720_24fps', 'Milky Way', '#1a3348'),
  clip('night-earth', 1851190, 'uhd_3840_2160_25fps', 'Night earth', '#0c1c33'),
  clip('deep-space', 2611250, 'uhd_3840_2160_30fps', 'Deep space', '#07070f'),
]

export const DEFAULT_AMBIENT = AMBIENT_VIDEOS[0].id

export const ambientById = (id: string) => AMBIENT_VIDEOS.find((video) => video.id === id) ?? AMBIENT_VIDEOS[0]
