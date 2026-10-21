import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { Check, X, Zap } from '@/components/common/icons'
import { resolveChords, type ChordEngineState, type ResolvedChord } from '@/utils/chords'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/store/useAppStore'
import { ShortcutIcon } from '@/components/shortcuts/ShortcutIcon'

type Tone = 'listening' | 'valid' | 'invalid' | 'success'

const TONES: Record<Tone, { ring: string; glow: string; text: string; bar: string; label: string }> = {
  listening: {
    ring: 'border-cyan-400/40',
    glow: 'shadow-[0_0_40px_-8px_rgba(34,211,238,0.45)]',
    text: 'text-cyan-300',
    bar: 'bg-cyan-400',
    label: 'Listening',
  },
  valid: {
    ring: 'border-amber-300/50',
    glow: 'shadow-[0_0_40px_-8px_rgba(252,211,77,0.45)]',
    text: 'text-amber-300',
    bar: 'bg-amber-300',
    label: 'Match · pause to launch',
  },
  invalid: {
    ring: 'border-red-500/50',
    glow: 'shadow-[0_0_40px_-8px_rgba(239,68,68,0.5)]',
    text: 'text-red-400',
    bar: 'bg-red-500',
    label: 'No chord',
  },
  success: {
    ring: 'border-emerald-400/60',
    glow: 'shadow-[0_0_48px_-6px_rgba(52,211,153,0.6)]',
    text: 'text-emerald-300',
    bar: 'bg-emerald-400',
    label: 'Chord accepted',
  },
}

const MAX_CANDIDATES = 4

/** The card that appears while a chord is typed. The live HUD and the settings preview share it. */
export function ChordHudCard({
  state,
  chords,
  windowMs,
  className,
}: {
  state: ChordEngineState
  chords: ResolvedChord[]
  windowMs: number
  className?: string
}) {
  const candidates = chords.filter((c) => c.sequence.startsWith(state.buffer))
  const matched = chords.find((c) => c.id === state.matchedId)
  const tone: Tone =
    state.status === 'success' ? 'success' : state.status === 'invalid' ? 'invalid' : state.matchedId ? 'valid' : 'listening'
  const t = TONES[tone]

  return (
    <motion.div
      animate={tone === 'invalid' ? { x: [0, -9, 9, -6, 6, 0] } : { x: 0 }}
      transition={{ duration: 0.38 }}
      className={cn(
        'relative w-full max-w-md overflow-hidden rounded-2xl border bg-slate-950/85 p-4 text-slate-100 backdrop-blur-xl transition-[border-color,box-shadow] duration-300',
        t.ring,
        t.glow,
        className,
      )}
    >
              {/* faint grid + top sheen */}
              <div
                aria-hidden
                className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)] [background-size:22px_22px]"
              />
              <div aria-hidden className={cn('absolute inset-x-0 top-0 h-px opacity-80', t.bar)} />

              <div className="relative flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em]">
                <span className="flex items-center gap-2 text-slate-400">
                  <Zap className={cn('h-3 w-3', t.text)} /> Chord
                </span>
                <span className={cn('flex items-center gap-1.5 transition-colors', t.text)}>
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.1, repeat: Infinity }}
                    className={cn('h-1.5 w-1.5 rounded-full', t.bar)}
                  />
                  {tone === 'success' && matched ? `Opening ${matched.title}` : t.label}
                </span>
              </div>

              {/* typed keys */}
              <div className="relative my-4 flex min-h-12 items-center justify-center gap-2" aria-label={`Typed ${state.buffer}`}>
                <AnimatePresence initial={false} mode="popLayout">
                  {[...state.buffer].map((ch, i) => (
                    <motion.kbd
                      key={`${i}-${ch}`}
                      layout
                      initial={{ opacity: 0, y: 14, scale: 0.5 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.6 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 28 }}
                      className={cn(
                        'grid h-11 min-w-11 place-items-center rounded-lg border bg-slate-900 px-2 font-mono text-xl font-semibold uppercase shadow-[0_3px_0_0_rgba(255,255,255,0.08)]',
                        t.ring,
                        t.text,
                      )}
                    >
                      {tone === 'success' ? <Check className="h-5 w-5" /> : tone === 'invalid' && i === state.buffer.length - 1 ? <X className="h-5 w-5" /> : ch}
                    </motion.kbd>
                  ))}
                </AnimatePresence>
                {state.status === 'listening' && (
                  <motion.span
                    layout
                    animate={{ opacity: [1, 0.15, 1] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                    className={cn('h-8 w-1 rounded-full', t.bar)}
                  />
                )}
              </div>

              {/* what can still be typed */}
              <ul className="relative space-y-1">
                {state.status === 'invalid' ? (
                  <li className="text-center text-xs text-slate-400">Nothing starts with “{state.buffer.toUpperCase()}”. Backspace to fix, Esc to cancel.</li>
                ) : candidates.length === 0 ? (
                  <li className="text-center text-xs text-slate-400">No chords yet. Add some from the keyboard button.</li>
                ) : (
                  candidates.slice(0, MAX_CANDIDATES).map((c) => (
                    <motion.li
                      key={c.id}
                      layout
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors',
                        c.id === state.matchedId ? 'bg-white/10' : 'bg-white/[0.03]',
                      )}
                    >
                      <ShortcutIcon icon={c.icon} url={c.url} className="h-4 w-4 shrink-0 object-contain" />
                      <span className="flex-1 truncate">{c.title}</span>
                      <span className="font-mono text-xs uppercase tracking-widest">
                        <span className={t.text}>{c.sequence.slice(0, state.buffer.length)}</span>
                        <span className="text-slate-500">{c.sequence.slice(state.buffer.length)}</span>
                      </span>
                    </motion.li>
                  ))
                )}
                {state.status !== 'invalid' && candidates.length > MAX_CANDIDATES && (
                  <li className="pt-0.5 text-center text-[11px] text-slate-500">+{candidates.length - MAX_CANDIDATES} more</li>
                )}
              </ul>

              {/* countdown: restarts with every keystroke */}
              <div className="relative mt-4 h-1 overflow-hidden rounded-full bg-white/10">
                {state.status === 'listening' ? (
                  <motion.div
                    key={state.epoch}
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: windowMs / 1000, ease: 'linear' }}
                    className={cn('h-full rounded-full', t.bar)}
                  />
                ) : (
                  <div className={cn('h-full w-full rounded-full', t.bar)} />
                )}
              </div>
    </motion.div>
  )
}

/** Futuristic heads-up display shown while a chord is being typed. */
export function ChordHud({ state }: { state: ChordEngineState }) {
  const chords = useAppStore((s) => s.chords)
  const shortcuts = useAppStore((s) => s.shortcuts)
  const windowMs = useAppStore((s) => s.settings.chordWindowMs)
  const resolved = resolveChords(chords, shortcuts)
  const active = state.status !== 'idle'

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {active && (
          <motion.div
            key="chord-hud"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: -28, scale: 0.94, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -18, scale: 0.97, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="pointer-events-none fixed inset-x-0 top-[12vh] z-[60] flex justify-center px-4"
          >
            <ChordHudCard state={state} chords={resolved} windowMs={windowMs} />
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  )
}
