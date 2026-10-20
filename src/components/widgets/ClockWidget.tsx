import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useAppStore, type ClockFormat } from '@/store/useAppStore'
import type { WidgetProps } from './types'

function greetingFor(hour: number, name: string) {
  const who = name.trim()
  if (hour < 5) return who ? `Still up, ${who}?` : 'Still up, dreamer?'
  const base = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return who ? `${base}, ${who}` : base
}

/** Hours:minutes, optional seconds, optional AM/PM, formatted for the user's locale. */
function useClockParts(format: ClockFormat, showSeconds: boolean) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: format === '12h' ? 'numeric' : '2-digit',
        minute: '2-digit',
        second: showSeconds ? '2-digit' : undefined,
        // hourCycle h23 avoids "24:05" after midnight that hour12:false can produce
        ...(format === '12h' ? { hour12: true } : { hourCycle: 'h23' as const }),
      }),
    [format, showSeconds],
  )

  let main = ''
  let seconds = ''
  let period = ''
  let sawMinute = false
  for (const part of formatter.formatToParts(now)) {
    if (part.type === 'dayPeriod') period = part.value
    else if (part.type === 'second') seconds = part.value
    else if (part.type === 'literal') {
      if (!sawMinute) main += part.value
    } else {
      if (part.type === 'minute') sawMinute = true
      main += part.value
    }
  }
  const date = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  return { now, main, seconds, period, date }
}

function FormatToggles() {
  const format = useAppStore((s) => s.settings.clockFormat)
  const showSeconds = useAppStore((s) => s.settings.showSeconds)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const chip = 'rounded-md px-2 py-0.5 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <div className="absolute bottom-0 right-0 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover/clock:opacity-100">
      <div role="radiogroup" aria-label="Clock format" className="flex rounded-lg bg-secondary/70 p-0.5">
        {(['12h', '24h'] as const).map((f) => (
          <button
            key={f}
            role="radio"
            aria-checked={format === f}
            onClick={() => updateSettings({ clockFormat: f })}
            className={cn(chip, format === f ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            {f}
          </button>
        ))}
      </div>
      <button
        aria-pressed={showSeconds}
        onClick={() => updateSettings({ showSeconds: !showSeconds })}
        className={cn(chip, 'bg-secondary/70', showSeconds ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
      >
        :ss
      </button>
    </div>
  )
}

export function ClockWidget({ mode }: WidgetProps) {
  const format = useAppStore((s) => s.settings.clockFormat)
  const showSeconds = useAppStore((s) => s.settings.showSeconds)
  const userName = useAppStore((s) => s.settings.userName)
  const { now, main, seconds, period, date } = useClockParts(format, showSeconds)
  const greeting = greetingFor(now.getHours(), userName)

  const Time = ({ className, small }: { className: string; small: string }) => (
    <p className={cn('flex items-baseline font-light tabular-nums tracking-tight', className)} aria-label={`${main}${seconds ? `:${seconds}` : ''} ${period}`.trim()}>
      <span>{main}</span>
      {seconds && <span className={cn('ml-1 text-muted-foreground', small)}>:{seconds}</span>}
      {period && <span className={cn('ml-2 font-normal uppercase text-muted-foreground', small)}>{period}</span>}
    </p>
  )

  if (mode === 'compact') {
    return (
      <div className="flex h-full items-baseline justify-between gap-3">
        <Time className="text-3xl" small="text-sm" />
        <span className="truncate text-xs text-muted-foreground">{date}</span>
      </div>
    )
  }

  if (mode === 'focus') {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <Time className="text-8xl sm:text-9xl" small="text-2xl sm:text-3xl" />
        <p className="mt-2 text-lg text-muted-foreground">{greeting}</p>
      </div>
    )
  }

  return (
    <div className="group/clock relative flex h-full flex-col justify-center">
      <p className="mb-2 text-sm font-medium text-muted-foreground">{greeting}</p>
      <Time className="text-5xl sm:text-6xl" small="text-lg" />
      <p className="mt-2 text-sm text-muted-foreground">{date}</p>
      <FormatToggles />
    </div>
  )
}
