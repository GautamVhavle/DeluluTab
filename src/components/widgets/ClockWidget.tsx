import { useAppStore } from '@/store/useAppStore'
import { AnalogClock } from './clocks/AnalogClock'
import { DigitalClock } from './clocks/DigitalClock'
import { FlipClock } from './clocks/FlipClock'
import { WorldClock } from './clocks/WorldClock'
import type { WidgetProps } from './types'

/** Picks the clock style chosen in Settings. Every style supports all three layouts. */
export function ClockWidget({ mode }: WidgetProps) {
  const style = useAppStore((s) => s.settings.clockStyle)
  switch (style) {
    case 'flip':
      return <FlipClock mode={mode} />
    case 'analog':
      return <AnalogClock mode={mode} />
    case 'world':
      return <WorldClock mode={mode} />
    default:
      return <DigitalClock mode={mode} />
  }
}
