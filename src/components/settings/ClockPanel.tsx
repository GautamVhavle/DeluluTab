import { useEffect, useState } from 'react'
import { ClockWidget } from '@/components/widgets/ClockWidget'
import { Button } from '@/components/common/button'
import { cn } from '@/utils/cn'
import { greetingsJson, readGreetings } from '@/utils/greetings'
import { useAppStore, type ClockFont, type ClockFormat, type ClockTracking, type ClockWeight } from '@/store/useAppStore'
import { More, Row, Section, Segmented } from './SettingsUi'
import { ClockStylePicker } from './ClockStylePicker'
import { Switch } from '@/components/common/switch'

const WEIGHTS: { value: ClockWeight; label: string }[] = [
  { value: 'lighter', label: 'Lighter' },
  { value: 'light', label: 'Light' },
  { value: 'normal', label: 'Normal' },
  { value: 'bold', label: 'Bold' },
  { value: 'bolder', label: 'Bolder' },
  { value: 'boldest', label: 'Boldest' },
]

const FONTS: { value: ClockFont; label: string }[] = [
  { value: 'sans', label: 'Sans' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono', label: 'Mono' },
]

const TRACKING: { value: ClockTracking; label: string }[] = [
  { value: 'tight', label: 'Tight' },
  { value: 'normal', label: 'Even' },
  { value: 'wide', label: 'Wide' },
]

const SWATCHES = ['#f8fafc', '#fde68a', '#fb7185', '#38bdf8', '#c4b5fd', '#34d399']

/** Six weights on one track. The dots mark a quarter, the middle and three quarters. No numbers. */
function WeightSlider({ value, onChange }: { value: ClockWeight; onChange: (value: ClockWeight) => void }) {
  const index = Math.max(0, WEIGHTS.findIndex((item) => item.value === value))
  return (
    <div className="grid gap-3">
      <div className="flex items-baseline justify-between text-xs text-muted-foreground">
        <span>Light</span>
        <span className="text-sm font-medium text-foreground">{WEIGHTS[index].label}</span>
        <span>Bold</span>
      </div>
      <div className="relative flex h-6 items-center">
        <span aria-hidden className="pointer-events-none absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-foreground/15" />
        {[25, 50, 75].map((mark) => (
          <span key={mark} aria-hidden className="pointer-events-none absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/35" style={{ left: `${mark}%` }} />
        ))}
        <input
          type="range"
          min={0}
          max={WEIGHTS.length - 1}
          step={1}
          value={index}
          aria-label="Clock weight"
          aria-valuetext={WEIGHTS[index].label}
          onChange={(e) => onChange(WEIGHTS[Number(e.target.value)].value)}
          className="relative z-10 h-6 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-foreground [&::-webkit-slider-runnable-track]:h-px [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[-6px] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow"
        />
      </div>
    </div>
  )
}

/** Clock style, weight and colour, with the real clock running beside the controls. */
export function ClockPanel() {
  const format = useAppStore((s) => s.settings.clockFormat)
  const showSeconds = useAppStore((s) => s.settings.showSeconds)
  const weight = useAppStore((s) => s.settings.clockWeight)
  const font = useAppStore((s) => s.settings.clockFont)
  const tracking = useAppStore((s) => s.settings.clockTracking)
  const color = useAppStore((s) => s.settings.clockColor)
  const updateSettings = useAppStore((s) => s.updateSettings)

  return (
    <div className="grid gap-7">
      <Section title="Preview">
        <div className="dark overflow-hidden rounded-2xl border bg-slate-950 p-5 text-slate-100 shadow-inner">
          <div className="mx-auto h-40 max-w-md">
            <ClockWidget mode="compact" />
          </div>
        </div>
      </Section>

      <Section title="Style">
        <ClockStylePicker />
      </Section>

      <Section title="Time">
        <Segmented<ClockFormat>
          label="Clock format"
          value={format}
          onChange={(clockFormat) => updateSettings({ clockFormat })}
          options={[{ value: '12h', label: '12-hour' }, { value: '24h', label: '24-hour' }]}
        />
        <Row label="Show seconds">
          <Switch aria-label="Show seconds" checked={showSeconds} onCheckedChange={(showSeconds) => updateSettings({ showSeconds })} />
        </Row>
      </Section>

      <Section title="Weight">
        <WeightSlider value={weight} onChange={(clockWeight) => updateSettings({ clockWeight })} />
      </Section>

      <More label="Face, colour and greetings">
      <Section title="Face">
        <Segmented<ClockFont>
          label="Clock face"
          value={font}
          onChange={(clockFont) => updateSettings({ clockFont })}
          options={FONTS}
        />
        <Segmented<ClockTracking>
          label="Letter spacing"
          value={tracking}
          onChange={(clockTracking) => updateSettings({ clockTracking })}
          options={TRACKING}
        />
      </Section>

      <Section title="Numeral colour">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={color === null}
            onClick={() => updateSettings({ clockColor: null })}
            className={cn('h-8 rounded-full border px-3 text-xs', color === null && 'border-primary bg-primary/10')}
          >
            Theme
          </button>
          {SWATCHES.map((hex) => (
            <button
              key={hex}
              type="button"
              aria-label={hex}
              aria-pressed={color === hex}
              onClick={() => updateSettings({ clockColor: hex })}
              className={cn('h-8 w-8 rounded-full ring-offset-2 ring-offset-background', color === hex && 'ring-2 ring-foreground')}
              style={{ backgroundColor: hex }}
            />
          ))}
          <input
            type="color"
            aria-label="Custom numeral colour"
            value={color ?? '#f8fafc'}
            onChange={(e) => updateSettings({ clockColor: e.target.value })}
            className="h-8 w-10 cursor-pointer rounded border bg-transparent p-0.5"
          />
        </div>
      </Section>
      <GreetingsEditor />
      </More>
    </div>
  )
}

/** The built-in greetings file, shown as JSON so it can be rewritten. */
function GreetingsEditor() {
  const saved = useAppStore((s) => s.settings.greetings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const [draft, setDraft] = useState(() => greetingsJson(saved))
  const [error, setError] = useState('')

  useEffect(() => {
    setDraft(greetingsJson(saved))
    setError('')
  }, [saved])

  function apply() {
    let parsed: unknown
    try {
      parsed = JSON.parse(draft)
    } catch {
      setError('That is not valid JSON.')
      return
    }
    const { book, error: message } = readGreetings(parsed)
    if (message) {
      setError(message)
      return
    }
    updateSettings({ greetings: book })
    setDraft(greetingsJson(book))
    setError('')
  }

  return (
    <Section
      title="Greetings"
      hint="One list for each part of the day. Late is midnight to 5, morning to noon, afternoon to 5pm, evening to 9pm, and night after that. A line stays until that part of the day ends. Your name is added at the end, unless the line already ends with a period or a question mark."
    >
      <textarea
        aria-label="Greetings JSON"
        value={draft}
        spellCheck={false}
        onChange={(e) => { setDraft(e.target.value); setError('') }}
        className="min-h-64 w-full resize-y rounded-xl border bg-background/70 p-3 font-mono text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={apply}>Save greetings</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => { updateSettings({ greetings: null }); setDraft(greetingsJson(null)); setError('') }}>Use the built-in lines</Button>
      </div>
    </Section>
  )
}
