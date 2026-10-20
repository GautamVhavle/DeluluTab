/** Valid IANA time zone names only: anything else would make Intl throw. */
export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || tz.length === 0 || tz.length > 64) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export const LOCAL_ZONE = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** One-click choices for the second clock. */
export const POPULAR_ZONES: { id: string; city: string }[] = [
  { id: 'UTC', city: 'UTC' },
  { id: 'America/Los_Angeles', city: 'Los Angeles' },
  { id: 'America/New_York', city: 'New York' },
  { id: 'America/Sao_Paulo', city: 'São Paulo' },
  { id: 'Europe/London', city: 'London' },
  { id: 'Europe/Berlin', city: 'Berlin' },
  { id: 'Asia/Dubai', city: 'Dubai' },
  { id: 'Asia/Kolkata', city: 'Mumbai' },
  { id: 'Asia/Singapore', city: 'Singapore' },
  { id: 'Asia/Tokyo', city: 'Tokyo' },
  { id: 'Australia/Sydney', city: 'Sydney' },
  { id: 'Pacific/Auckland', city: 'Auckland' },
]

/** Older IANA spellings that browsers still report, mapped to the names people actually use. */
const CITY_ALIASES: Record<string, string> = { Calcutta: 'Kolkata', Katmandu: 'Kathmandu', Saigon: 'Ho Chi Minh City', Rangoon: 'Yangon', Kiev: 'Kyiv' }

/** "America/New_York" -> "New York"; "Asia/Calcutta" -> "Kolkata". */
export function cityName(tz: string): string {
  const known = POPULAR_ZONES.find((z) => z.id === tz)
  if (known) return known.city
  if (tz === 'UTC' || tz === 'Etc/UTC' || tz === 'GMT') return 'UTC'
  const city = (tz.split('/').pop() ?? tz).replace(/_/g, ' ')
  return CITY_ALIASES[city] ?? city
}

/**
 * Turns what the user typed into a usable zone name, or null. Intl accepts aliases and any letter case
 * ("asia/kolkata", "Asia/Kathmandu") even though the browser's own list uses older spellings, so validity is decided by
 * Intl itself, and the name is tidied into the usual "Area/City_Name" capitalisation.
 */
export function normalizeZoneInput(input: string): string | null {
  const raw = input.trim().replace(/\s+/g, '_')
  if (!raw) return null
  const listed = allZones().find((z) => z.toLowerCase() === raw.toLowerCase())
  if (listed) return listed
  const tidy = /^utc$/i.test(raw) ? 'UTC' : raw.split('/').map((seg) => seg.split('_').map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w)).join('_')).join('/')
  return isValidTimeZone(tidy) ? tidy : isValidTimeZone(raw) ? raw : null
}

/** Every zone the browser knows, for autocomplete. Falls back to the popular list on older engines. */
export function allZones(): string[] {
  try {
    const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone')
    if (list?.length) return list.includes('UTC') ? list : ['UTC', ...list]
  } catch {
    // fall through
  }
  return POPULAR_ZONES.map((z) => z.id)
}

export interface ZonedParts {
  hour: number
  minute: number
  second: number
  /** YYYY-MM-DD in that zone. */
  date: string
  weekday: string
}

/** The wall-clock reading of `now` in `timeZone` (DST-correct, via Intl). */
export function zonedParts(now: Date, timeZone: string): ZonedParts {
  const f = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' })
  const p: Record<string, string> = {}
  for (const part of f.formatToParts(now)) p[part.type] = part.value
  return { hour: Number(p.hour) % 24, minute: Number(p.minute), second: Number(p.second), date: `${p.year}-${p.month}-${p.day}`, weekday: p.weekday }
}

/** Whole-day difference between two zones' calendars right now: -1 yesterday, 0 same day, 1 tomorrow. */
export function dayOffset(now: Date, zone: string, relativeTo: string): -1 | 0 | 1 {
  const a = zonedParts(now, zone).date
  const b = zonedParts(now, relativeTo).date
  return a === b ? 0 : a > b ? 1 : -1
}

/** Hours (can be fractional, e.g. 5.5 for India) that `zone` is ahead of `relativeTo` at this moment. */
export function hoursAhead(now: Date, zone: string, relativeTo: string): number {
  const toMinutes = (z: string) => {
    const p = zonedParts(now, z)
    return Date.UTC(Number(p.date.slice(0, 4)), Number(p.date.slice(5, 7)) - 1, Number(p.date.slice(8, 10)), p.hour, p.minute) / 60_000
  }
  return (toMinutes(zone) - toMinutes(relativeTo)) / 60
}

export const formatOffset = (hours: number) => {
  if (hours === 0) return 'same time'
  const abs = Math.abs(hours)
  const whole = Math.floor(abs)
  const mins = Math.round((abs - whole) * 60)
  return `${hours > 0 ? '+' : '-'}${whole}${mins ? `:${String(mins).padStart(2, '0')}` : ''}h`
}
