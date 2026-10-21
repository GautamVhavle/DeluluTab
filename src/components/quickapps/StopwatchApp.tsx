import { useEffect, useState } from 'react'
import { Button } from '@/components/common/button'

function pad(n: number, size = 2) {
  return String(n).padStart(size, '0')
}

function read(ms: number) {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const hundredths = Math.floor((ms % 1000) / 10)
  return `${pad(minutes)}:${pad(seconds)}.${pad(hundredths)}`
}

/** A stopwatch with laps. It only runs while this mini app is open. */
export function StopwatchApp() {
  const [running, setRunning] = useState(false)
  const [startedAt, setStartedAt] = useState(0)
  const [banked, setBanked] = useState(0)
  const [now, setNow] = useState(0)
  const [laps, setLaps] = useState<number[]>([])

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setNow(Date.now()), 50)
    return () => window.clearInterval(id)
  }, [running])

  const elapsed = banked + (running ? Math.max(0, now - startedAt) : 0)

  return (
    <div className="flex h-full flex-col items-center gap-5 pt-6">
      <p className="font-mono text-5xl font-semibold tabular-nums tracking-tight" aria-live="polite">{read(elapsed)}</p>
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={() => {
            if (running) {
              setBanked(elapsed)
              setRunning(false)
            } else {
              setStartedAt(Date.now())
              setNow(Date.now())
              setRunning(true)
            }
          }}
        >
          {running ? 'Pause' : 'Start'}
        </Button>
        <Button type="button" variant="secondary" disabled={!running && elapsed === 0} onClick={() => setLaps((list) => [elapsed, ...list].slice(0, 8))}>Lap</Button>
        <Button type="button" variant="secondary" onClick={() => { setRunning(false); setBanked(0); setLaps([]) }}>Reset</Button>
      </div>
      {laps.length > 0 && (
        <ol className="w-full max-w-xs space-y-1 text-sm tabular-nums text-muted-foreground">
          {laps.map((lap, index) => (
            <li key={`${lap}-${index}`} className="flex justify-between">
              <span>Lap {laps.length - index}</span>
              <span>{read(lap)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
