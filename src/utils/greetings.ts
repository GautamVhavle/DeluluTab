import builtin from '@/config/greetings.json'
import type { GreetingBook, GreetingPeriod } from '@/types'

/** Parts of the day the clock greeting can speak to, in the order they appear in the JSON. */
export const GREETING_PERIODS = ['late', 'morning', 'afternoon', 'evening', 'night'] as const satisfies readonly GreetingPeriod[]

export type { GreetingBook, GreetingPeriod }

const MAX_LINES = 16
const MAX_LINE = 80

export const DEFAULT_GREETINGS: GreetingBook = {
  late: [...builtin.late],
  morning: [...builtin.morning],
  afternoon: [...builtin.afternoon],
  evening: [...builtin.evening],
  night: [...builtin.night],
}

/** late is midnight–5, morning to noon, afternoon to 5pm, evening to 9pm, night after that. */
export function periodFor(hour: number): GreetingPeriod {
  if (hour < 5) return 'late'
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 21) return 'evening'
  return 'night'
}

function cleanLine(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, MAX_LINE)
}

function sameAsDefault(book: GreetingBook) {
  return GREETING_PERIODS.every((period) => book[period].join('\n') === DEFAULT_GREETINGS[period].join('\n'))
}

/**
 * Reads the greetings JSON a person edited.
 * An unchanged copy of the built-in file comes back as null, so the default stays the source of truth.
 */
export function readGreetings(value: unknown): { book: GreetingBook | null; error: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { book: null, error: 'Use an object with late, morning, afternoon, evening and night.' }
  }
  const record = value as Record<string, unknown>
  const book = {} as GreetingBook
  for (const period of GREETING_PERIODS) {
    const raw = record[period]
    if (!Array.isArray(raw)) return { book: null, error: `"${period}" should be a list of lines.` }
    const lines: string[] = []
    for (const item of raw) {
      if (typeof item !== 'string') return { book: null, error: `"${period}" should only contain text.` }
      const line = cleanLine(item)
      if (line) lines.push(line)
      if (lines.length >= MAX_LINES) break
    }
    if (!lines.length) return { book: null, error: `"${period}" needs at least one line.` }
    book[period] = lines
  }
  return { book: sameAsDefault(book) ? null : book, error: '' }
}

/** A line for this hour. It stays put for the calendar day, and changes when the part of the day changes. */
export function greetingFor(hour: number, name: string, now = new Date(), book?: GreetingBook | null) {
  const period = periodFor(hour)
  const pool = book?.[period]?.length ? book[period] : DEFAULT_GREETINGS[period]
  const line = pool[now.getDate() % pool.length] ?? pool[0]
  const who = name.trim().slice(0, 30)
  if (!who || /[.!?]$/.test(line)) return line
  return `${line}, ${who}`
}

export function greetingsJson(book: GreetingBook | null) {
  return JSON.stringify(book ?? DEFAULT_GREETINGS, null, 2)
}
