import { useEffect, useLayoutEffect, useRef, useState, type SyntheticEvent } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { styleOf } from '@/config/gradients'
import { MeshField } from './MeshField'
import { LivingField } from './LivingField'
import { SolidField } from './SolidField'
import { gradientDimAlpha, scrimFor, surfaceFor } from '@/utils/color'
import { useAppStore } from '@/store/useAppStore'
import { useBackgroundFrame, type Frame } from './useBackgroundFrame'

const FADE = 1.4

// Fine noise on top hides gradient banding and keeps flat colors from feeling like plastic.
const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`

function FrameView({ frame, blur }: { frame: Frame; blur: number }) {
  // Blurring pulls edges in, so oversize the layer a touch to keep them off-screen.
  const style = blur > 0 ? { filter: `blur(${blur}px)`, transform: 'scale(1.08)' } : undefined

  if (frame.kind === 'solid' && frame.solid) {
    return (
      <div className="absolute inset-0 overflow-hidden" style={style}>
        <SolidField color={frame.solid.color} effect={frame.solid.effect} to={frame.solid.to} />
      </div>
    )
  }
  if (frame.kind === 'gradient' && frame.gradient) {
    const paint = styleOf(frame.gradient)
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: frame.gradient.colors[0], ...style }}>
        {paint === 'flow' ? <MeshField colors={frame.gradient.colors} /> : <LivingField style={paint} colors={frame.gradient.colors} />}
      </div>
    )
  }
  if (frame.kind === 'video' && frame.src) {
    return <AmbientVideo src={frame.src} poster={frame.poster} style={style} />
  }
  return <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${frame.src}")`, ...style }} />
}

const CLIP_RATE = 0.8
const HANDOFF_S = 1.6

/**
 * Two copies of the same clip. Near the end of one, the other fades in from the start,
 * so the loop doesn't cut. Played a little slower than the file, because a short clip
 * otherwise feels rushed. One copy, and a hard loop, when motion is reduced.
 */
function AmbientVideo({ src, poster, style }: { src: string; poster?: string; style?: { filter: string; transform: string } }) {
  const first = useRef<HTMLVideoElement>(null)
  const second = useRef<HTMLVideoElement>(null)
  const [active, setActive] = useState(0)
  const [smooth, setSmooth] = useState(true)
  const handoff = useRef(false)
  const refs = [first, second]

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setSmooth(!reduced.matches)
    apply()
    reduced.addEventListener('change', apply)
    return () => reduced.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    handoff.current = false
    setActive(0)
  }, [src])

  useEffect(() => {
    handoff.current = false
    const nodes = refs.map((ref) => ref.current)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => {
      const paused = document.hidden || reduced.matches
      nodes.forEach((node, index) => {
        if (!node) return
        node.muted = true
        node.playbackRate = CLIP_RATE
        const playing = smooth ? index === active : index === 0
        if (paused || !playing) node.pause()
        else void node.play().catch(() => {})
      })
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    reduced.addEventListener('change', sync)
    return () => {
      document.removeEventListener('visibilitychange', sync)
      reduced.removeEventListener('change', sync)
    }
    // refs are stable objects; active and src decide which copy is playing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, active, smooth])

  const onTime = (index: number) => (event: SyntheticEvent<HTMLVideoElement>) => {
    if (!smooth || index !== active || handoff.current) return
    const video = event.currentTarget
    if (!Number.isFinite(video.duration) || video.duration < 4) return
    if (video.duration - video.currentTime > HANDOFF_S) return
    const next = index === 0 ? 1 : 0
    const other = refs[next].current
    if (!other) return
    handoff.current = true
    other.currentTime = 0
    other.playbackRate = CLIP_RATE
    void other.play().catch(() => {})
    setActive(next)
  }

  const shown = smooth ? [0, 1] : [0]
  return (
    <>
      {shown.map((index) => (
        <video
          key={index}
          ref={index === 0 ? first : second}
          src={src}
          poster={poster}
          muted
          loop={!smooth}
          playsInline
          autoPlay={index === 0}
          preload="auto"
          onTimeUpdate={onTime(index)}
          className="absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out"
          style={{ ...style, transitionDuration: '1400ms', opacity: !smooth || active === index ? 1 : 0 }}
        />
      ))}
    </>
  )
}

/** Full-screen background layer: colours, gradients, live scenes or uploaded images, crossfaded. */
export function BackgroundEngine() {
  const frame = useBackgroundFrame()
  const dim = useAppStore((s) => s.settings.backgroundDim)
  const blur = useAppStore((s) => s.settings.backgroundBlur)
  // Type that sits on the wallpaper follows the wallpaper. A light field keeps a pale veil
  // (dark type), a dark field keeps a dark veil (light type). Cards keep the theme.
  const lightWallpaper = frame ? surfaceFor(frame.tone.brightness) === 'light' : false
  // A picture keeps the adaptive veil. A gradient's Dim slider is a real dark tint, applied on its own
  // so dragging it darkens immediately instead of washing the colour toward white.
  const tinted = frame?.kind === 'gradient' || frame?.kind === 'solid'
  const scrim = frame && !tinted ? scrimFor(frame.tone, !lightWallpaper, dim, false) : null
  const gradientDim = tinted ? gradientDimAlpha(dim) : 0

  useLayoutEffect(() => {
    if (!frame) return
    const root = document.documentElement
    root.dataset.bg = surfaceFor(frame.tone.brightness)
    return () => {
      delete root.dataset.bg
    }
  }, [frame])

  return (
    <MotionConfig reducedMotion="user">
      <div aria-hidden className="wallpaper-layer fixed inset-0 -z-10 overflow-hidden bg-slate-50 dark:bg-slate-950">
        {/* Crossfade: no dark dip, because the outgoing layer stays put underneath. */}
        <AnimatePresence initial>
          {frame && (
            <motion.div
              key={frame.instance}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: FADE, ease: [0.22, 1, 0.36, 1] } }}
              // Hold the outgoing layer fully opaque while the new one fades in on top, then drop it.
              // (Animating opacity 1 -> 1 would be a no-op and remove it instantly.)
              exit={{ opacity: 0, transition: { delay: FADE, duration: 0.01 } }}
            >
              <FrameView frame={frame} blur={blur} />
            </motion.div>
          )}
        </AnimatePresence>

        {scrim && (
          <motion.div
            className="absolute inset-0"
            style={{ backgroundColor: scrim.color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: scrim.alpha }}
            transition={{ duration: 0.9 }}
          />
        )}
        {tinted && (
          <div className="pointer-events-none absolute inset-0 bg-[#020617] transition-opacity duration-200" style={{ opacity: gradientDim }} />
        )}
        <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
      </div>

    </MotionConfig>
  )
}
