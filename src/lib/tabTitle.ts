import type { ClockFormat, TabTitleMode } from '@/store/types'

export const APP_NAME = 'DeluluTab'
export const MAX_TAB_TITLE = 40

/** A favicon that draws nothing: used when the user turns the tab icon off. */
export const BLANK_FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"

const cleanTitle = (text: string) => text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_TAB_TITLE)

export function formatTime(now: Date, format: ClockFormat) {
  return new Intl.DateTimeFormat(undefined, {
    hour: format === '12h' ? 'numeric' : '2-digit',
    minute: '2-digit',
    // hourCycle h23 avoids "24:05" after midnight that hour12:false can produce
    ...(format === '12h' ? { hour12: true } : { hourCycle: 'h23' as const }),
  }).format(now)
}

export function tabTitle(options: { mode: TabTitleMode; custom: string; now: Date; format: ClockFormat }): string {
  const { mode, custom, now, format } = options
  if (mode === 'time') return `${formatTime(now, format)} - ${APP_NAME}`
  if (mode === 'custom') return cleanTitle(custom) || APP_NAME
  return APP_NAME
}

/** Milliseconds until the clock's minute changes (plus a hair so we land just after it). */
export function msUntilNextMinute(now: Date = new Date()) {
  return 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50
}
