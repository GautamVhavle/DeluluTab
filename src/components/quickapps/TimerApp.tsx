import { useEffect, useState } from 'react'
import { Button } from '@/components/common/button'
import { cn } from '@/utils/cn'

const PRESETS = [1, 5, 15, 25]

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** A countdown. Pick a length, start it, and it stays on this tab until it finishes. */
export function TimerApp() {
  const [length, setLength] = useState(5 * 60)
  const [left, setLeft] = useState(5 * 60)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      setLeft((value) => {
        if (value <= 1) {
          setRunning(false)
          return 0
        }
        return value - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [running])

  const minutes = Math.floor(left / 60)
  const seconds = left % 60

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6">
      <p className="font-mono text-6xl font-semibold tabular-nums tracking-tight" aria-live="polite">
        {pad(minutes)}:{pad(seconds)}
      </p>
      <div className="flex gap-2">
        {PRESETS.map((minutes) => (
          <button
            key={minutes}
            type="button"
            disabled={running}
            onClick={() => { setLength(minutes * 60); setLeft(minutes * 60) }}
            className={cn(
              'rounded-full px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
              length === minutes * 60 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
            )}
          >
            {minutes}m
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button type="button" onClick={() => left > 0 && setRunning((on) => !on)}>{running ? 'Pause' : 'Start'}</Button>
        <Button type="button" variant="secondary" onClick={() => { setRunning(false); setLeft(length) }}>Reset</Button>
      </div>
      {left === 0 && <p className="text-sm font-medium">Time’s up.</p>}
    </div>
  )
}
