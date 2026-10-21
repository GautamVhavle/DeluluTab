import { useEffect, useState } from 'react'
import { isGithubUsername } from '@/services/github'
import { WIDGET_CATALOG } from '@/config/widgetCatalog'
import { More, Section, Segmented, SliderRow, selectClass } from './SettingsUi'
import { CustomWidgetsSection } from './CustomWidgetsSection'
import { WIDGET_ICONS } from '@/components/widgets/widgetIcons'
import { useIntegration } from '@/hooks/useIntegration'
import { AI_PROVIDERS, SEARCH_ENGINES } from '@/config/defaults'
import { NEWS_TOPICS, providersFor } from '@/services/news'
import { cn } from '@/utils/cn'
import { useAppStore, type AiProviderId, type NewsCategory, type SearchEngineId, type TemperatureUnit } from '@/store/useAppStore'
import { Input } from '@/components/common/input'
import { Switch } from '@/components/common/switch'

export function WidgetsPanel({ onClose }: { onClose: () => void }) {
  const widgets = useAppStore((s) => s.widgets)
  const setWidgetVisible = useAppStore((s) => s.setWidgetVisible)
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)

  return (
    <div className="grid gap-7">
      <Section title="Optional widgets">
        <ul className="divide-y rounded-xl border">
          {WIDGET_CATALOG.filter((entry) => entry.optional && entry.key !== 'news').map((entry) => {
            const Icon = WIDGET_ICONS[entry.key]
            return (
              <li key={entry.key} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="flex min-w-0 items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{entry.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{entry.hint}</p>
                  </div>
                </div>
                <Switch aria-label={entry.label} checked={widgets[entry.key]} onCheckedChange={(v) => setWidgetVisible(entry.key, v)} />
              </li>
            )
          })}
        </ul>
      </Section>

      <CustomWidgetsSection onClose={onClose} />

      <More label="Search, weather, timer and news">
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

      <Section title="News" hint="Pick a favourite publication for each topic. If that feed is quiet, the others for the same topic fill in, with their photos.">
        <ul className="grid gap-2">
          {NEWS_TOPICS.map((topic) => {
            const topics = settings.newsTopics?.length ? settings.newsTopics : NEWS_TOPICS.map((item) => item.id)
            const on = topics.includes(topic.id)
            const choices = providersFor(topic.id)
            const saved = settings.newsProviders?.[topic.id]
            const current = choices.some((provider) => provider.id === saved) ? saved : choices[0]?.id
            return (
              <li key={topic.id} className="flex items-center gap-2">
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    const next = on ? topics.filter((id) => id !== topic.id) : [...topics, topic.id]
                    updateSettings({ newsTopics: next.length ? next : [topic.id], newsCategory: next[0] ?? topic.id })
                  }}
                  className={cn('w-24 shrink-0 rounded-full px-3 py-1 text-sm', on ? 'bg-primary text-primary-foreground' : 'bg-secondary/70 text-muted-foreground')}
                >
                  {topic.label}
                </button>
                <select
                  aria-label={`${topic.label} provider`}
                  className={selectClass}
                  disabled={!on}
                  value={current}
                  onChange={(e) => updateSettings({ newsProviders: { ...settings.newsProviders, [topic.id]: e.target.value }, newsCategory: topic.id as NewsCategory })}
                >
                  {choices.map((provider) => <option key={provider.id} value={provider.id}>{provider.label}</option>)}
                </select>
              </li>
            )
          })}
        </ul>
      </Section>
      </More>
    </div>
  )
}

function GithubSetting() {
  const { values, save } = useIntegration('github')
  const saved = values.username ?? ''
  const [draft, setDraft] = useState(saved)
  const [error, setError] = useState('')

  useEffect(() => setDraft(saved), [saved])

  function commit() {
    const name = draft.trim().replace(/^@/, '')
    if (name === saved) return setError('')
    if (name && !isGithubUsername(name)) return setError('GitHub usernames use letters, numbers and single hyphens.')
    setError('')
    setDraft(name)
    void save({ username: name })
  }

  return (
    <Section title="GitHub">
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
