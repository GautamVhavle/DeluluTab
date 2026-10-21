import { useEffect, useMemo, useState } from 'react'
import { Logo } from '@/components/common/Logo'
import { readBrandLogo, readLogoFile, saveBrandLogo } from '@/services/brand'
import { Input } from '@/components/common/input'
import { Switch } from '@/components/common/switch'
import { tabTitle } from '@/utils/tabTitle'
import { cn } from '@/utils/cn'
import { useAppStore, type TabTitleMode } from '@/store/useAppStore'
import { More, Row, Section } from './SettingsUi'

const MODES: { value: Exclude<TabTitleMode, 'custom'>; label: string; hint: string }[] = [
  { value: 'name', label: 'App name', hint: 'Always shows the name you chose' },
  { value: 'time', label: 'Live time', hint: 'The current time, updating every minute' },
]

export function GeneralPanel() {
  const mode = useAppStore((s) => s.settings.tabTitleMode)
  const format = useAppStore((s) => s.settings.clockFormat)
  const showIcon = useAppStore((s) => s.settings.showTabIcon)
  const userName = useAppStore((s) => s.settings.userName)
  const appName = useAppStore((s) => s.settings.appName)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const [logo, setLogo] = useState(readBrandLogo)
  const [logoError, setLogoError] = useState('')
  useEffect(() => {
    const sync = () => setLogo(readBrandLogo())
    window.addEventListener('delulutab:brand', sync)
    return () => window.removeEventListener('delulutab:brand', sync)
  }, [])

  const now = useMemo(() => new Date(), [])
  const shownMode = mode === 'custom' ? 'name' : mode
  const preview = (m: 'name' | 'time') => tabTitle({ mode: m, custom: '', format, name: appName, now })

  useEffect(() => {
    if (mode === 'custom') updateSettings({ tabTitleMode: 'name' })
  }, [mode, updateSettings])

  return (
    <div className="grid gap-7">
      <Section title="Name">
        <label className="grid gap-1.5 text-sm">
          Name
          <Input value={appName} maxLength={40} placeholder="DeluluTab" aria-label="Application name" onChange={(e) => updateSettings({ appName: e.target.value })} />
        </label>
        <div className="flex items-center gap-3">
          {logo ? <img src={logo} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <Logo className="h-10 w-10" />}
          <label className="text-xs text-muted-foreground">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                readLogoFile(file).then((url) => { saveBrandLogo(url); setLogoError('') }).catch((err: unknown) => setLogoError(err instanceof Error ? err.message : 'Could not use that image.'))
              }}
            />
            <span className="cursor-pointer underline underline-offset-2">Upload a mark</span>
          </label>
          {logo && <button type="button" className="text-xs text-muted-foreground underline underline-offset-2" onClick={() => saveBrandLogo(null)}>Use the DeluluTab mark</button>}
        </div>
        {logoError && <p className="text-xs text-red-500">{logoError}</p>}
      </Section>

      <Section title="Greeting">
        <label className="grid gap-1.5 text-sm">
          Your name
          <Input value={userName} maxLength={30} placeholder="Good morning, …" aria-label="Your name" onChange={(e) => updateSettings({ userName: e.target.value })} />
        </label>
      </Section>

      <More label="Browser tab">
      <Section title="Tab title">
        <div role="radiogroup" aria-label="Tab title" className="grid gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-label={m.label}
              aria-checked={shownMode === m.value}
              onClick={() => updateSettings({ tabTitleMode: m.value })}
              className={cn(
                'flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                shownMode === m.value ? 'border-primary bg-primary/10' : 'hover:bg-accent/50',
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
      </Section>

      <Section title="Tab icon">
        <Row label="Show the mark in the browser tab" hint="Turn off for a blank icon.">
          <div className="flex items-center gap-3">
            {logo ? (
              <img src={logo} alt="" className={cn('h-6 w-6 rounded-md object-cover transition-opacity', !showIcon && 'opacity-25 grayscale')} />
            ) : (
              <Logo className={cn('h-6 w-6 transition-opacity', !showIcon && 'opacity-25 grayscale')} />
            )}
            <Switch aria-label="Show tab icon" checked={showIcon} onCheckedChange={(showTabIcon) => updateSettings({ showTabIcon })} />
          </div>
        </Row>
      </Section>

      </More>
    </div>
  )
}
