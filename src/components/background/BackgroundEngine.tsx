import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { blobsCss } from '@/lib/gradients'
import { scrimFor } from '@/lib/color'
import { useIsDark } from '@/hooks/use-theme'
import { useAppStore } from '@/store/useAppStore'
import { useBackgroundFrame, type Frame } from './useBackgroundFrame'

const FADE = 1.4

// Fine noise on top hides gradient banding and keeps flat colors from feeling like plastic.
const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`

function FrameView({ frame, blur }: { frame: Frame; blur: number }) {
  // Blurring pulls edges in, so oversize the layer a touch to keep them off-screen.
  const style = blur > 0 ? { filter: `blur(${blur}px)`, transform: 'scale(1.08)' } : undefined

  if (frame.kind === 'gradient' && frame.gradient) {
    const g = frame.gradient
    return (
      <div className="absolute inset-0" style={{ backgroundColor: g.base, ...style }}>
        <div
          className="absolute -inset-[25%] animate-drift motion-reduce:animate-none"
          style={{ backgroundImage: blobsCss(g) }}
        />
      </div>
    )
  }
  return <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${frame.src}")`, ...style }} />
}

/** Full-screen background layer: gradient presets, Unsplash photos or uploaded images, crossfaded. */
export function BackgroundEngine() {
  const frame = useBackgroundFrame()
  const dim = useAppStore((s) => s.settings.backgroundDim)
  const blur = useAppStore((s) => s.settings.backgroundBlur)
  const isDark = useIsDark()

  const scrim = frame ? scrimFor(frame.tone, isDark, dim) : null

  return (
    <MotionConfig reducedMotion="user">
      <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-slate-50 dark:bg-slate-950">
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
        <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
      </div>

      <AnimatePresence>
        {frame?.credit && (
          <motion.a
            key={frame.instance}
            href={frame.credit.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: FADE } }}
            exit={{ opacity: 0 }}
            className="fixed bottom-3 left-4 z-30 max-w-[40vw] truncate rounded-md px-2 py-1 text-[11px] text-foreground/70 outline-none backdrop-blur-sm transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Photo by {frame.credit.name} on Unsplash
          </motion.a>
        )}
      </AnimatePresence>
    </MotionConfig>
  )
}
