import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ImagePlus, Shuffle, X } from '@/components/common/icons'
import { AMBIENT_VIDEOS, DEFAULT_AMBIENT } from '@/config/ambientVideos'
import { MAX_CLIPS } from '@/utils/clipFiles'
import { colorsFor, GRADIENT_PALETTE, GRADIENTS, gradientById, styleOf, type GradientPreset, type GradientStyle } from '@/config/gradients'
import { MAX_SOLID_CUSTOM, SOLID_PRESETS } from '@/config/solids'
import { LivingField } from './LivingField'
import { MeshField } from './MeshField'
import { cn } from '@/utils/cn'
import { useAppStore, type BackgroundRotation, type BackgroundSource, type SolidEffect } from '@/store/useAppStore'
import { More } from '@/components/settings/SettingsUi'
import { useBackgroundLibrary } from '@/store/useBackgroundLibrary'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/common/sheet'

const SOURCES: { value: BackgroundSource; label: string }[] = [
  { value: 'solid', label: 'Colour' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'video', label: 'Live' },
  { value: 'custom', label: 'Uploads' },
]

const SOLID_EFFECTS: { id: SolidEffect; label: string }[] = [
  { id: 'still', label: 'Still' },
  { id: 'fade', label: 'Fade' },
  { id: 'breathe', label: 'Breathe' },
]

const ROTATIONS: { value: BackgroundRotation; label: string }[] = [
  { value: 'off', label: 'Never' },
  { value: 'newtab', label: 'On every new tab' },
  { value: '1m', label: 'Every minute' },
  { value: '5m', label: 'Every 5 minutes' },
  { value: '15m', label: 'Every 15 minutes' },
  { value: '1h', label: 'Every hour' },
]

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
      <div role="radiogroup" aria-label="Background source" className="flex flex-wrap gap-1 rounded-xl bg-secondary/70 p-1">
        {SOURCES.map(({ value, label }) => (
          <button
            key={value}
            role="radio"
            aria-checked={settings.backgroundSource === value}
            onClick={() => updateSettings({ backgroundSource: value })}
            className={cn(
              'relative rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              settings.backgroundSource === value ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {settings.backgroundSource === value && (
              <motion.span layoutId="bg-source" className="absolute inset-0 rounded-full bg-background shadow-sm" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
            )}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      {settings.backgroundSource === 'solid' && <ColorPicker />}
      {settings.backgroundSource === 'gradient' && <GradientPicker />}
      {settings.backgroundSource === 'video' && <VideoPicker />}
      {settings.backgroundSource === 'custom' && <UploadsPanel />}

      <More label="Dim, blur and how often it changes">
        <Section title="Change">
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
        <Section title="Dim and blur">
          <Slider label="Dim" value={settings.backgroundDim} max={60} unit="%" onChange={(backgroundDim) => updateSettings({ backgroundDim })} />
          <Slider label="Blur" value={settings.backgroundBlur} max={20} unit="px" onChange={(backgroundBlur) => updateSettings({ backgroundBlur })} />
        </Section>
      </More>
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

function ColorSwatches({ value, onPick }: { value: string; onPick: (hex: string) => void }) {
  const custom = useAppStore((s) => s.settings.solidCustom)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const known = new Set([...SOLID_PRESETS.map((preset) => preset.hex), ...custom])

  function save(hex: string) {
    const color = hex.toLowerCase()
    if (known.has(color) || custom.length >= MAX_SOLID_CUSTOM) return
    updateSettings({ solidCustom: [...custom, color] })
  }

  function remove(hex: string) {
    updateSettings({ solidCustom: custom.filter((item) => item !== hex) })
    if (value === hex) onPick(SOLID_PRESETS[0].hex)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {SOLID_PRESETS.map((preset) => (
        <button
          key={preset.hex}
          type="button"
          aria-label={preset.name}
          aria-pressed={value === preset.hex}
          onClick={() => onPick(preset.hex)}
          className={cn('h-8 w-8 rounded-full ring-offset-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', value === preset.hex && 'ring-2 ring-foreground')}
          style={{ backgroundColor: preset.hex }}
        />
      ))}
      {custom.map((hex) => (
        <span key={hex} className="relative">
          <button
            type="button"
            aria-label={hex}
            aria-pressed={value === hex}
            onClick={() => onPick(hex)}
            className={cn('h-8 w-8 rounded-full ring-offset-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', value === hex && 'ring-2 ring-foreground')}
            style={{ backgroundColor: hex }}
          />
          <button
            type="button"
            aria-label={`Remove ${hex}`}
            onClick={() => remove(hex)}
            className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-background text-[10px] leading-none shadow"
          >
            ×
          </button>
        </span>
      ))}
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <input
          type="color"
          aria-label="Custom colour"
          value={value}
          onChange={(e) => onPick(e.target.value.toLowerCase())}
          className="h-8 w-10 cursor-pointer rounded border bg-transparent p-0.5"
        />
      </label>
      <button
        type="button"
        disabled={known.has(value) || custom.length >= MAX_SOLID_CUSTOM}
        onClick={() => save(value)}
        className="h-8 rounded-full border px-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
      >
        Save
      </button>
    </div>
  )
}

function ColorPicker() {
  const color = useAppStore((s) => s.settings.solidColor)
  const effect = useAppStore((s) => s.settings.solidEffect)
  const effectColor = useAppStore((s) => s.settings.solidEffectColor)
  const updateSettings = useAppStore((s) => s.updateSettings)

  return (
    <div className="grid gap-4">
      <Section title="Colour">
        <ColorSwatches value={color} onPick={(solidColor) => updateSettings({ solidColor, backgroundSource: 'solid' })} />
      </Section>
      <div role="radiogroup" aria-label="Colour effect" className="flex gap-1">
        {SOLID_EFFECTS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={effect === item.id}
            onClick={() => updateSettings({ solidEffect: item.id, backgroundSource: 'solid' })}
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring',
              effect === item.id ? 'bg-primary text-primary-foreground' : 'bg-secondary/70 text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {effect !== 'still' && (
        <Section title={effect === 'fade' ? 'Fades toward' : 'Breathes toward'}>
          <ColorSwatches value={effectColor} onPick={(solidEffectColor) => updateSettings({ solidEffectColor, backgroundSource: 'solid' })} />
        </Section>
      )}
    </div>
  )
}

function VideoPicker() {
  const selected = useAppStore((s) => s.settings.ambientVideo)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const clips = useBackgroundLibrary((s) => s.clips ?? [])
  const addClips = useBackgroundLibrary((s) => s.addClips)
  const removeClip = useBackgroundLibrary((s) => s.removeClip)
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [problems, setProblems] = useState<string[]>([])

  async function add(files: FileList | null) {
    const list = Array.from(files ?? [])
    if (list.length === 0) return
    setBusy(true)
    const found = await addClips(list)
    setProblems(found)
    setBusy(false)
    if (input.current) input.current.value = ''
    const added = useBackgroundLibrary.getState().clips.at(-1)
    if (added && found.length < list.length) updateSettings({ ambientVideo: `upload:${added.id}`, backgroundSource: 'video' })
  }

  return (
    <Section title="Live scene">
      <ul className="grid grid-cols-3 gap-2">
        {AMBIENT_VIDEOS.map((video) => {
          const on = selected === video.id
          return (
            <li key={video.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => updateSettings({ ambientVideo: video.id, backgroundSource: 'video' })}
                className={cn(
                  'flex w-full flex-col gap-2 rounded-xl border p-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  on ? 'border-primary' : 'border-transparent hover:border-foreground/15',
                )}
              >
                <span className="relative block h-16 overflow-hidden rounded-lg" style={{ backgroundColor: video.tone.color }}>
                  <img src={video.poster} alt="" className="h-full w-full object-cover" />
                </span>
                <span className="px-0.5 text-center text-[11px] font-medium leading-tight">{video.title}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="grid gap-2">
        <p className="text-xs font-medium">Your clip</p>
        <input ref={input} type="file" accept="video/mp4,video/webm,image/gif" hidden onChange={(e) => void add(e.target.files)} aria-label="Choose a video or GIF" />
        <Button variant="secondary" className="w-full" disabled={busy || clips.length >= MAX_CLIPS} onClick={() => input.current?.click()}>
          {busy ? 'Adding…' : 'Add a video or GIF'}
        </Button>
        {clips.length > 0 && (
          <ul className="grid grid-cols-3 gap-2">
            {clips.map((clip) => {
              const id = `upload:${clip.id}`
              const on = selected === id
              return (
                <li key={clip.id} className="relative">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => updateSettings({ ambientVideo: id, backgroundSource: 'video' })}
                    className={cn('flex w-full flex-col gap-2 rounded-xl border p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', on ? 'border-primary' : 'border-transparent hover:border-foreground/15')}
                  >
                    <span className="relative block h-16 overflow-hidden rounded-lg" style={{ backgroundColor: clip.tone.color }}>
                      <img src={clip.thumb} alt="" className="h-full w-full object-cover" />
                    </span>
                    <span className="truncate px-0.5 text-center text-[11px] font-medium">{clip.name}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${clip.name}`}
                    onClick={() => {
                      void removeClip(clip.id)
                      if (selected === id) updateSettings({ ambientVideo: DEFAULT_AMBIENT })
                    }}
                    className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-background/90 text-xs shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {problems.map((problem) => <p key={problem} role="alert" className="text-xs text-red-500">{problem}</p>)}
      </div>
    </Section>
  )
}

const STYLES: { id: GradientStyle; label: string }[] = [
  { id: 'flow', label: 'Flow' },
  { id: 'clouds', label: 'Clouds' },
  { id: 'sunrise', label: 'Sunrise' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'watercolor', label: 'Watercolors' },
]

function GradientPicker() {
  const presetId = useAppStore((s) => s.settings.gradientPreset)
  const custom = useAppStore((s) => s.settings.gradientColors)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const [slot, setSlot] = useState(0)
  const [editing, setEditing] = useState(false)
  const preset = gradientById(presetId)
  const [style, setStyle] = useState<GradientStyle>(styleOf(preset))

  useEffect(() => {
    setStyle(styleOf(gradientById(presetId)))
  }, [presetId])

  const colors = colorsFor(preset, custom)
  const active = Math.min(slot, colors.length - 1)
  const shown = GRADIENTS.filter((g) => styleOf(g) === style && (g.live || g.id === presetId))

  const pickStyle = (next: GradientStyle) => {
    setStyle(next)
    const first = GRADIENTS.find((g) => g.live && styleOf(g) === next)
    if (first) updateSettings({ gradientPreset: first.id, gradientColors: [], backgroundSource: 'gradient' })
  }

  const edit = (index: number, hex: string) => {
    const next = [...colors]
    next[index] = hex.toLowerCase()
    updateSettings({ gradientColors: next, backgroundSource: 'gradient' })
  }

  return (
    <div className="grid gap-5">
      <Section title="Gradient">
        <div role="radiogroup" aria-label="Gradient style" className="flex flex-wrap gap-1">
          {STYLES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={style === id}
              onClick={() => pickStyle(id)}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                style === id ? 'bg-primary text-primary-foreground' : 'bg-secondary/70 text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {shown.map((g) => (
            <button
              key={g.id}
              aria-pressed={presetId === g.id && custom.length < 2}
              onClick={() => updateSettings({ gradientPreset: g.id, gradientColors: [], backgroundSource: 'gradient' })}
              className={cn(
                'grid gap-1.5 rounded-xl p-1.5 text-left text-xs outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring',
                presetId === g.id && custom.length < 2 && 'bg-accent ring-1 ring-primary',
              )}
            >
              <GradientSwatch preset={g} />
              <span className="px-0.5">{g.name}</span>
            </button>
          ))}
        </div>
      </Section>

      <button type="button" aria-expanded={editing} onClick={() => setEditing((open) => !open)} className="justify-self-start text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
        {editing ? 'Hide colours' : 'Adjust colours'}
      </button>
      {editing && <Section title="Colours">
        <div className="flex flex-wrap items-center gap-2">
          {colors.map((color, index) => (
            <button
              key={`${color}-${index}`}
              type="button"
              aria-pressed={index === active}
              aria-label={`Colour ${index + 1}, ${color}`}
              onClick={() => setSlot(index)}
              className={cn('h-8 w-8 rounded-full ring-offset-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', index === active && 'ring-2 ring-foreground')}
              style={{ backgroundColor: color }}
            />
          ))}
          {colors.length < 5 && (
            <button type="button" onClick={() => edit(colors.length, GRADIENT_PALETTE[colors.length % GRADIENT_PALETTE.length])} className="h-8 rounded-full border border-dashed px-2 text-xs text-muted-foreground">
              Add
            </button>
          )}
          {colors.length > 2 && (
            <button type="button" onClick={() => { const next = colors.filter((_, i) => i !== active); updateSettings({ gradientColors: next }); setSlot(Math.max(0, active - 1)) }} className="h-8 rounded-full px-2 text-xs text-muted-foreground hover:text-foreground">
              Remove
            </button>
          )}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="color"
            aria-label="Custom colour"
            value={colors[active].toLowerCase()}
            onChange={(e) => edit(active, e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border bg-transparent p-0.5"
          />
          {colors[active]}
        </label>
        <div className="flex flex-wrap gap-1.5" role="list" aria-label="Palette">
          {GRADIENT_PALETTE.map((hex) => (
            <button
              key={hex}
              type="button"
              role="listitem"
              aria-label={hex}
              onClick={() => edit(active, hex)}
              className={cn('h-6 w-6 rounded-full ring-offset-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', colors[active].toLowerCase() === hex.toLowerCase() && 'ring-2 ring-foreground')}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
        {custom.length >= 2 && (
          <button type="button" onClick={() => updateSettings({ gradientColors: [] })} className="justify-self-start text-xs text-muted-foreground underline-offset-2 hover:underline">
            Use the {preset.name} palette
          </button>
        )}
      </Section>}
    </div>
  )
}

function GradientSwatch({ preset }: { preset: GradientPreset }) {
  const paint = styleOf(preset)
  return (
    <span className="relative block h-24 overflow-hidden rounded-lg" style={{ backgroundColor: preset.colors[0] }}>
      {paint === 'flow' ? <MeshField colors={preset.colors} /> : <LivingField style={paint} colors={preset.colors} />}
    </span>
  )
}

const formatMB = (chars: number) => `${(chars / 1024 / 1024).toFixed(1)} MB`

function UploadsPanel() {
  const images = useBackgroundLibrary((s) => s.images)
  const pinnedId = useBackgroundLibrary((s) => s.pinnedImageId)
  const addImages = useBackgroundLibrary((s) => s.addImages)
  const removeImage = useBackgroundLibrary((s) => s.removeImage)
  const pinImage = useBackgroundLibrary((s) => s.pinImage)
  const imageLink = useAppStore((s) => s.settings.imageLink)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const linkProblem = useBackgroundLibrary((s) => s.error)

  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [problems, setProblems] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const [link, setLink] = useState(imageLink)
  const [linkError, setLinkError] = useState('')

  useEffect(() => setLink(imageLink), [imageLink])

  function saveLink() {
    const next = link.trim().slice(0, 300)
    setLink(next)
    if (!next) {
      setLinkError('')
      if (imageLink) updateSettings({ imageLink: '' })
      return
    }
    try {
      const url = new URL(next)
      if (url.protocol !== 'https:') throw new Error('bad')
    } catch {
      setLinkError('Use an https link to a picture.')
      return
    }
    setLinkError('')
    if (next !== imageLink) updateSettings({ imageLink: next, backgroundSource: 'custom' })
  }

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
    <Section title="Your images">
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

      <div className="grid gap-2">
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onBlur={saveLink}
          onKeyDown={(e) => e.key === 'Enter' && saveLink()}
          placeholder="https://example.com/photo.jpg"
          inputMode="url"
          spellCheck={false}
          aria-label="Picture link"
        />
        <p className="text-xs text-muted-foreground">An https picture, or JSON with a url.</p>
        {linkError && <p role="alert" className="text-xs text-red-500">{linkError}</p>}
        {!linkError && linkProblem && <p role="alert" className="text-xs text-red-500">{linkProblem}</p>}
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
                  aria-pressed={pinnedId === img.id && !imageLink}
                  onClick={() => { pinImage(img.id); updateSettings({ imageLink: '' }) }}
                  className={cn(
                    'block aspect-video w-full overflow-hidden rounded-lg outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring',
                    pinnedId === img.id && !imageLink && 'ring-2 ring-primary',
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
