import { useState } from 'react'
import type { IconType } from 'react-icons'
import { isGithubUsername } from '@/lib/github'
import { Archive, Clock, Coffee, Github, Newspaper, Search, Sparkles, Widgets } from '@/lib/icons'
import { FaCloudSun } from 'react-icons/fa6'
import { AI_PROVIDERS, NEWS_CATEGORIES, SEARCH_ENGINES } from '@/store/defaults'
import { cn } from '@/lib/utils'
import { useAppStore, type AiProviderId, type ClockFormat, type NewsCategory, type SearchEngineId, type TemperatureUnit, type WidgetKey } from '@/store/useAppStore'
import { Input } from '@/components/ui/input'
import { ClockStylePicker } from './ClockStylePicker'
import { Switch } from '@/components/ui/switch'
import { Row, Section, Segmented, SliderRow, selectClass } from './SettingsUi'

const WIDGETS: { key: WidgetKey; label: string; hint: string; Icon: IconType }[] = [
  { key: 'clock', label: 'Clock and greeting', hint: 'Time, date and a hello', Icon: Clock },
  { key: 'search', label: 'Search bar', hint: 'Google, DuckDuckGo, Bing and more', Icon: Search },
  { key: 'aiLauncher', label: 'AI prompt launcher', hint: 'ChatGPT, Claude, Grok, Gemini, Perplexity', Icon: Sparkles },
  { key: 'weather', label: 'Weather', hint: 'Current conditions and a 4-day forecast', Icon: FaCloudSun },
  { key: 'news', label: 'News', hint: 'Headlines by category', Icon: Newspaper },
  { key: 'quickApps', label: 'Quick apps', hint: 'Your shortcuts and folders', Icon: Widgets },
  { key: 'pomodoro', label: 'Focus timer', hint: 'Pomodoro timer with ambient sounds', Icon: Coffee },
  { key: 'github', label: 'GitHub activity', hint: 'Contribution graph and recent repositories', Icon: Github },
  { key: 'tabStash', label: 'Tab stash', hint: 'Save and restore sets of tabs', Icon: Archive },
]

export function WidgetsPanel() {
  const widgets = useAppStore((s) => s.widgets)
  const setWidgetVisible = useAppStore((s) => s.setWidgetVisible)
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)

  return (
    <div className="grid gap-7">
      <Section title="Show on the dashboard" hint="Focus layout shows only the clock, search bar and focus timer.">
        <ul className="divide-y rounded-xl border">
          {WIDGETS.map(({ key, label, hint, Icon }) => (
            <li key={key} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="flex min-w-0 items-center gap-3">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="truncate text-xs text-muted-foreground">{hint}</p>
                </div>
              </div>
              <Switch aria-label={label} checked={widgets[key]} onCheckedChange={(v) => setWidgetVisible(key, v)} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Defaults">
        <label className="grid gap-1.5 text-sm">
          Search engine
          <select aria-label="Default search engine" className={selectClass} value={settings.searchEngine} onChange={(e) => updateSettings({ searchEngine: e.target.value as SearchEngineId })}>
            <optgroup label="Search the web">
              {SEARCH_ENGINES.filter((e) => e.group === 'web').map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </optgroup>
            <optgroup label="Ask an AI">
              {SEARCH_ENGINES.filter((e) => e.group === 'ai').map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </optgroup>
          </select>
        </label>
        <label className="grid gap-1.5 text-sm">
          AI for the prompt launcher
          <select aria-label="Default AI" className={selectClass} value={settings.aiProvider} onChange={(e) => updateSettings({ aiProvider: e.target.value as AiProviderId })}>
            {AI_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      </Section>

      <Section title="Clock">
        <ClockStylePicker />
        <Segmented<ClockFormat>
          label="Clock format"
          value={settings.clockFormat}
          onChange={(clockFormat) => updateSettings({ clockFormat })}
          options={[{ value: '12h', label: '12-hour' }, { value: '24h', label: '24-hour' }]}
        />
        <Row label="Show seconds">
          <Switch aria-label="Show seconds" checked={settings.showSeconds} onCheckedChange={(showSeconds) => updateSettings({ showSeconds })} />
        </Row>
      </Section>

      <Section title="Weather" hint={settings.weatherLocation ? `Showing ${settings.weatherLocation.name}. Click the place name on the weather card to change it.` : 'Using your location. Click the place name on the weather card to pick a city instead.'}>
        <Segmented<TemperatureUnit>
          label="Temperature unit"
          value={settings.temperatureUnit}
          onChange={(temperatureUnit) => updateSettings({ temperatureUnit })}
          options={[{ value: 'c', label: '°C' }, { value: 'f', label: '°F' }]}
        />
        {settings.weatherLocation && (
          <div>
            <button type="button" onClick={() => updateSettings({ weatherLocation: null })} className="text-xs underline underline-offset-2 hover:text-foreground">
              Use my location instead
            </button>
          </div>
        )}
      </Section>

      <Section title="Focus timer" hint="Changes apply to the next session; a running one keeps its length.">
        <SliderRow label="Focus" value={settings.pomodoroWorkMin} min={1} max={90} step={1} format={(v) => `${v} min`} onChange={(pomodoroWorkMin) => updateSettings({ pomodoroWorkMin })} />
        <SliderRow label="Break" value={settings.pomodoroBreakMin} min={1} max={30} step={1} format={(v) => `${v} min`} onChange={(pomodoroBreakMin) => updateSettings({ pomodoroBreakMin })} />
        <SliderRow label="Sound level" value={settings.ambientVolume} min={0} max={100} step={5} format={(v) => `${v}%`} onChange={(ambientVolume) => updateSettings({ ambientVolume })} />
      </Section>

      <GithubSetting />

      <Section title="News">
        <div role="radiogroup" aria-label="News category" className="flex flex-wrap gap-1.5">
          {NEWS_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={settings.newsCategory === c.id}
              onClick={() => updateSettings({ newsCategory: c.id as NewsCategory })}
              className={cn(
                'rounded-full px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                settings.newsCategory === c.id ? 'bg-primary text-primary-foreground' : 'bg-secondary/70 text-muted-foreground hover:text-foreground',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Section>
    </div>
  )
}

function GithubSetting() {
  const saved = useAppStore((s) => s.settings.githubUsername)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const [draft, setDraft] = useState(saved)
  const [error, setError] = useState('')

  function commit() {
    const name = draft.trim().replace(/^@/, '')
    if (name === saved) return setError('')
    if (name && !isGithubUsername(name)) return setError('GitHub usernames use letters, numbers and single hyphens.')
    setError('')
    setDraft(name)
    updateSettings({ githubUsername: name })
  }

  return (
    <Section title="GitHub" hint="Your public username. Nothing is sent except that name, and no token is needed.">
      <Input
        value={draft}
        maxLength={40}
        onChange={(e) => { setDraft(e.target.value); setError('') }}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        placeholder="e.g. torvalds"
        aria-label="GitHub username"
        autoComplete="off"
        spellCheck={false}
      />
      {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
    </Section>
  )
}
