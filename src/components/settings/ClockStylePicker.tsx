import { useState } from 'react'
import { allZones, cityName, isValidTimeZone, normalizeZoneInput, POPULAR_ZONES, zonedParts } from '@/lib/timezones'
import { cn } from '@/lib/utils'
import { useAppStore, type ClockStyle } from '@/store/useAppStore'
import { Input } from '@/components/ui/input'
import { Section } from './SettingsUi'

function MiniDigital() {
  return <span className="bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-lg font-light tabular-nums text-transparent">10:42</span>
}
function MiniFlip() {
  const card = 'grid h-7 w-6 place-items-center rounded-[4px] bg-card text-xs font-medium ring-1 ring-border'
  return <span className="flex gap-0.5"><span className={card}>10</span><span className={card}>42</span></span>
}
function MiniAnalog() {
  return (
    <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
      <circle cx="20" cy="20" r="18" className="fill-card/60 stroke-border" strokeWidth="1.5" />
      <line x1="20" y1="20" x2="20" y2="9" className="stroke-foreground" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="20" x2="28" y2="24" className="stroke-foreground" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="20" r="2" className="fill-primary" />
    </svg>
  )
}
function MiniWorld() {
  return <span className="grid text-[10px] leading-tight tabular-nums"><span>10:42</span><span className="text-muted-foreground">NYC 4:42</span></span>
}

const STYLES: { id: ClockStyle; label: string; hint: string; Preview: () => React.JSX.Element }[] = [
  { id: 'digital', label: 'Digital', hint: 'Minimal, frosted numerals', Preview: MiniDigital },
  { id: 'flip', label: 'Flip clock', hint: 'Retro flip cards', Preview: MiniFlip },
  { id: 'analog', label: 'Analog', hint: 'Ticking hands', Preview: MiniAnalog },
  { id: 'world', label: 'World', hint: 'Local plus a second zone', Preview: MiniWorld },
]

export function ClockStylePicker() {
  const style = useAppStore((s) => s.settings.clockStyle)
  const updateSettings = useAppStore((s) => s.updateSettings)

  return (
    <div className="grid gap-4">
      <div role="radiogroup" aria-label="Clock style" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STYLES.map(({ id, label, hint, Preview }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={style === id}
            aria-label={label}
            onClick={() => updateSettings({ clockStyle: id })}
            className={cn(
              'grid justify-items-center gap-1.5 rounded-xl border p-2.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              style === id ? 'border-primary bg-primary/10' : 'hover:bg-accent/50',
            )}
          >
            <span className="grid h-9 place-items-center"><Preview /></span>
            <span className="text-sm font-medium">{label}</span>
            <span className="text-[11px] leading-tight text-muted-foreground">{hint}</span>
          </button>
        ))}
      </div>
      {style === 'world' && <TimezonePicker />}
    </div>
  )
}

function TimezonePicker() {
  const zone = useAppStore((s) => s.settings.secondTimezone)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const valid = isValidTimeZone(zone) ? zone : 'UTC'
  const p = zonedParts(new Date(), valid)

  function commit() {
    const name = draft.trim()
    if (!name) return setError('')
    const match = normalizeZoneInput(name)
    if (!match) return setError('Not a known time zone. Try a name like Europe/Paris.')
    updateSettings({ secondTimezone: match })
    setDraft('')
    setError('')
  }

  return (
    <Section title="Second time zone" hint={`Showing ${cityName(valid)} (${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')} there right now).`}>
      <div role="radiogroup" aria-label="Popular time zones" className="flex flex-wrap gap-1.5">
        {POPULAR_ZONES.map((z) => (
          <button
            key={z.id}
            type="button"
            role="radio"
            aria-checked={valid === z.id}
            onClick={() => updateSettings({ secondTimezone: z.id })}
            className={cn('rounded-full px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', valid === z.id ? 'bg-primary text-primary-foreground' : 'bg-secondary/70 text-muted-foreground hover:text-foreground')}
          >
            {z.city}
          </button>
        ))}
      </div>
      <Input
        list="delulutab-zones"
        value={draft}
        onChange={(e) => { setDraft(e.target.value); setError('') }}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), commit())}
        placeholder="Or type any zone, e.g. Africa/Nairobi"
        aria-label="Custom time zone"
        autoComplete="off"
        spellCheck={false}
      />
      <datalist id="delulutab-zones">{allZones().map((z) => <option key={z} value={z} />)}</datalist>
      {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
    </Section>
  )
}
