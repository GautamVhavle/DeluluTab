/**
 * The focus timer as a pure state machine, shared by the new tab page and the background service worker.
 *
 * Time is stored as an absolute `endsAt` timestamp, never as a counter, so it stays correct when the page is
 * throttled, hidden or closed. The service worker (src/background.ts) finishes a session through chrome.alarms
 * even when no new tab is open; an open page finishes it itself, instantly. Both call `complete`, which is a
 * no-op unless a session is actually due, so whichever runs second does nothing.
 */

import { extensionStoragePort } from '@/services/storage/StorageAdapter'

export type Phase = 'work' | 'break'
export type Status = 'idle' | 'running' | 'paused'

export interface PomodoroState {
  phase: Phase
  status: Status
  /** Epoch ms when the running session ends; null unless running. */
  endsAt: number | null
  /** Time left while idle (full phase) or paused. */
  remainingMs: number
  workMs: number
  breakMs: number
  /** Bumped each time a session finishes. Gives each finish a unique notification id, so a repeat replaces instead of duplicating. */
  seq: number
  completedToday: number
  /** The local date completedToday refers to, YYYY-MM-DD. */
  day: string
}

export interface Durations {
  workMs: number
  breakMs: number
}

export const POMODORO_KEY = 'delulutab:pomodoro'
export const POMODORO_ALARM = 'delulutab-pomodoro'
export const NOTIFICATION_PREFIX = 'delulutab-pomodoro-'
export const MIN = 60_000

export const minutes = (n: number) => n * MIN

export const dayOf = (now: number) => {
  const d = new Date(now)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const phaseMs = (s: Pick<PomodoroState, 'workMs' | 'breakMs'>, phase: Phase) => (phase === 'work' ? s.workMs : s.breakMs)
const other = (p: Phase): Phase => (p === 'work' ? 'break' : 'work')

export function initialState(d: Durations, now: number): PomodoroState {
  return { phase: 'work', status: 'idle', endsAt: null, remainingMs: d.workMs, workMs: d.workMs, breakMs: d.breakMs, seq: 0, completedToday: 0, day: dayOf(now) }
}

const finite = (v: unknown, min: number, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : null)

/** Turns whatever was stored into a valid state, falling back to a fresh one. Never throws. */
export function normalize(raw: unknown, d: Durations, now: number): PomodoroState {
  if (typeof raw !== 'object' || raw === null) return initialState(d, now)
  const r = raw as Record<string, unknown>
  const phase: Phase = r.phase === 'break' ? 'break' : 'work'
  const status: Status = r.status === 'running' || r.status === 'paused' ? r.status : 'idle'
  const workMs = finite(r.workMs, MIN, 90 * MIN) ?? d.workMs
  const breakMs = finite(r.breakMs, MIN, 30 * MIN) ?? d.breakMs
  const base = { workMs, breakMs }
  const endsAt = finite(r.endsAt, 0, Number.MAX_SAFE_INTEGER)
  if (status === 'running' && endsAt === null) return { ...initialState({ workMs, breakMs }, now), phase }
  const remaining = finite(r.remainingMs, 0, 90 * MIN)
  return {
    phase,
    status,
    endsAt: status === 'running' ? endsAt : null,
    remainingMs: status === 'idle' ? phaseMs(base, phase) : (remaining ?? phaseMs(base, phase)),
    workMs,
    breakMs,
    seq: Math.max(0, Math.floor(finite(r.seq, 0, 1e9) ?? 0)),
    completedToday: Math.max(0, Math.floor(finite(r.completedToday, 0, 1e4) ?? 0)),
    day: typeof r.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.day) ? r.day : dayOf(now),
  }
}

export const remainingOf = (s: PomodoroState, now: number) => (s.status === 'running' && s.endsAt !== null ? Math.max(0, s.endsAt - now) : s.remainingMs)
export const completedTodayOf = (s: PomodoroState, now: number) => (s.day === dayOf(now) ? s.completedToday : 0)

/** 0 (just started) to 1 (finished), for the progress ring. */
export const progressOf = (s: PomodoroState, now: number) => {
  const total = phaseMs(s, s.phase)
  return total > 0 ? Math.min(1, Math.max(0, 1 - remainingOf(s, now) / total)) : 0
}

export function start(s: PomodoroState, now: number): PomodoroState {
  if (s.status === 'running') return s
  const remaining = s.status === 'paused' ? s.remainingMs : phaseMs(s, s.phase)
  return { ...s, status: 'running', endsAt: now + remaining, remainingMs: remaining }
}

export function pause(s: PomodoroState, now: number): PomodoroState {
  if (s.status !== 'running' || s.endsAt === null) return s
  return { ...s, status: 'paused', endsAt: null, remainingMs: Math.max(0, s.endsAt - now) }
}

/** Back to a fresh focus session. Today's completed count is kept. */
export function reset(s: PomodoroState): PomodoroState {
  return { ...s, phase: 'work', status: 'idle', endsAt: null, remainingMs: s.workMs }
}

/** Jump to the other phase without finishing this one (nothing is counted). */
export function skip(s: PomodoroState): PomodoroState {
  const phase = other(s.phase)
  return { ...s, phase, status: 'idle', endsAt: null, remainingMs: phaseMs(s, phase) }
}

/** New lengths apply immediately to an idle timer, and to the next session of a running or paused one. */
export function setDurations(s: PomodoroState, d: Durations): PomodoroState {
  if (s.workMs === d.workMs && s.breakMs === d.breakMs) return s
  const next = { ...s, workMs: d.workMs, breakMs: d.breakMs }
  return s.status === 'idle' ? { ...next, remainingMs: phaseMs(next, next.phase) } : next
}

export const isDue = (s: PomodoroState, now: number, slackMs = 0) => s.status === 'running' && s.endsAt !== null && now >= s.endsAt - slackMs

/**
 * Finishes the running session if it is due: counts a completed focus session, moves to the other phase and
 * waits there (idle), so a break never starts by surprise. Returns null if nothing is due.
 */
export function complete(s: PomodoroState, now: number, slackMs = 0): { state: PomodoroState; finished: Phase } | null {
  if (!isDue(s, now, slackMs)) return null
  const finished = s.phase
  const phase = other(finished)
  const today = dayOf(now)
  return {
    finished,
    state: {
      ...s,
      phase,
      status: 'idle',
      endsAt: null,
      remainingMs: phaseMs(s, phase),
      seq: s.seq + 1,
      day: today,
      completedToday: (s.day === today ? s.completedToday : 0) + (finished === 'work' ? 1 : 0),
    },
  }
}

export function notificationText(finished: Phase, next: Durations) {
  return finished === 'work'
    ? { title: 'Focus session complete', message: `Nice work. Take a ${Math.round(next.breakMs / MIN)} minute break.` }
    : { title: 'Break is over', message: `Ready for the next ${Math.round(next.workMs / MIN)} minute focus session?` }
}

export const formatClock = (ms: number) => {
  const total = Math.ceil(ms / 1000)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// ------------------------------------------------------------------ storage, alarms, notifications

const storagePort = extensionStoragePort()

export async function loadPomodoro(): Promise<unknown> {
  if (storagePort) return (await storagePort.local.get(POMODORO_KEY))[POMODORO_KEY] ?? null
  try {
    const raw = localStorage.getItem(POMODORO_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function savePomodoro(state: PomodoroState) {
  if (storagePort) {
    await storagePort.local.set({ [POMODORO_KEY]: state })
    return
  }
  try {
    localStorage.setItem(POMODORO_KEY, JSON.stringify(state))
  } catch {
    // Storage blocked: the timer still works for this page.
  }
}

/** Calls `onChange` with the new raw state whenever another tab (or the service worker) saves it. */
export function subscribePomodoro(onChange: (raw: unknown) => void): () => void {
  if (storagePort) {
    return storagePort.subscribe((changes, area) => {
      if (area === 'local' && POMODORO_KEY in changes) onChange(changes[POMODORO_KEY].newValue)
    })
  }
  const handler = (e: StorageEvent) => {
    if (e.key !== POMODORO_KEY) return
    try {
      onChange(e.newValue ? JSON.parse(e.newValue) : null)
    } catch {
      // ignore malformed
    }
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

export const hasAlarms = () => typeof chrome !== 'undefined' && !!chrome.alarms?.create

/** Wakes the service worker when the session ends, even if no page is open. */
export function armAlarm(endsAt: number) {
  if (hasAlarms()) void chrome.alarms.create(POMODORO_ALARM, { when: endsAt })
}

export function clearAlarm() {
  if (hasAlarms()) void chrome.alarms.clear(POMODORO_ALARM)
}

/**
 * Shows a desktop notification: chrome.notifications in the extension (works from the service worker too),
 * the standard Web Notifications API elsewhere. The id is unique per finished session, so the page and the
 * service worker both announcing the same one results in a single notification.
 */
export function notifyPhaseEnd(finished: Phase, state: PomodoroState) {
  const { title, message } = notificationText(finished, state)
  const id = `${NOTIFICATION_PREFIX}${state.seq}`
  if (typeof chrome !== 'undefined' && chrome.notifications?.create) {
    try {
      void chrome.notifications.create(id, { type: 'basic', iconUrl: chrome.runtime.getURL('icons/icon-128.png'), title, message, priority: 1 })
    } catch {
      // Notifications unavailable on this system; the page still shows the finished state.
    }
    return
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification(title, { body: message, tag: id })
    } catch {
      // Some browsers only allow notifications from a service worker.
    }
  }
}

/** Web Notifications need a one-time permission (the extension API does not). Call from a click. */
export function requestNotificationPermission() {
  if (typeof chrome !== 'undefined' && chrome.notifications) return
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') void Notification.requestPermission()
}
