import { useEffect, useState } from 'react'
import { isGithubUsername } from '@/services/github'
import { Code, Edit, Plus, Trash2 } from '@/components/common/icons'
import { WIDGET_ICONS } from '@/components/widgets/widgetIcons'
import { useIntegration } from '@/hooks/useIntegration'
import { BUILTIN_WIDGETS, MAX_CUSTOM_WIDGETS } from '@/utils/widgetLayout'
import { AI_PROVIDERS, NEWS_CATEGORIES, SEARCH_ENGINES } from '@/config/defaults'
import { cn } from '@/utils/cn'
import { useAppStore, type AiProviderId, type ClockFormat, type NewsCategory, type SearchEngineId, type TemperatureUnit } from '@/store/useAppStore'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { ClockStylePicker } from './ClockStylePicker'
import { Switch } from '@/components/common/switch'
import { Row, Section, Segmented, SliderRow, selectClass } from './SettingsUi'

export function WidgetsPanel({ onClose }: { onClose: () => void }) {
  const widgets = useAppStore((s) => s.widgets)
  const setWidgetVisible = useAppStore((s) => s.setWidgetVisible)
  const customWidgets = useAppStore((s) => s.customWidgets)
  const addCustomWidget = useAppStore((s) => s.addCustomWidget)
  const updateCustomWidget = useAppStore((s) => s.updateCustomWidget)
  const removeCustomWidget = useAppStore((s) => s.removeCustomWidget)
  const setCustomEditorId = useAppStore((s) => s.setCustomEditorId)
  const setLayoutEditing = useAppStore((s) => s.setLayoutEditing)
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const atCustomLimit = customWidgets.length >= MAX_CUSTOM_WIDGETS

  return (
    <div className="grid gap-7">
      <Section title="Show on the dashboard" hint="Edit mode opens a tray, like iOS: drag a widget on, or use its switch here. New widgets stay off until you add them. Focus shows the clock, search, and the timer once you add it.">
        <ul className="divide-y rounded-xl border">
          {BUILTIN_WIDGETS.map(({ key, label, hint }) => {
            const Icon = WIDGET_ICONS[key]
            return (
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
            )
          })}
        </ul>
        <Button type="button" variant="outline" onClick={() => { setLayoutEditing(true); onClose() }}>
          <Edit /> Arrange on the dashboard
        </Button>
      </Section>

      <Section title="Custom widgets" hint="Your own HTML, CSS and JavaScript. Code runs in a sandbox and cannot see the rest of DeluluTab. Up to 8.">
        {customWidgets.length > 0 && (
          <ul className="divide-y rounded-xl border">
            {customWidgets.map((widget) => (
              <li key={widget.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="flex min-w-0 items-center gap-3">
                  <Code className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <p className="truncate text-sm font-medium">{widget.name.trim() || 'Custom widget'}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${widget.name || 'custom widget'}`} onClick={() => { setCustomEditorId(widget.id); onClose() }}>
                    <Edit />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={confirmRemove === widget.id ? `Confirm delete ${widget.name || 'custom widget'}` : `Delete ${widget.name || 'custom widget'}`}
                    onClick={() => { if (confirmRemove === widget.id) removeCustomWidget(widget.id); else setConfirmRemove(widget.id) }}
                  >
                    <Trash2 />
                  </Button>
                  <Switch aria-label={`Show ${widget.name || 'custom widget'}`} checked={widget.enabled} onCheckedChange={(enabled) => updateCustomWidget(widget.id, { enabled })} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <Button type="button" onClick={() => { if (addCustomWidget()) onClose() }} disabled={atCustomLimit}>
          <Plus /> {atCustomLimit ? 'Custom widget limit reached' : 'Add custom widget'}
        </Button>
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
    <Section title="GitHub" hint="Your public username, stored on this device only. Nothing is sent except that name, and no token is needed.">
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
