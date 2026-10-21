import { useRef } from 'react'
import { dateLabel, handAngles, timeParts } from '@/utils/clock'
import { Greeting } from './Greeting'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/store/useAppStore'
import type { WidgetProps } from '../types'
import { useClockLook } from './useClockLook'
import { useNow } from './useNow'

/**
 * Turns a 0-360 target into an angle that only ever increases, so a hand passing 12 keeps going forward
 * instead of spinning all the way back (which a CSS transition would otherwise animate).
 */
function useContinuousAngle(target: number) {
  const last = useRef<number | null>(null)
  if (last.current === null) {
    last.current = target
  } else {
    const delta = (((target - last.current) % 360) + 360) % 360
    last.current += delta
  }
  return last.current
}

const TICKS = Array.from({ length: 60 }, (_, i) => i)
const NUMERALS: [number, string][] = [[0, '12'], [90, '3'], [180, '6'], [270, '9']]

/** The clock face: ticks, hands, and (unless tiny) the four cardinal numerals. Pure SVG, scales to any size. */
export function ClockFace({ now, seconds, numerals, className }: { now: Date; seconds: boolean; numerals: boolean; className?: string }) {
  const look = useClockLook()
  const ink = look.style?.color
  const a = handAngles(now)
  const hour = useContinuousAngle(a.hour)
  const minute = useContinuousAngle(a.minute)
  const second = useContinuousAngle(a.second)
  const hand = { transformOrigin: '100px 100px' } as const
  const majorTick = ink ? 'stroke-current' : 'stroke-foreground'
  const numeral = ink ? 'fill-current text-[18px] font-medium' : 'fill-foreground text-[18px] font-medium'

  return (
    <svg viewBox="0 0 200 200" className={className} style={ink ? { color: ink } : undefined} role="img" aria-label={`Analog clock, ${timeParts(now, { format: '12h' }).main} ${timeParts(now, { format: '12h' }).period}`}>
      <circle cx="100" cy="100" r="96" className="fill-card/50 stroke-border" strokeWidth="2" />
      {TICKS.map((i) => {
        const major = i % 5 === 0
        return <line key={i} x1="100" y1={major ? 10 : 12} x2="100" y2={major ? 22 : 17} transform={`rotate(${i * 6} 100 100)`} className={major ? majorTick : 'stroke-muted-foreground/60'} strokeWidth={major ? 3 : 1.2} strokeLinecap="round" />
      })}
      {numerals &&
        NUMERALS.map(([deg, n]) => {
          const r = 68
          const x = 100 + r * Math.sin((deg * Math.PI) / 180)
          const y = 100 - r * Math.cos((deg * Math.PI) / 180)
          return <text key={n} x={x} y={y} textAnchor="middle" dominantBaseline="central" className={numeral}>{n}</text>
        })}
      {/* hands: transitions give the soft "tick"; the second hand overshoots slightly like a quartz movement */}
      <g style={{ ...hand, transform: `rotate(${hour}deg)`, transition: 'transform 0.4s ease-out' }} className="motion-reduce:!transition-none">
        <line x1="100" y1="108" x2="100" y2="56" className={ink ? 'stroke-current' : 'stroke-foreground'} strokeWidth="6" strokeLinecap="round" />
      </g>
      <g style={{ ...hand, transform: `rotate(${minute}deg)`, transition: 'transform 0.4s ease-out' }} className="motion-reduce:!transition-none">
        <line x1="100" y1="112" x2="100" y2="30" className={ink ? 'stroke-current' : 'stroke-foreground'} strokeWidth="4" strokeLinecap="round" />
      </g>
      {seconds && (
        <g style={{ ...hand, transform: `rotate(${second}deg)`, transition: 'transform 0.28s cubic-bezier(0.4, 2.3, 0.5, 1)' }} className="motion-reduce:!transition-none">
          <line x1="100" y1="122" x2="100" y2="22" className="stroke-primary" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      )}
      <circle cx="100" cy="100" r="5" className="fill-primary" />
      <circle cx="100" cy="100" r="2" className="fill-background" />
    </svg>
  )
}

/** Minimalist analog clock with ticking hands. Detailed adds the greeting and date beside the face. */
export function AnalogClock({ mode }: WidgetProps) {
  const showSeconds = useAppStore((s) => s.settings.showSeconds)
  const userName = useAppStore((s) => s.settings.userName)
  const format = useAppStore((s) => s.settings.clockFormat)
  const now = useNow(showSeconds)
  const t = timeParts(now, { format })
  const look = useClockLook()

  if (mode === 'compact') {
    return (
      <div className="flex h-full items-center gap-3">
        <ClockFace now={now} seconds={showSeconds} numerals={false} className="h-10 w-10 shrink-0" />
        <span className={cn('text-2xl tabular-nums', look.className)} style={look.style}>{t.main}{t.period && <span className="ml-1.5 text-xs uppercase text-muted-foreground">{t.period}</span>}</span>
        <span className="ml-auto truncate text-xs text-muted-foreground">{dateLabel(now)}</span>
      </div>
    )
  }
  if (mode === 'focus') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <ClockFace now={now} seconds={showSeconds} numerals className="h-60 w-60" />
        <Greeting now={now} name={userName} className="text-2xl" />
      </div>
    )
  }
  return (
    <div className="flex h-full items-center gap-5">
      <ClockFace now={now} seconds={showSeconds} numerals className="h-28 w-28 shrink-0" />
      <div className="min-w-0">
        <p className={cn('text-3xl tabular-nums', look.className)} style={look.style}>{t.main}{t.period && <span className="ml-2 text-sm uppercase text-muted-foreground">{t.period}</span>}</p>
        <Greeting now={now} name={userName} className="mt-2 text-lg" />
        <p className="mt-1 truncate text-sm text-muted-foreground">{dateLabel(now)}</p>
      </div>
    </div>
  )
}
