import { useEffect, useState, type CSSProperties } from 'react'
import { dateLabel, greetingFor, timeParts } from '@/utils/clock'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/store/useAppStore'
import type { WidgetProps } from '../types'
import { ClockControls } from './ClockControls'
import { useNow } from './useNow'

/** Long enough for the whole flip (see .flip-flap-* in index.css) to finish before the card settles. */
const FLIP_MS = 700

/**
 * One two-digit card. When its value changes the old top half folds down and the new bottom half folds in,
 * like a split-flap display. The animation is pure CSS; this component only decides what each half shows.
 */
export function FlipCard({ value }: { value: string }) {
  const [state, setState] = useState({ cur: value, prev: value, k: 0 })
  useEffect(() => {
    setState((s) => (s.cur === value ? s : { cur: value, prev: s.cur, k: s.k + 1 }))
  }, [value])
  useEffect(() => {
    if (state.prev === state.cur) return
    const id = setTimeout(() => setState((s) => ({ ...s, prev: s.cur })), FLIP_MS)
    return () => clearTimeout(id)
  }, [state.k, state.prev, state.cur])

  const flipping = state.prev !== state.cur
  return (
    <span className="flip-card" aria-hidden data-flipping={flipping || undefined}>
      <span className="flip-half flip-top"><span>{state.cur}</span></span>
      <span className="flip-half flip-bottom"><span>{state.prev}</span></span>
      {flipping && (
        <>
          <span key={`t${state.k}`} className="flip-half flip-top flip-flap-top"><span>{state.prev}</span></span>
          <span key={`b${state.k}`} className="flip-half flip-bottom flip-flap-bottom"><span>{state.cur}</span></span>
        </>
      )}
    </span>
  )
}

const SIZE: Record<WidgetProps['mode'], string> = { detailed: '3.6rem', compact: '2.1rem', focus: '7rem' }

/** Retro flip clock: HH and MM (and SS) as flip cards, with a quiet AM/PM tag. */
export function FlipClock({ mode }: WidgetProps) {
  const format = useAppStore((s) => s.settings.clockFormat)
  const showSeconds = useAppStore((s) => s.settings.showSeconds)
  const userName = useAppStore((s) => s.settings.userName)
  const now = useNow(showSeconds)
  const t = timeParts(now, { format, padHour: true })
  const label = `${t.main}${showSeconds ? `:${t.second}` : ''} ${t.period}`.trim()
  const style = { '--flip-h': SIZE[mode] } as CSSProperties

  const cards = (
    <div role="timer" aria-label={label} className="flex items-center gap-1.5" style={style}>
      <FlipCard value={t.hour} />
      <span aria-hidden className="text-muted-foreground" style={{ fontSize: 'calc(var(--flip-h) * 0.4)' }}>:</span>
      <FlipCard value={t.minute} />
      {showSeconds && (
        <>
          <span aria-hidden className="text-muted-foreground" style={{ fontSize: 'calc(var(--flip-h) * 0.4)' }}>:</span>
          <FlipCard value={t.second} />
        </>
      )}
      {t.period && <span className="ml-1 self-end pb-1 text-xs font-medium uppercase text-muted-foreground">{t.period}</span>}
    </div>
  )

  if (mode === 'compact') {
    return (
      <div className="flex h-full items-center justify-between gap-3">
        {cards}
        <span className="truncate text-xs text-muted-foreground">{dateLabel(now)}</span>
      </div>
    )
  }
  if (mode === 'focus') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        {cards}
        <p className="text-lg text-muted-foreground">{greetingFor(now.getHours(), userName)}</p>
      </div>
    )
  }
  return (
    <div className="group/clock relative flex h-full flex-col justify-center gap-2">
      <p className="text-sm font-medium text-muted-foreground">{greetingFor(now.getHours(), userName)}</p>
      <div className={cn('flex items-end justify-between gap-3')}>
        {cards}
      </div>
      <p className="text-xs text-muted-foreground">{dateLabel(now)}</p>
      <ClockControls />
    </div>
  )
}
