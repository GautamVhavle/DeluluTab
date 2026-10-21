import { dayOffset, formatOffset, hoursAhead, isValidTimeZone, LOCAL_ZONE, cityName } from '@/utils/timezones'
import { shortDateLabel, timeParts } from '@/utils/clock'
import { Greeting } from './Greeting'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/store/useAppStore'
import type { WidgetProps } from '../types'
import { ClockControls } from './ClockControls'
import { useClockLook } from './useClockLook'
import { useNow } from './useNow'

const DAY_WORD = { '-1': 'Yesterday', '0': 'Today', '1': 'Tomorrow' } as const

/** Local time next to a second time zone of the user's choosing, with the day and hour difference. */
export function WorldClock({ mode }: WidgetProps) {
  const format = useAppStore((s) => s.settings.clockFormat)
  const showSeconds = useAppStore((s) => s.settings.showSeconds)
  const userName = useAppStore((s) => s.settings.userName)
  const saved = useAppStore((s) => s.settings.secondTimezone)
  const now = useNow(showSeconds)

  const local = LOCAL_ZONE()
  const zone = isValidTimeZone(saved) ? saved : 'UTC'
  const look = useClockLook()
  const here = timeParts(now, { format })
  const there = timeParts(now, { format, timeZone: zone })
  const diff = formatOffset(hoursAhead(now, zone, local))
  const day = DAY_WORD[String(dayOffset(now, zone, local)) as keyof typeof DAY_WORD]

  const time = (p: typeof here, size: string, chip: string) => (
    <p className={cn('flex items-baseline tabular-nums', look.className, size)} style={look.style}>
      <span>{p.main}</span>
      {showSeconds && <span className={cn('ml-1 text-muted-foreground', chip)}>:{p.second}</span>}
      {p.period && <span className={cn('ml-1.5 uppercase text-muted-foreground', chip)}>{p.period}</span>}
    </p>
  )

  if (mode === 'compact') {
    return (
      <div className="flex h-full items-baseline gap-3 text-sm" aria-label={`${here.main} here, ${there.main} in ${cityName(zone)}`}>
        <span className={cn('text-2xl tabular-nums', look.className)} style={look.style}>{here.main}<span className="ml-1 text-xs uppercase text-muted-foreground">{here.period}</span></span>
        <span className="text-muted-foreground">·</span>
        <span className="truncate"><span className="text-xs text-muted-foreground">{cityName(zone)}</span> <span className="tabular-nums">{there.main} {there.period}</span> <span className="text-xs text-muted-foreground">({diff})</span></span>
      </div>
    )
  }

  const big = mode === 'focus' ? 'text-6xl sm:text-7xl' : 'text-4xl'
  const chip = mode === 'focus' ? 'text-lg' : 'text-sm'
  const columns = (
    <div className={cn('grid grid-cols-2 gap-6', mode === 'focus' ? 'w-full' : '')}>
      <div className={cn(mode === 'focus' && 'text-center')}>
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Here · {cityName(local)}</p>
        {time(here, big, chip)}
        <p className="mt-1 text-xs text-muted-foreground">{shortDateLabel(now)}</p>
      </div>
      <div className={cn('border-l pl-6', mode === 'focus' && 'text-center')}>
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{cityName(zone)}</p>
        {time(there, big, chip)}
        <p className="mt-1 text-xs text-muted-foreground">{shortDateLabel(now, zone)} · {day} · {diff}</p>
      </div>
    </div>
  )

  if (mode === 'focus') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        {columns}
        <Greeting now={now} name={userName} className="text-center text-2xl" />
      </div>
    )
  }
  return (
    <div className="group/clock relative flex h-full flex-col justify-center gap-2">
      {columns}
      <Greeting now={now} name={userName} className="text-lg" />
      <ClockControls />
    </div>
  )
}
