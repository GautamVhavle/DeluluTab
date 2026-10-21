import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChordHudCard } from '@/components/chords/ChordHud'
import { ShortcutIcon } from '@/components/shortcuts/ShortcutIcon'
import { resolveChords, type ChordEngineState, type ResolvedChord } from '@/utils/chords'
import { hostnameOf } from '@/utils/url'
import { useAppStore } from '@/store/useAppStore'

const FALLBACK: ResolvedChord = {
  id: 'preview',
  sequence: 'gh',
  shortcutId: 'preview',
  url: 'https://github.com/',
  title: 'GitHub',
  icon: '',
}

type Frame = { kind: 'hud'; state: ChordEngineState } | { kind: 'browser' }

function scriptFor(chord: ResolvedChord): Frame[] {
  const frames: Frame[] = [{ kind: 'hud', state: { status: 'listening', buffer: '', matchedId: null, epoch: 0 } }]
  for (let i = 1; i <= chord.sequence.length; i++) {
    const buffer = chord.sequence.slice(0, i)
    const exact = buffer === chord.sequence
    frames.push({
      kind: 'hud',
      state: { status: 'listening', buffer, matchedId: exact ? chord.id : null, epoch: i },
    })
  }
  frames.push({
    kind: 'hud',
    state: { status: 'success', buffer: chord.sequence, matchedId: chord.id, epoch: chord.sequence.length + 1 },
  })
  frames.push({ kind: 'browser' })
  return frames
}

function hold(frame: Frame) {
  if (frame.kind === 'browser') return 2800
  if (frame.state.status === 'success') return 1100
  if (!frame.state.buffer) return 900
  if (frame.state.matchedId) return 700
  return 560
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])
  return reduced
}

/** Plays the real chord display, then a browser window opening that site. */
export function ChordLesson() {
  const chords = useAppStore((s) => s.chords)
  const shortcuts = useAppStore((s) => s.shortcuts)
  const windowMs = useAppStore((s) => s.settings.chordWindowMs)
  const reduced = usePrefersReducedMotion()
  const demo = useMemo(() => resolveChords(chords, shortcuts)[0] ?? FALLBACK, [chords, shortcuts])
  const previewChords = useMemo(() => {
    const list = resolveChords(chords, shortcuts)
    const rest = list.filter((chord) => chord.id !== demo.id)
    return [demo, ...rest].slice(0, 3)
  }, [chords, shortcuts, demo])
  const script = useMemo(() => scriptFor(demo), [demo])
  const [index, setIndex] = useState(0)

  useEffect(() => setIndex(0), [demo.id, demo.sequence])

  useEffect(() => {
    if (reduced) return
    const id = window.setTimeout(() => setIndex((current) => (current + 1) % script.length), hold(script[index] ?? script[0]))
    return () => window.clearTimeout(id)
  }, [index, reduced, script])

  const frame = reduced ? script[script.length - 1] : script[index] ?? script[0]

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-inner">
      <p className="sr-only">
        Press the trigger, type {demo.sequence}, and {demo.title} opens in the browser.
      </p>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(139,92,246,0.45),transparent_55%),radial-gradient(70%_50%_at_100%_100%,rgba(34,211,238,0.2),transparent_45%)]"
      />
      <div className="relative flex min-h-[23rem] items-center justify-center px-4 py-8">
        <AnimatePresence mode="wait">
          {frame.kind === 'hud' ? (
            <motion.div
              key="hud"
              initial={{ opacity: 0, y: -22, scale: 0.94, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -16, scale: 0.98, filter: 'blur(6px)' }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className="w-full max-w-sm"
            >
              <ChordHudCard state={frame.state} chords={previewChords} windowMs={windowMs} className="max-w-none shadow-2xl" />
            </motion.div>
          ) : (
            <BrowserWindow key="browser" chord={demo} />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function BrowserWindow({ chord }: { chord: ResolvedChord }) {
  const host = hostnameOf(chord.url)
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="w-full max-w-sm overflow-hidden rounded-2xl border border-black/10 bg-white text-slate-900 shadow-[0_30px_70px_-24px_rgba(0,0,0,0.7)]"
    >
      <div className="flex items-center gap-2 border-b border-black/5 bg-slate-100 px-3 py-2">
        <span className="flex gap-1" aria-hidden>
          <i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-white px-2 py-1 text-[11px] text-slate-500 shadow-sm">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
          <span className="truncate">{host}</span>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.35 }}
        className="space-y-3 p-4"
      >
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100">
            <ShortcutIcon icon={chord.icon} url={chord.url} className="h-5 w-5 object-contain" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{chord.title}</p>
            <p className="truncate text-[11px] text-slate-400">{host}</p>
          </div>
        </div>
        <div className="h-16 rounded-xl bg-gradient-to-br from-violet-100 via-slate-50 to-cyan-100" />
        <div className="space-y-1.5">
          <div className="h-2 w-4/5 rounded-full bg-slate-200" />
          <div className="h-2 w-3/5 rounded-full bg-slate-100" />
          <div className="h-2 w-2/5 rounded-full bg-slate-100" />
        </div>
      </motion.div>
    </motion.div>
  )
}
