import { useRef, useState, type ReactNode } from 'react'
import { ImagePlus, Shuffle, X } from '@/components/common/icons'
import { blobsCss, GRADIENTS } from '@/config/gradients'
import { UNSPLASH_HOME } from '@/services/unsplash'
import { cn } from '@/utils/cn'
import { useAppStore, type BackgroundRotation, type BackgroundSource } from '@/store/useAppStore'
import { useBackgroundLibrary } from '@/store/useBackgroundLibrary'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/common/sheet'

const SOURCES: { value: BackgroundSource; label: string }[] = [
  { value: 'gradient', label: 'Gradient' },
  { value: 'unsplash', label: 'Unsplash' },
  { value: 'custom', label: 'Your images' },
]

const ROTATIONS: { value: BackgroundRotation; label: string }[] = [
  { value: 'off', label: 'Never' },
  { value: 'newtab', label: 'On every new tab' },
  { value: '1m', label: 'Every minute' },
  { value: '5m', label: 'Every 5 minutes' },
  { value: '15m', label: 'Every 15 minutes' },
  { value: '1h', label: 'Every hour' },
]

const TOPICS = ['nature', 'cyber', 'minimalist', 'architecture', 'space', 'ocean', 'city night', 'texture']

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

export function BackgroundSettings({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-describedby="bg-settings-desc">
        <SheetHeader>
          <SheetTitle>Background</SheetTitle>
          <SheetDescription id="bg-settings-desc">Changes show right away behind this panel.</SheetDescription>
        </SheetHeader>
        <SettingsBody />
      </SheetContent>
    </Sheet>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

function SettingsBody() {
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const skip = useBackgroundLibrary((s) => s.skip)

  return (
    <div className="grid gap-6">
      <div role="radiogroup" aria-label="Background source" className="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1">
        {SOURCES.map(({ value, label }) => (
          <button
            key={value}
            role="radio"
            aria-checked={settings.backgroundSource === value}
            onClick={() => updateSettings({ backgroundSource: value })}
            className={cn(
              'rounded-md px-2 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              settings.backgroundSource === value ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {settings.backgroundSource === 'gradient' && <GradientPicker />}
      {settings.backgroundSource === 'unsplash' && <UnsplashPanel />}
      {settings.backgroundSource === 'custom' && <UploadsPanel />}

      <Section title="Change background">
        <div className="flex gap-2">
          <select
            aria-label="Change background"
            className={selectClass}
            value={settings.backgroundRotation}
            onChange={(e) => updateSettings({ backgroundRotation: e.target.value as BackgroundRotation })}
          >
            {ROTATIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <Button variant="outline" onClick={skip} aria-label="Show another background now">
            <Shuffle /> Shuffle
          </Button>
        </div>
      </Section>

      <Section title="Readability" hint="The overlay already adapts to each background. Add more if text is hard to read.">
        <Slider label="Dim" value={settings.backgroundDim} max={60} unit="%" onChange={(backgroundDim) => updateSettings({ backgroundDim })} />
        <Slider label="Blur" value={settings.backgroundBlur} max={20} unit="px" onChange={(backgroundBlur) => updateSettings({ backgroundBlur })} />
      </Section>
    </div>
  )
}

function Slider({ label, value, max, unit, onChange }: { label: string; value: number; max: number; unit: string; onChange: (v: number) => void }) {
  return (
    <label className="grid grid-cols-[3rem_1fr_3rem] items-center gap-3 text-sm">
      <span>{label}</span>
      <input type="range" min={0} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-violet-500" />
      <span className="text-right tabular-nums text-muted-foreground">{value}{unit}</span>
    </label>
  )
}

function GradientPicker() {
  const preset = useAppStore((s) => s.settings.gradientPreset)
  const rotation = useAppStore((s) => s.settings.backgroundRotation)
  const updateSettings = useAppStore((s) => s.updateSettings)

  return (
    <Section title="Gradient" hint={rotation === 'off' ? undefined : 'The slideshow cycles through all of these. Your pick shows first.'}>
      <div className="grid grid-cols-2 gap-2">
        {GRADIENTS.map((g) => (
          <button
            key={g.id}
            aria-pressed={preset === g.id}
            onClick={() => updateSettings({ gradientPreset: g.id })}
            className={cn(
              'group grid gap-1.5 rounded-xl p-1.5 text-left text-xs outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring',
              preset === g.id && 'bg-accent ring-1 ring-primary',
            )}
          >
            <span className="relative block h-14 overflow-hidden rounded-lg" style={{ backgroundColor: g.base }}>
              <span className="absolute inset-0" style={{ backgroundImage: blobsCss(g) }} />
            </span>
            <span className="px-0.5">{g.name}</span>
          </button>
        ))}
      </div>
    </Section>
  )
}

function UnsplashPanel() {
  const query = useAppStore((s) => s.settings.unsplashQuery)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const savedKey = useBackgroundLibrary((s) => s.unsplashKey)
  const setKey = useBackgroundLibrary((s) => s.setUnsplashKey)
  const queued = useBackgroundLibrary((s) => s.unsplashQueue.length)
  const status = useBackgroundLibrary((s) => s.status)
  const error = useBackgroundLibrary((s) => s.error)

  const [topic, setTopic] = useState(query)
  const [key, setKeyDraft] = useState(savedKey)

  const commitTopic = (value: string) => {
    const next = value.trim()
    setTopic(next)
    if (next !== query) updateSettings({ unsplashQuery: next })
  }

  return (
    <div className="grid gap-5">
      <Section title="Topic" hint="Keywords for the photos. Leave empty for anything.">
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onBlur={() => commitTopic(topic)}
          onKeyDown={(e) => e.key === 'Enter' && commitTopic(topic)}
          placeholder="e.g. misty forest"
          aria-label="Unsplash topic"
        />
        <div className="flex flex-wrap gap-1.5">
          {TOPICS.map((t) => (
            <button
              key={t}
              aria-pressed={query === t}
              onClick={() => commitTopic(t)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                query === t && 'border-primary bg-primary/15',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Unsplash access key" hint="Stored on this device only. It never syncs.">
        <Input
          type="password"
          value={key}
          onChange={(e) => setKeyDraft(e.target.value)}
          onBlur={() => key.trim() !== savedKey && setKey(key)}
          onKeyDown={(e) => e.key === 'Enter' && key.trim() !== savedKey && setKey(key)}
          placeholder="Paste your access key"
          autoComplete="off"
          aria-label="Unsplash access key"
        />
        <p className="text-xs text-muted-foreground">
          Free at{' '}
          <a className="underline underline-offset-2" href="https://unsplash.com/developers" target="_blank" rel="noopener noreferrer">
            unsplash.com/developers
          </a>
          : create an app and copy its access key. Photos come from{' '}
          <a className="underline underline-offset-2" href={UNSPLASH_HOME} target="_blank" rel="noopener noreferrer">Unsplash</a> with credit shown on the page.
        </p>
        {status === 'loading' && <p className="text-xs text-muted-foreground">Loading photos…</p>}
        {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
        {!error && savedKey && status !== 'loading' && <p className="text-xs text-muted-foreground">{queued} photos ready.</p>}
      </Section>
    </div>
  )
}

const formatMB = (chars: number) => `${(chars / 1024 / 1024).toFixed(1)} MB`

function UploadsPanel() {
  const images = useBackgroundLibrary((s) => s.images)
  const pinnedId = useBackgroundLibrary((s) => s.pinnedImageId)
  const addImages = useBackgroundLibrary((s) => s.addImages)
  const removeImage = useBackgroundLibrary((s) => s.removeImage)
  const pinImage = useBackgroundLibrary((s) => s.pinImage)
  const rotation = useAppStore((s) => s.settings.backgroundRotation)

  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [problems, setProblems] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)

  async function add(files: FileList | File[] | null) {
    const list = Array.from(files ?? [])
    if (list.length === 0) return
    setBusy(true)
    setProblems(await addImages(list))
    setBusy(false)
    if (input.current) input.current.value = ''
  }

  const total = images.reduce((sum, i) => sum + i.bytes, 0)

  return (
    <Section
      title="Your images"
      hint={rotation === 'off' ? 'The selected image is shown. Images stay on this device.' : 'The slideshow cycles through all of them. Images stay on this device.'}
    >
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void add(e.dataTransfer.files) }}
        className={cn('rounded-xl border border-dashed p-3 transition-colors', dragging && 'border-primary bg-primary/10')}
      >
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => void add(e.target.files)} aria-label="Choose images" />
        <Button variant="secondary" className="w-full" disabled={busy} onClick={() => input.current?.click()}>
          <ImagePlus /> {busy ? 'Adding…' : 'Add images'}
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">or drop files here. JPEG, PNG, WebP or AVIF.</p>
      </div>

      {problems.map((p) => (
        <p key={p} role="alert" className="text-xs text-red-500">{p}</p>
      ))}

      {images.length > 0 && (
        <>
          <ul className="grid grid-cols-3 gap-2">
            {images.map((img) => (
              <li key={img.id} className="group relative">
                <button
                  aria-label={`Use ${img.name}`}
                  aria-pressed={pinnedId === img.id}
                  onClick={() => pinImage(img.id)}
                  className={cn(
                    'block aspect-video w-full overflow-hidden rounded-lg outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring',
                    pinnedId === img.id && 'ring-2 ring-primary',
                  )}
                >
                  <img src={img.thumb} alt="" className="h-full w-full object-cover" draggable={false} />
                </button>
                <button
                  aria-label={`Remove ${img.name}`}
                  onClick={() => void removeImage(img.id)}
                  className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-background/90 opacity-0 shadow transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{images.length} of 20 · {formatMB(total)}</p>
        </>
      )}
    </Section>
  )
}
