import { useRef } from 'react'
import type { IconType } from 'react-icons'
import { Focus, ImageIcon, LayoutGrid, Rows3 } from '@/components/common/icons'
import { ACCENT_PRESETS, FONT_SCALE_STEP, MAX_FONT_SCALE, MIN_FONT_SCALE } from '@/config/appearance'
import { useIsDark } from '@/hooks/use-theme'
import { cn } from '@/utils/cn'
import { useAppStore, type LayoutMode } from '@/store/useAppStore'
import { Button } from '@/components/common/button'
import { Switch } from '@/components/common/switch'
import { FontPicker } from './FontPicker'
import { Row, Section, Segmented, SliderRow } from './SettingsUi'

const LAYOUTS: { value: LayoutMode; label: string; hint: string; Icon: IconType }[] = [
  { value: 'compact', label: 'Compact', hint: 'Tight and minimal', Icon: Rows3 },
  { value: 'detailed', label: 'Detailed', hint: 'Full dashboard grid', Icon: LayoutGrid },
  { value: 'focus', label: 'Focus', hint: 'Clock, search and timer', Icon: Focus },
]

export function AppearancePanel({ onOpenBackground }: { onOpenBackground: () => void }) {
  const theme = useAppStore((s) => s.settings.theme)
  const layout = useAppStore((s) => s.settings.layoutMode)
  const fontScale = useAppStore((s) => s.settings.fontScale)
  const accent = useAppStore((s) => s.settings.accent)
  const showLogos = useAppStore((s) => s.settings.showLogos)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const isDark = useIsDark()

  const dynamic = theme === 'dynamic'
  // Remember the last explicit choice so switching "Match my system" off returns to it.
  const lastExplicit = useRef<'dark' | 'light'>(isDark ? 'dark' : 'light')
  if (!dynamic) lastExplicit.current = theme

  return (
    <div className="grid gap-7">
      <Section title="Theme">
        <Segmented<'dark' | 'light'>
          label="Theme"
          value={dynamic ? (isDark ? 'dark' : 'light') : theme}
          disabled={dynamic}
          onChange={(t) => updateSettings({ theme: t })}
          options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]}
        />
        <Row label="Match my system" hint="Switches between dark and light with your device.">
          <Switch aria-label="Match my system" checked={dynamic} onCheckedChange={(on) => updateSettings({ theme: on ? 'dynamic' : lastExplicit.current })} />
        </Row>
      </Section>

      <Section title="Layout">
        <div role="radiogroup" aria-label="Layout" className="grid grid-cols-3 gap-2">
          {LAYOUTS.map(({ value, label, hint, Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={layout === value}
              onClick={() => updateSettings({ layoutMode: value })}
              className={cn(
                'grid justify-items-center gap-1 rounded-xl border p-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                layout === value ? 'border-primary bg-primary/10' : 'hover:bg-accent/50',
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{label}</span>
              <span className="text-[11px] leading-tight text-muted-foreground">{hint}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Font" hint="Applies everywhere. Bundled with the extension, so it works offline.">
        <FontPicker />
      </Section>

      <Section title="Text size">
        <SliderRow
          label="Size"
          value={fontScale}
          min={MIN_FONT_SCALE}
          max={MAX_FONT_SCALE}
          step={FONT_SCALE_STEP}
          format={(v) => `${v}%`}
          onChange={(v) => updateSettings({ fontScale: v })}
        />
        {fontScale !== 100 && (
          <div>
            <Button size="sm" variant="ghost" onClick={() => updateSettings({ fontScale: 100 })}>Reset to 100%</Button>
          </div>
        )}
      </Section>

      <Section title="Accent color" hint="Buttons, highlights and focus rings.">
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Accent color">
          {ACCENT_PRESETS.map((a) => {
            const active = (accent ?? ACCENT_PRESETS[0].hex).toLowerCase() === a.hex
            return (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={a.name}
                title={a.name}
                onClick={() => updateSettings({ accent: a.id === 'violet' ? null : a.hex })}
                className={cn('h-7 w-7 rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', active && 'ring-2 ring-foreground')}
                style={{ backgroundColor: a.hex }}
              />
            )
          })}
          <label className="ml-1 flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="color"
              aria-label="Custom accent color"
              value={accent ?? ACCENT_PRESETS[0].hex}
              onChange={(e) => updateSettings({ accent: e.target.value.toLowerCase() })}
              className="h-7 w-9 cursor-pointer rounded border bg-transparent p-0.5"
            />
            Custom
          </label>
        </div>
      </Section>

      <Section title="Logos" hint="Shows each site's real logo on shortcuts, AI tools and search engines.">
        <Row label="Fetch logos from the web" hint="Off: simple symbols only, and no logo requests are made.">
          <Switch aria-label="Fetch logos from the web" checked={showLogos} onCheckedChange={(v) => updateSettings({ showLogos: v })} />
        </Row>
      </Section>

      <Section title="Background" hint="Gradients, Unsplash photos or your own images, with a slideshow.">
        <div>
          <Button variant="secondary" onClick={onOpenBackground}>
            <ImageIcon /> Open background settings
          </Button>
        </div>
      </Section>
    </div>
  )
}
