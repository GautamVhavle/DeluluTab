import { cn } from '@/utils/cn'
import { useAppStore } from '@/store/useAppStore'

/** 12h / 24h and :ss toggles, revealed on hover. Shared by the clock styles that show a digital time. */
export function ClockControls({ className }: { className?: string }) {
  const format = useAppStore((s) => s.settings.clockFormat)
  const showSeconds = useAppStore((s) => s.settings.showSeconds)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const chip = 'rounded-md px-2 py-0.5 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <div className={cn('absolute bottom-0 right-0 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover/clock:opacity-100', className)}>
      <div role="radiogroup" aria-label="Clock format" className="flex rounded-lg bg-secondary/70 p-0.5">
        {(['12h', '24h'] as const).map((f) => (
          <button
            key={f}
            role="radio"
            aria-checked={format === f}
            onClick={() => updateSettings({ clockFormat: f })}
            className={cn(chip, format === f ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            {f}
          </button>
        ))}
      </div>
      <button
        aria-pressed={showSeconds}
        onClick={() => updateSettings({ showSeconds: !showSeconds })}
        className={cn(chip, 'bg-secondary/70', showSeconds ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
      >
        :ss
      </button>
    </div>
  )
}
