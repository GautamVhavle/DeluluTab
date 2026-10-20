import { useEffect, useState } from 'react'

/**
 * The current time, re-read exactly when the second (or minute) changes rather than on a drifting interval,
 * so displays never lag. With `seconds` false it only wakes once a minute.
 */
export function useNow(seconds: boolean) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    setNow(new Date())
    const unit = seconds ? 1000 : 60_000
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      timer = setTimeout(() => {
        setNow(new Date())
        schedule()
      }, unit - (Date.now() % unit) + 5)
    }
    schedule()
    // A throttled background tab can fall behind; catch up the moment it is visible again.
    const onVisible = () => !document.hidden && setNow(new Date())
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [seconds])
  return now
}
