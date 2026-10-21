import { useMemo } from 'react'
import { allZones, cityName, isValidTimeZone, zonedParts } from '@/utils/timezones'
import { cn } from '@/utils/cn'
import { useAppStore, type ClockStyle } from '@/store/useAppStore'
import { Section, selectClass } from './SettingsUi'

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
  const valid = isValidTimeZone(zone) ? zone : 'UTC'
  const p = zonedParts(new Date(), valid)
  const groups = useMemo(() => {
    const zones = [...allZones()]
    if (!zones.includes(valid)) zones.unshift(valid)
    const map = new Map<string, string[]>()
    for (const id of zones) {
      const area = id.includes('/') ? id.split('/')[0] : 'Other'
      const list = map.get(area) ?? []
      list.push(id)
      map.set(area, list)
    }
    return [...map.entries()]
  }, [valid])

  return (
    <Section title="Second time zone" hint={`Showing ${cityName(valid)} (${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')} there right now).`}>
      <select
        aria-label="Second time zone"
        value={valid}
        onChange={(e) => updateSettings({ secondTimezone: e.target.value })}
        className={selectClass}
      >
        {groups.map(([area, ids]) => (
          <optgroup key={area} label={area}>
            {ids.map((id) => {
              const city = cityName(id)
              const shared = ids.filter((other) => cityName(other) === city).length > 1
              return <option key={id} value={id}>{shared ? `${city} · ${id}` : city}</option>
            })}
          </optgroup>
        ))}
      </select>
    </Section>
  )
}
