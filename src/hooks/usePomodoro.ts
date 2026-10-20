import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { playChime } from '@/services/ambient'
import {
  armAlarm,
  clearAlarm,
  complete,
  completedTodayOf,
  initialState,
  loadPomodoro,
  minutes,
  normalize,
  notifyPhaseEnd,
  pause,
  progressOf,
  remainingOf,
  requestNotificationPermission,
  reset,
  savePomodoro,
  setDurations,
  skip,
  start,
  subscribePomodoro,
  type PomodoroState,
} from '@/services/pomodoro'
import { useAppStore } from '@/store/useAppStore'

/**
 * The focus timer for the page. State lives in storage (so it survives navigating away and is shared with every
 * open new tab and the service worker); this hook just renders it and drives the countdown while a page is open.
 */
export function usePomodoro() {
  const workMin = useAppStore((s) => s.settings.pomodoroWorkMin)
  const breakMin = useAppStore((s) => s.settings.pomodoroBreakMin)
  const durations = useMemo(() => ({ workMs: minutes(workMin), breakMs: minutes(breakMin) }), [workMin, breakMin])
  const durationsRef = useRef(durations)
  durationsRef.current = durations

  const [state, setState] = useState<PomodoroState>(() => initialState(durations, Date.now()))
  const [now, setNow] = useState(() => Date.now())
  const stateRef = useRef(state)
  const loaded = useRef(false)

  const commit = useCallback((next: PomodoroState) => {
    stateRef.current = next
    setState(next)
    void savePomodoro(next)
    if (next.status === 'running' && next.endsAt !== null) armAlarm(next.endsAt)
    else clearAlarm()
  }, [])

  // Load what's stored, and follow changes made by other tabs or the service worker.
  useEffect(() => {
    let cancelled = false
    loadPomodoro().then((raw) => {
      if (cancelled) return
      const next = setDurations(normalize(raw, durationsRef.current, Date.now()), durationsRef.current)
      stateRef.current = next
      setState(next)
      setNow(Date.now())
      loaded.current = true
    })
    const unsubscribe = subscribePomodoro((raw) => {
      const next = normalize(raw, durationsRef.current, Date.now())
      stateRef.current = next
      setState(next)
      setNow(Date.now())
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  // Changing the lengths in settings applies right away to an idle timer.
  useEffect(() => {
    if (!loaded.current) return
    const next = setDurations(stateRef.current, durations)
    if (next !== stateRef.current) commit(next)
  }, [durations, commit])

  // Countdown. A hidden page may be throttled; that's fine, because the time shown is computed from `endsAt`
  // and the service worker finishes the session on time regardless.
  const running = state.status === 'running'
  useEffect(() => {
    if (!running) return
    const tick = () => {
      const t = Date.now()
      setNow(t)
      const result = complete(stateRef.current, t)
      if (result) {
        commit(result.state)
        notifyPhaseEnd(result.finished, result.state)
        playChime()
      }
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [running, state.endsAt, commit])

  const t = running ? now : Date.now()
  return {
    state,
    remainingMs: remainingOf(state, t),
    progress: progressOf(state, t),
    completedToday: completedTodayOf(state, t),
    play: () => {
      requestNotificationPermission()
      commit(start(stateRef.current, Date.now()))
    },
    pause: () => commit(pause(stateRef.current, Date.now())),
    reset: () => commit(reset(stateRef.current)),
    skip: () => commit(skip(stateRef.current)),
  }
}
