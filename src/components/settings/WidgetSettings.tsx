import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { NEWS_CATEGORIES } from '@/lib/news'
import { AI_PROVIDERS } from '@/lib/aiProviders'
import { SEARCH_ENGINES } from '@/lib/searchEngines'
import {
  useAppStore,
  type AiProviderId,
  type ClockFormat,
  type NewsCategory,
  type SearchEngineId,
  type TemperatureUnit,
  type WidgetKey,
} from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'

const WIDGET_LABELS: { key: WidgetKey; label: string; hint: string }[] = [
  { key: 'clock', label: 'Clock and greeting', hint: 'Time, date and a hello' },
  { key: 'search', label: 'Search bar', hint: 'Google, DuckDuckGo, Perplexity and more' },
  { key: 'aiLauncher', label: 'AI prompt launcher', hint: 'Send a prompt to ChatGPT, Claude, Grok, Gemini or Perplexity' },
  { key: 'weather', label: 'Weather', hint: 'Current conditions and a 4-day forecast' },
  { key: 'news', label: 'News', hint: 'Headlines by category' },
  { key: 'quickApps', label: 'Quick apps', hint: 'Your shortcuts and folders' },
]

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

export function WidgetSettings({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-describedby="widget-settings-desc">
        <SheetHeader>
          <SheetTitle>Widgets</SheetTitle>
          <SheetDescription id="widget-settings-desc">Choose what appears on your dashboard.</SheetDescription>
        </SheetHeader>
        <Body />
      </SheetContent>
    </Sheet>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
    </section>
  )
}

function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-lg bg-secondary p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded-md px-2 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            value === o.value ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Body() {
  const widgets = useAppStore((s) => s.widgets)
  const setWidgetVisible = useAppStore((s) => s.setWidgetVisible)
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)

  return (
    <div className="grid gap-6">
      <Section title="Show on dashboard">
        <ul className="divide-y rounded-lg border">
          {WIDGET_LABELS.map(({ key, label, hint }) => (
            <li key={key} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">{label}</p>
                <p className="truncate text-xs text-muted-foreground">{hint}</p>
              </div>
              <Switch aria-label={label} checked={widgets[key]} onCheckedChange={(v) => setWidgetVisible(key, v)} />
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">Focus layout only ever shows the clock and search bar.</p>
      </Section>

      <Section title="Clock">
        <Segmented<ClockFormat>
          label="Clock format"
          value={settings.clockFormat}
          onChange={(clockFormat) => updateSettings({ clockFormat })}
          options={[{ value: '12h', label: '12-hour' }, { value: '24h', label: '24-hour' }]}
        />
        <label className="flex items-center justify-between gap-3 text-sm">
          Show seconds
          <Switch aria-label="Show seconds" checked={settings.showSeconds} onCheckedChange={(showSeconds) => updateSettings({ showSeconds })} />
        </label>
        <label className="grid gap-1.5 text-sm">
          Your name
          <Input
            value={settings.userName}
            maxLength={30}
            placeholder="Used in the greeting"
            onChange={(e) => updateSettings({ userName: e.target.value })}
          />
        </label>
      </Section>

      <Section title="Search">
        <select
          aria-label="Default search engine"
          className={selectClass}
          value={settings.searchEngine}
          onChange={(e) => updateSettings({ searchEngine: e.target.value as SearchEngineId })}
        >
          <optgroup label="Search the web">
            {SEARCH_ENGINES.filter((e) => e.group === 'web').map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </optgroup>
          <optgroup label="Ask an AI">
            {SEARCH_ENGINES.filter((e) => e.group === 'ai').map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </optgroup>
        </select>
      </Section>

      <Section title="AI prompt launcher">
        <select
          aria-label="Default AI"
          className={selectClass}
          value={settings.aiProvider}
          onChange={(e) => updateSettings({ aiProvider: e.target.value as AiProviderId })}
        >
          {AI_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <p className="text-xs text-muted-foreground">Prompts open the AI's own site in a new tab. No account or API key needed here; you sign in on their site.</p>
      </Section>

      <Section title="Weather">
        <Segmented<TemperatureUnit>
          label="Temperature unit"
          value={settings.temperatureUnit}
          onChange={(temperatureUnit) => updateSettings({ temperatureUnit })}
          options={[{ value: 'c', label: '°C' }, { value: 'f', label: '°F' }]}
        />
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="min-w-0 truncate text-muted-foreground">
            {settings.weatherLocation ? `Location: ${settings.weatherLocation.name}` : 'Location: detected automatically'}
          </span>
          {settings.weatherLocation && (
            <Button size="sm" variant="outline" onClick={() => updateSettings({ weatherLocation: null })}>Use my location</Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">To pick a city, click the place name on the weather card.</p>
      </Section>

      <Section title="News">
        <Segmented<NewsCategory>
          label="News category"
          value={settings.newsCategory}
          onChange={(newsCategory) => updateSettings({ newsCategory })}
          options={NEWS_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
        />
      </Section>
    </div>
  )
}
