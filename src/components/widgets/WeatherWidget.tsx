import { CloudSun } from 'lucide-react'
import type { WidgetProps } from './types'

/** Placeholder until a weather provider is wired up. */
export function WeatherWidget({ mode }: WidgetProps) {
  if (mode === 'compact') {
    return (
      <div className="flex h-full items-center gap-2 text-sm">
        <CloudSun className="h-5 w-5 text-amber-400" />
        <span className="font-medium">21°</span>
        <span className="text-xs text-muted-foreground">Partly cloudy</span>
      </div>
    )
  }
  return (
    <div className="flex h-full items-center justify-between">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground">Weather</h3>
        <p className="mt-1 text-4xl font-light">21°</p>
        <p className="text-xs text-muted-foreground">Partly cloudy · placeholder data</p>
      </div>
      <CloudSun className="h-12 w-12 text-amber-400" />
    </div>
  )
}
