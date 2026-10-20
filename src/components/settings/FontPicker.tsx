import { useEffect } from 'react'
import { FONTS, loadFont } from '@/config/fonts'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/store/useAppStore'

/** Five typefaces, each previewed in itself. Previews need the fonts, so opening the picker loads all five (they're local files). */
export function FontPicker() {
  const current = useAppStore((s) => s.settings.fontFamily)
  const updateSettings = useAppStore((s) => s.updateSettings)
  useEffect(() => {
    FONTS.forEach((f) => void loadFont(f.id))
  }, [])

  return (
    <div role="radiogroup" aria-label="Font" className="grid gap-2 sm:grid-cols-2">
      {FONTS.map((f) => (
        <button
          key={f.id}
          type="button"
          role="radio"
          aria-checked={current === f.id}
          onClick={() => updateSettings({ fontFamily: f.id })}
          className={cn(
            'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            current === f.id ? 'border-primary bg-primary/10' : 'hover:bg-accent/50',
          )}
        >
          <span aria-hidden className="text-3xl leading-none" style={{ fontFamily: f.stack }}>Aa</span>
          <span className="min-w-0">
            <span className="block truncate text-sm" style={{ fontFamily: f.stack }}>{f.label}</span>
            <span className="block truncate text-xs text-muted-foreground">{f.note}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
