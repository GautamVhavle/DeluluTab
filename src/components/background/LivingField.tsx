import { useEffect, useRef } from 'react'
import type { GradientStyle } from '@/config/gradients'
import { parseHex } from '@/utils/color'

type PaintStyle = Exclude<GradientStyle, 'flow'>
type RGB = [number, number, number]

const rgba = (rgb: RGB, alpha: number) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`

function brightness(rgb: RGB) {
  return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255
}

function sample(stops: RGB[], u: number): RGB {
  const x = Math.min(0.9999, Math.max(0, u)) * (stops.length - 1)
  const i = Math.floor(x)
  const f = x - i
  const a = stops[i]
  const b = stops[Math.min(stops.length - 1, i + 1)]
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]
}

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453
  return x - Math.floor(x)
}

function drawClouds(ctx: CanvasRenderingContext2D, w: number, h: number, stops: RGB[], t: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  stops.forEach((stop, i) => sky.addColorStop(i / Math.max(1, stops.length - 1), rgba(stop, 1)))
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)
  stops.forEach((color, i) => {
    const cx = w * (0.5 + 0.36 * Math.sin(t * 0.15 + i * 1.7))
    const cy = h * (0.38 + 0.22 * Math.cos(t * 0.11 + i * 1.3))
    const r = w * (0.38 + 0.06 * Math.sin(t * 0.2 + i))
    const puff = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r)
    puff.addColorStop(0, rgba(color, 0.9))
    puff.addColorStop(1, rgba(color, 0))
    ctx.fillStyle = puff
    ctx.fillRect(0, 0, w, h)
  })
}

function drawSunrise(ctx: CanvasRenderingContext2D, w: number, h: number, stops: RGB[], t: number, buffer: { data: ImageData | null }) {
  if (!buffer.data || buffer.data.width !== w || buffer.data.height !== h) buffer.data = ctx.createImageData(w, h)
  const pixels = buffer.data.data
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const warp = Math.sin(x * 0.045 + t * 0.35) * 0.07 + Math.sin(x * 0.018 - t * 0.22) * 0.05
      const [r, g, b] = sample(stops, y / h + warp)
      const i = (y * w + x) * 4
      pixels[i] = r
      pixels[i + 1] = g
      pixels[i + 2] = b
      pixels[i + 3] = 255
    }
  }
  ctx.putImageData(buffer.data, 0, 0)
}

function drawAurora(ctx: CanvasRenderingContext2D, w: number, h: number, stops: RGB[], t: number) {
  const ranked = [...stops].sort((a, b) => brightness(a) - brightness(b))
  const sky = ranked[0]
  const lights = ranked.slice(1)
  ctx.globalCompositeOperation = 'source-over'
  ctx.shadowBlur = 0
  ctx.fillStyle = rgba(sky, 1)
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 70; i++) {
    const x = hash(i * 3.1) * w
    const y = hash(i * 7.7) * h * 0.75
    ctx.globalAlpha = 0.35 + hash(i * 1.9) * 0.6
    ctx.fillStyle = '#fff'
    ctx.fillRect(x, y, hash(i * 1.3) > 0.88 ? 2 : 1, hash(i * 1.3) > 0.88 ? 2 : 1)
  }
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  lights.forEach((color, i) => {
    ctx.beginPath()
    const amp = h * (0.09 + i * 0.02)
    const base = h * (0.42 + i * 0.07)
    for (let x = 0; x <= w; x += 8) {
      const y =
        base +
        Math.sin(x * 0.007 + t * 0.32 + i) * amp +
        Math.sin(x * 0.019 - t * 0.45 + i * 2) * amp * 0.4
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = rgba(color, 0.45)
    ctx.lineWidth = h * Math.max(0.05, 0.18 - i * 0.04)
    ctx.shadowColor = rgba(color, 0.85)
    ctx.shadowBlur = 32
    ctx.stroke()
  })
  ctx.shadowBlur = 0
  ctx.globalCompositeOperation = 'source-over'
}

function drawWatercolor(ctx: CanvasRenderingContext2D, w: number, h: number, stops: RGB[], t: number) {
  const paper = [...stops].sort((a, b) => brightness(b) - brightness(a))[0]
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = rgba(paper, 1)
  ctx.fillRect(0, 0, w, h)
  stops.forEach((color, i) => {
    const cx = w * (0.5 + 0.32 * Math.sin(t * 0.11 + i * 2.1))
    const cy = h * (0.5 + 0.28 * Math.cos(t * 0.09 + i * 1.4))
    const r = Math.max(w, h) * (0.46 + 0.05 * Math.sin(t * 0.17 + i))
    const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    bloom.addColorStop(0, rgba(color, 0.62))
    bloom.addColorStop(0.5, rgba(color, 0.22))
    bloom.addColorStop(1, rgba(color, 0))
    ctx.fillStyle = bloom
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()
  })
}

/**
 * Painted fields other than the mesh: a cloudy sky, a warped sunrise, an aurora
 * curtain, or a watercolour wash. Drawn small and scaled up, so the blend stays soft,
 * and stopped when the tab is hidden or motion is reduced.
 */
export function LivingField({ style, colors }: { style: PaintStyle; colors: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const key = colors.join(',')

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d', { alpha: false })
    if (!canvas || !ctx) return

    const stops = colors.map((hex) => parseHex(hex) as RGB)
    const buffer: { data: ImageData | null } = { data: null }
    let raf = 0
    let running = false
    let last = 0
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const wide = style === 'aurora' ? 560 : 280
      const ratio = parent.clientWidth / Math.max(1, parent.clientHeight)
      canvas.width = wide
      canvas.height = Math.max(90, Math.round(wide / Math.min(2.4, Math.max(0.8, ratio))))
    }

    const paint = (t: number) => {
      const { width: w, height: h } = canvas
      if (w === 0 || h === 0) return
      if (style === 'clouds') drawClouds(ctx, w, h, stops, t)
      else if (style === 'sunrise') drawSunrise(ctx, w, h, stops, t, buffer)
      else if (style === 'aurora') drawAurora(ctx, w, h, stops, t)
      else drawWatercolor(ctx, w, h, stops, t)
    }

    const tick = (now: number) => {
      if (now - last > 32) {
        last = now
        paint(now / 1000)
      }
      if (running) raf = requestAnimationFrame(tick)
    }

    const sync = () => {
      cancelAnimationFrame(raf)
      running = !document.hidden && !reduced.matches
      if (running) raf = requestAnimationFrame(tick)
      else paint(8)
    }

    resize()
    const observer = new ResizeObserver(() => {
      resize()
      if (!running) paint(8)
    })
    if (canvas.parentElement) observer.observe(canvas.parentElement)
    sync()
    document.addEventListener('visibilitychange', sync)
    reduced.addEventListener('change', sync)
    return () => {
      running = false
      cancelAnimationFrame(raf)
      observer.disconnect()
      document.removeEventListener('visibilitychange', sync)
      reduced.removeEventListener('change', sync)
    }
  }, [style, key, colors])

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />
}
