import { useMemo } from 'react'
import { Logo } from '@/components/common/Logo'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { MAX_TAB_TITLE, tabTitle } from '@/lib/tabTitle'
import { cn } from '@/lib/utils'
import { useAppStore, type TabTitleMode } from '@/store/useAppStore'
import { Row, Section } from './SettingsUi'

const MODES: { value: TabTitleMode; label: string; hint: string }[] = [
  { value: 'name', label: 'DeluluTab', hint: 'Always shows the name' },
  { value: 'time', label: 'Live time', hint: 'The current time, updating every minute' },
  { value: 'custom', label: 'My own tagline', hint: 'Anything you like' },
]

export function GeneralPanel() {
  const mode = useAppStore((s) => s.settings.tabTitleMode)
  const custom = useAppStore((s) => s.settings.tabTitleCustom)
  const format = useAppStore((s) => s.settings.clockFormat)
  const showIcon = useAppStore((s) => s.settings.showTabIcon)
  const userName = useAppStore((s) => s.settings.userName)
  const updateSettings = useAppStore((s) => s.updateSettings)

  const now = useMemo(() => new Date(), [])
  const preview = (m: TabTitleMode) => tabTitle({ mode: m, custom, format, now })

  return (
    <div className="grid gap-7">
      <Section title="Tab title" hint="What the browser tab says.">
        <div role="radiogroup" aria-label="Tab title" className="grid gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-label={m.label}
              aria-checked={mode === m.value}
              onClick={() => updateSettings({ tabTitleMode: m.value })}
              className={cn(
                'flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                mode === m.value ? 'border-primary bg-primary/10' : 'hover:bg-accent/50',
              )}
            >
              <span>
                <span className="block text-sm font-medium">{m.label}</span>
                <span className="block text-xs text-muted-foreground">{m.hint}</span>
              </span>
              <span className="max-w-[45%] truncate rounded-md bg-secondary/70 px-2 py-1 font-mono text-xs">{preview(m.value)}</span>
            </button>
          ))}
        </div>
        {mode === 'custom' && (
          <div className="grid gap-1.5">
            <Input
              value={custom}
              maxLength={MAX_TAB_TITLE}
              onChange={(e) => updateSettings({ tabTitleCustom: e.target.value })}
              placeholder="e.g. Make today count"
              aria-label="Custom tab title"
            />
            <p className="text-xs text-muted-foreground">{custom.length}/{MAX_TAB_TITLE}. Leave empty to show DeluluTab.</p>
          </div>
        )}
      </Section>

      <Section title="Tab icon">
        <Row label="Show the DeluluTab logo in the tab" hint="Turn off for a blank icon.">
          <div className="flex items-center gap-3">
            <Logo className={cn('h-6 w-6 transition-opacity', !showIcon && 'opacity-25 grayscale')} />
            <Switch aria-label="Show tab icon" checked={showIcon} onCheckedChange={(showTabIcon) => updateSettings({ showTabIcon })} />
          </div>
        </Row>
      </Section>

      <Section title="Greeting">
        <label className="grid gap-1.5 text-sm">
          Your name
          <Input value={userName} maxLength={30} placeholder="Used in “Good morning, …”" onChange={(e) => updateSettings({ userName: e.target.value })} />
        </label>
      </Section>
    </div>
  )
}
