import { cn } from '@/utils/cn'
import { useClockLook } from './useClockLook'
import { dateLabel, timeParts } from '@/utils/clock'
import { Greeting } from './Greeting'
import { useAppStore } from '@/store/useAppStore'
import type { WidgetProps } from '../types'
import { ClockControls } from './ClockControls'
import { useNow } from './useNow'

/** Digital clock: solid numerals so they stay readable on a light field. Seconds and AM/PM sit in quiet chips. */
export function DigitalClock({ mode }: WidgetProps) {
  const format = useAppStore((s) => s.settings.clockFormat)
  const showSeconds = useAppStore((s) => s.settings.showSeconds)
  const userName = useAppStore((s) => s.settings.userName)
  const now = useNow(showSeconds)
  const t = timeParts(now, { format })
  const label = `${t.main}${showSeconds ? `:${t.second}` : ''} ${t.period}`.trim()
  const look = useClockLook()

  const Time = ({ className }: { className: string }) => (
    <p className={cn('flex items-center tabular-nums', look.className, className)} style={look.style} aria-label={label}>
      <span>{t.main}</span>
      {showSeconds && (
        <span className="ml-[0.12em] inline-flex items-center font-light leading-none" style={{ fontSize: '0.34em' }}>
          <span className="opacity-35">:</span>
          <span key={t.second} className="second-tick inline-block min-w-[2ch] text-left">{t.second}</span>
        </span>
      )}
      {t.period && <span className="ml-[0.18em] self-end pb-[0.16em] text-[0.2em] font-medium uppercase leading-none tracking-[0.2em] opacity-55">{t.period}</span>}
    </p>
  )

  if (mode === 'compact') {
    return (
      <div className="flex h-full flex-col justify-center">
        <Time className="text-5xl @[20rem]:text-6xl" />
        <Greeting now={now} name={userName} className="mt-1 text-sm" />
        <span className="mt-2 truncate text-sm text-muted-foreground">{dateLabel(now)}</span>
      </div>
    )
  }

  if (mode === 'focus') {
    return (
      <div className="wallpaper-ink flex h-full flex-col items-center justify-center text-center">
        <Time className="text-8xl sm:text-9xl" />
        <Greeting now={now} name={userName} className="mt-5 text-2xl sm:text-3xl" />
      </div>
    )
  }

  return (
    <div className="group/clock relative flex h-full flex-col justify-center">
      <Time className="text-4xl @[22rem]:text-6xl @[36rem]:text-7xl" />
      <Greeting now={now} name={userName} className="mt-3 text-2xl" />
      <p className="mt-1 text-sm text-muted-foreground">{dateLabel(now)}</p>
      <ClockControls />
    </div>
  )
}
