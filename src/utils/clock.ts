import type { ClockFormat } from '@/types'

export interface TimeParts {
  hour: string
  minute: string
  second: string
  /** "AM"/"PM" in 12-hour time, '' in 24-hour. */
  period: string
  /** hour:minute */
  main: string
}

const formatters = new Map<string, Intl.DateTimeFormat>()

/** Wall-clock text for `now` in `timeZone` (default: the browser's), 12 or 24 hour. Zero-padded hour when `padHour`. */
export function timeParts(now: Date, options: { format: ClockFormat; timeZone?: string; padHour?: boolean }): TimeParts {
  const { format, timeZone, padHour = false } = options
  const key = `${format}|${timeZone ?? ''}|${padHour}`
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(undefined, {
      hour: format === '12h' && !padHour ? 'numeric' : '2-digit',
      minute: '2-digit',
      second: '2-digit',
      // hourCycle h23 avoids "24:05" after midnight that hour12:false can produce
      ...(format === '12h' ? { hour12: true } : { hourCycle: 'h23' as const }),
      ...(timeZone ? { timeZone } : {}),
    })
    formatters.set(key, f)
  }
  const out = { hour: '', minute: '', second: '', period: '' }
  for (const part of f.formatToParts(now)) {
    if (part.type === 'hour') out.hour = part.value
    else if (part.type === 'minute') out.minute = part.value
    else if (part.type === 'second') out.second = part.value
    else if (part.type === 'dayPeriod') out.period = part.value
  }
  return { ...out, main: `${out.hour}:${out.minute}` }
}

export function greetingFor(hour: number, name: string) {
  const who = name.trim()
  if (hour < 5) return who ? `Still up, ${who}?` : 'Still up, dreamer?'
  const base = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return who ? `${base}, ${who}` : base
}

export const dateLabel = (now: Date, timeZone?: string) =>
  now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', ...(timeZone ? { timeZone } : {}) })

export const shortDateLabel = (now: Date, timeZone?: string) =>
  now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', ...(timeZone ? { timeZone } : {}) })

/**
 * Angles (degrees clockwise from 12) of the three hands for a local time. The hour hand creeps with the minutes,
 * the minute hand with the seconds, like a real clock.
 */
export function handAngles(now: Date) {
  const h = now.getHours() % 12
  const m = now.getMinutes()
  const s = now.getSeconds()
  return { hour: (h + m / 60 + s / 3600) * 30, minute: (m + s / 60) * 6, second: s * 6 }
}
