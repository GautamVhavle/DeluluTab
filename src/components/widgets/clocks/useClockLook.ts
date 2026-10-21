import type { CSSProperties } from 'react'
import { useAppStore, type ClockFont, type ClockTracking, type ClockWeight } from '@/store/useAppStore'
import { cn } from '@/utils/cn'

const WEIGHT: Record<ClockWeight, number> = {
  lighter: 200,
  light: 300,
  normal: 400,
  bold: 600,
  bolder: 750,
  boldest: 900,
}

const FONT: Record<ClockFont, string> = {
  sans: 'font-sans',
  serif: 'font-serif',
  mono: 'font-mono',
}

const TRACK: Record<ClockTracking, string> = {
  tight: 'tracking-tight',
  normal: 'tracking-normal',
  wide: 'tracking-widest',
}

/** Face chosen in Clock settings: weight, family, spacing and colour. */
export function useClockLook() {
  const weight = useAppStore((s) => s.settings.clockWeight)
  const font = useAppStore((s) => s.settings.clockFont)
  const tracking = useAppStore((s) => s.settings.clockTracking)
  const color = useAppStore((s) => s.settings.clockColor)
  const chosen = WEIGHT[weight] ?? WEIGHT.light
  const style: CSSProperties = { fontWeight: chosen, ...(color ? { color } : {}) }
  return {
    className: cn(FONT[font] ?? FONT.sans, TRACK[tracking] ?? TRACK.tight),
    weightValue: chosen,
    fontStack: font === 'serif' ? 'Georgia, "Times New Roman", serif' : font === 'mono' ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit',
    style,
  }
}
