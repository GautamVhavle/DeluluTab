import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { WidgetProps } from './types'

function greetingFor(hour: number) {
  if (hour < 5) return 'Still up, dreamer?'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function ClockWidget({ mode }: WidgetProps) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })

  if (mode === 'compact') {
    return (
      <div className="flex h-full items-baseline justify-between gap-3">
        <span className="text-3xl font-light tabular-nums tracking-tight">{time}</span>
        <span className="text-xs text-muted-foreground">{date}</span>
      </div>
    )
  }

  const focus = mode === 'focus'
  return (
    <div className={cn('flex h-full flex-col justify-center', focus && 'items-center text-center')}>
      {!focus && <p className="mb-2 text-sm font-medium text-muted-foreground">{greetingFor(now.getHours())}</p>}
      <p className={cn('font-light tabular-nums tracking-tight', focus ? 'text-8xl sm:text-9xl' : 'text-6xl sm:text-7xl')}>
        {time}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{focus ? greetingFor(now.getHours()) : date}</p>
    </div>
  )
}
