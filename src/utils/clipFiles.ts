import { toneOf } from './imageTone'
import type { Tone } from './color'

export const MAX_CLIP_BYTES = 40 * 1024 * 1024
export const MAX_CLIPS = 4

const VIDEO_TYPES = ['video/mp4', 'video/webm']

export interface ProcessedClip {
  data: string
  thumb: string
  tone: Tone
  kind: 'video' | 'gif'
}

function readData(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error(`${file.name}: couldn't read this file.`))
    reader.readAsDataURL(file)
  })
}

function videoFrame(file: File): Promise<{ thumb: string; tone: Tone }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.src = url
    const done = (error?: Error) => {
      URL.revokeObjectURL(url)
      if (error) reject(error)
    }
    video.onerror = () => done(new Error(`${file.name}: couldn't read this video.`))
    video.onloadeddata = () => {
      const paint = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 320
        canvas.height = 180
        const ctx = canvas.getContext('2d')
        if (!ctx) return done(new Error(`${file.name}: couldn't read this video.`))
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(url)
        resolve({ thumb: canvas.toDataURL('image/jpeg', 0.7), tone: toneOf(canvas) })
      }
      if (video.currentTime > 0) paint()
      else {
        video.onseeked = paint
        video.currentTime = Math.min(0.4, Number.isFinite(video.duration) ? video.duration / 3 : 0.1)
      }
    }
  })
}

async function gifFrame(file: File): Promise<{ thumb: string; tone: Tone }> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error(`${file.name}: couldn't read this GIF.`)
  }
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 180
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error(`${file.name}: couldn't read this GIF.`)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return { thumb: canvas.toDataURL('image/jpeg', 0.7), tone: toneOf(canvas) }
  } finally {
    bitmap.close()
  }
}

/** Keeps a video or GIF as itself, and a small still for the picker. */
export async function processClipFile(file: File): Promise<ProcessedClip> {
  const gif = file.type === 'image/gif'
  const video = VIDEO_TYPES.includes(file.type)
  if (!gif && !video) throw new Error(`${file.name}: use an MP4, WebM or GIF.`)
  if (file.size > MAX_CLIP_BYTES) throw new Error(`${file.name}: clips over 40 MB are too large.`)
  const still = gif ? await gifFrame(file) : await videoFrame(file)
  return { ...still, data: await readData(file), kind: gif ? 'gif' : 'video' }
}
