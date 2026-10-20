import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  useAppStore,
  type BackgroundSource,
  type LayoutMode,
  type Theme,
  type WidgetKey,
} from '@/store/useAppStore'

const THEMES: Theme[] = ['dark', 'light', 'dynamic']
const LAYOUTS: LayoutMode[] = ['compact', 'detailed', 'focus']
const BACKGROUNDS: BackgroundSource[] = ['unsplash', 'gradient', 'custom']
const WIDGETS: WidgetKey[] = ['clock', 'weather', 'search', 'news', 'quickApps']

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: T[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        {options.map((o) => (
          <Button
            key={o}
            size="sm"
            variant={o === value ? 'default' : 'secondary'}
            onClick={() => onChange(o)}
          >
            {o}
          </Button>
        ))}
      </div>
    </div>
  )
}

/** Temporary debug UI: change something, refresh the tab, confirm it stuck. */
export function StateDebugPanel() {
  const { settings, widgets, shortcuts, folders, chords } = useAppStore()
  const updateSettings = useAppStore((s) => s.updateSettings)
  const toggleWidget = useAppStore((s) => s.toggleWidget)
  const addShortcut = useAppStore((s) => s.addShortcut)
  const removeShortcut = useAppStore((s) => s.removeShortcut)
  const resetAll = useAppStore((s) => s.resetAll)

  return (
    <aside className="fixed bottom-4 right-4 w-96 space-y-3 rounded-xl border bg-card p-4 text-xs text-card-foreground shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">State debug</h2>
        <Button size="icon" variant="ghost" onClick={resetAll} aria-label="Reset all state">
          <RotateCcw />
        </Button>
      </div>

      <Segmented label="theme" options={THEMES} value={settings.theme} onChange={(theme) => updateSettings({ theme })} />
      <Segmented label="layout" options={LAYOUTS} value={settings.layoutMode} onChange={(layoutMode) => updateSettings({ layoutMode })} />
      <Segmented label="background" options={BACKGROUNDS} value={settings.backgroundSource} onChange={(backgroundSource) => updateSettings({ backgroundSource })} />

      <div className="flex flex-wrap gap-1">
        {WIDGETS.map((w) => (
          <Button key={w} size="sm" variant={widgets[w] ? 'default' : 'outline'} onClick={() => toggleWidget(w)}>
            {w}
          </Button>
        ))}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-muted-foreground">
            {shortcuts.length} shortcuts · {folders.length} folders · {chords.length} chords
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              addShortcut({ title: `Site ${shortcuts.length + 1}`, url: 'https://example.com', icon: 'globe', folderId: null })
            }
          >
            + add
          </Button>
        </div>
        <ul className="max-h-24 space-y-0.5 overflow-auto">
          {shortcuts.map((s) => (
            <li key={s.id} className="flex items-center justify-between">
              <span>{s.title}</span>
              <button className="text-muted-foreground hover:text-destructive" onClick={() => removeShortcut(s.id)}>
                remove
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
