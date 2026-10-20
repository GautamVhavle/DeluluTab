import { cn } from '@/lib/utils'
import { dateLabel, greetingFor, timeParts } from '@/lib/clock'
import { useAppStore } from '@/store/useAppStore'
import type { WidgetProps } from '../types'
import { ClockControls } from './ClockControls'
import { useNow } from './useNow'

/** Digital minimalist: large light numerals in soft frosted-glass typography; seconds and AM/PM as quiet chips. */
export function DigitalClock({ mode }: WidgetProps) {
  const format = useAppStore((s) => s.settings.clockFormat)
  const showSeconds = useAppStore((s) => s.settings.showSeconds)
  const userName = useAppStore((s) => s.settings.userName)
  const now = useNow(showSeconds)
  const t = timeParts(now, { format })
  const greeting = greetingFor(now.getHours(), userName)
  const label = `${t.main}${showSeconds ? `:${t.second}` : ''} ${t.period}`.trim()

  const Time = ({ className, chip }: { className: string; chip: string }) => (
    <p className={cn('flex items-baseline font-light tabular-nums tracking-tight', className)} aria-label={label}>
      {/* Gradient fill: bright at the top, easing into the glass below. */}
      <span className="bg-gradient-to-b from-foreground to-foreground/65 bg-clip-text text-transparent">{t.main}</span>
      {showSeconds && <span className={cn('ml-1.5 rounded-md bg-foreground/10 px-1.5 text-muted-foreground backdrop-blur-sm', chip)}>:{t.second}</span>}
      {t.period && <span className={cn('ml-2 rounded-md bg-foreground/10 px-1.5 font-normal uppercase text-muted-foreground backdrop-blur-sm', chip)}>{t.period}</span>}
    </p>
  )

  if (mode === 'compact') {
    return (
      <div className="flex h-full items-baseline justify-between gap-3">
        <Time className="text-3xl" chip="text-xs" />
        <span className="truncate text-xs text-muted-foreground">{dateLabel(now)}</span>
      </div>
    )
  }

  if (mode === 'focus') {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <Time className="text-8xl sm:text-9xl" chip="text-xl sm:text-2xl" />
        <p className="mt-2 text-lg text-muted-foreground">{greeting}</p>
      </div>
    )
  }

  return (
    <div className="group/clock relative flex h-full flex-col justify-center">
      <p className="mb-2 text-sm font-medium text-muted-foreground">{greeting}</p>
      <Time className="text-5xl sm:text-6xl" chip="text-base" />
      <p className="mt-2 text-sm text-muted-foreground">{dateLabel(now)}</p>
      <ClockControls />
    </div>
  )
}
