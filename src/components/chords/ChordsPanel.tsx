import { useEffect, useState, type FormEvent } from 'react'
import { Plus, X } from '@/components/common/icons'
import {
  CHORD_WINDOW_STEP_MS,
  MAX_CHORD_LENGTH,
  MAX_CHORD_WINDOW_MS,
  MIN_CHORD_WINDOW_MS,
  TRIGGER_PRESETS,
  triggerLabel,
  validateSequence,
  validateTrigger,
} from '@/utils/chords'
import { hostnameOf, normalizeUrl } from '@/utils/url'
import { cn } from '@/utils/cn'
import { useAppStore, type Chord, type Shortcut } from '@/store/useAppStore'
import { ShortcutIcon } from '@/components/shortcuts/ShortcutIcon'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { More, Row, Section, SliderRow } from '@/components/settings/SettingsUi'
import { ChordLesson } from './ChordLesson'

/** Click "Change key", press the key you want. Keys that can't work (letters, browser shortcuts) say why. */
function TriggerKey() {
  const trigger = useAppStore((s) => s.settings.chordTrigger)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const [capturing, setCapturing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!capturing) return
    const onKeyDown = (e: KeyboardEvent) => {
      // This dialog is open, so the chord engine is paused; we own the keyboard until a key is accepted.
      e.preventDefault()
      e.stopImmediatePropagation()
      if (e.code === 'Escape') {
        setCapturing(false)
        setError('')
        return
      }
      if (e.repeat || e.isComposing) return
      const problem = validateTrigger(e.code)
      if (problem) {
        setError(problem)
        return
      }
      updateSettings({ chordTrigger: e.code })
      setCapturing(false)
      setError('')
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [capturing, updateSettings])

  return (
    <div className="grid gap-2.5">
      <Row label="Trigger key">
        <div className="flex items-center gap-2">
          <kbd aria-label={`Current trigger: ${triggerLabel(trigger)}`} className="min-w-9 rounded-md border bg-secondary/70 px-2 py-1 text-center font-mono text-sm">{triggerLabel(trigger)}</kbd>
          <Button size="sm" variant={capturing ? 'default' : 'secondary'} onClick={() => { setCapturing((c) => !c); setError('') }}>
            {capturing ? 'Press a key…' : 'Change key'}
          </Button>
        </div>
      </Row>
      {capturing && <p className="text-xs text-muted-foreground" role="status">Press the key you want to use, or Esc to cancel.</p>}
      {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick picks">
        {TRIGGER_PRESETS.map((code) => (
          <button
            key={code}
            type="button"
            aria-pressed={trigger === code}
            aria-label={`Use ${triggerLabel(code)}`}
            onClick={() => { updateSettings({ chordTrigger: code }); setCapturing(false); setError('') }}
            className={cn('min-w-8 rounded-md border px-2 py-1 font-mono text-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', trigger === code && 'border-primary bg-primary/15')}
          >
            {triggerLabel(code)}
          </button>
        ))}
      </div>
      {trigger !== 'Backquote' && !/^F\d+$/.test(trigger) && (
        <p className="text-xs text-muted-foreground">With this key, press Esc first to leave a text box; otherwise the key just types into it. ` and the F keys work everywhere.</p>
      )}
    </div>
  )
}

export function ChordsPanel() {
  const shortcuts = useAppStore((s) => s.shortcuts)
  const chords = useAppStore((s) => s.chords)
  const windowMs = useAppStore((s) => s.settings.chordWindowMs)
  const updateSettings = useAppStore((s) => s.updateSettings)

  return (
    <div className="grid gap-7">
      <ChordLesson />

      <Section title="Trigger">
        <TriggerKey />
      </Section>

      <Section title="Your chords">
        {shortcuts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add a shortcut first, or create a chord for a new site below.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {shortcuts.map((s) => (
              <ChordRow
                key={s.id}
                shortcut={s}
                chord={chords.find((c) => c.shortcutId === s.id)}
                others={chords.filter((c) => c.shortcutId !== s.id).map((c) => ({ sequence: c.sequence, title: shortcuts.find((x) => x.id === c.shortcutId)?.title ?? '?' }))}
              />
            ))}
          </ul>
        )}
      </Section>

      <More label="Timing and a new site">
      <Section title="Typing speed">
        <SliderRow
          label="Time limit"
          value={windowMs}
          min={MIN_CHORD_WINDOW_MS}
          max={MAX_CHORD_WINDOW_MS}
          step={CHORD_WINDOW_STEP_MS}
          format={(v) => `${(v / 1000).toFixed(1)} s`}
          onChange={(chordWindowMs) => updateSettings({ chordWindowMs })}
        />
      </Section>
      <Section title="New site">
        <NewChordForm />
      </Section>
      </More>
    </div>
  )
}

function NewChordForm() {
  const shortcuts = useAppStore((s) => s.shortcuts)
  const chords = useAppStore((s) => s.chords)
  const addShortcut = useAppStore((s) => s.addShortcut)
  const setShortcutChord = useAppStore((s) => s.setShortcutChord)
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const address = normalizeUrl(url)
    if (!address) return setError('Enter a valid web address, like github.com')
    const sequence = code.trim().toLowerCase()
    const problem = validateSequence(sequence, chords.map((c) => ({ sequence: c.sequence, title: shortcuts.find((s) => s.id === c.shortcutId)?.title ?? '?' })))
    if (problem) return setError(problem)

    const id = addShortcut({ title: name.trim() || hostnameOf(address), url: address, icon: '', folderId: null })
    setShortcutChord(id, sequence)
    setUrl('')
    setName('')
    setCode('')
    setError('')
  }

  return (
    <form onSubmit={submit} className="grid gap-2">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_6rem]">
        <Input value={url} onChange={(e) => { setUrl(e.target.value); setError('') }} placeholder="Address, e.g. news.ycombinator.com" aria-label="New chord address" autoComplete="off" />
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" aria-label="New chord name" autoComplete="off" maxLength={100} />
        <Input
          value={code}
          maxLength={MAX_CHORD_LENGTH}
          onChange={(e) => { setCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')); setError('') }}
          placeholder="Code"
          aria-label="New chord code"
          autoComplete="off"
          spellCheck={false}
          className="text-center font-mono uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal"
        />
      </div>
      {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
      <div>
        <Button type="submit" size="sm" variant="secondary" disabled={!url.trim() || !code.trim()}>
          <Plus /> Add shortcut and chord
        </Button>
      </div>
    </form>
  )
}

function ChordRow({ shortcut, chord, others }: { shortcut: Shortcut; chord?: Chord; others: { sequence: string; title: string }[] }) {
  const setShortcutChord = useAppStore((s) => s.setShortcutChord)
  const updateChord = useAppStore((s) => s.updateChord)

  const saved = chord?.sequence ?? ''
  const [draft, setDraft] = useState(saved)
  const [error, setError] = useState('')
  useEffect(() => setDraft(saved), [saved])

  function commit() {
    if (draft === saved) return setError('')
    const problem = draft ? validateSequence(draft, others) : null
    if (problem) return setError(problem)
    setError('')
    setShortcutChord(shortcut.id, draft)
  }

  const overlap = saved ? others.find((o) => o.sequence !== saved && (o.sequence.startsWith(saved) || saved.startsWith(o.sequence))) : undefined

  return (
    <li className="grid gap-1 px-3 py-2">
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary/80 ring-1 ring-border">
          <ShortcutIcon icon={shortcut.icon} url={shortcut.url} className="h-4 w-4 object-contain" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{shortcut.title}</p>
          <p className="truncate text-xs text-muted-foreground">{hostnameOf(shortcut.url)}</p>
        </div>

        <input
          aria-label={`Chord for ${shortcut.title}`}
          value={draft}
          maxLength={MAX_CHORD_LENGTH}
          placeholder="none"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => { setDraft(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')); setError('') }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            } else if (e.key === 'Escape' && draft !== saved) {
              e.stopPropagation() // revert the field instead of closing the dialog
              setDraft(saved)
              setError('')
            }
          }}
          className={cn(
            'h-8 w-24 rounded-md border bg-transparent px-2 text-center font-mono text-sm uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            error ? 'border-red-500' : 'border-input',
          )}
        />

        <input
          type="checkbox"
          aria-label={`Enable chord for ${shortcut.title}`}
          checked={chord?.enabled ?? false}
          disabled={!chord}
          onChange={(e) => chord && updateChord(chord.id, { enabled: e.target.checked })}
          className="h-4 w-4 accent-primary disabled:opacity-30"
        />
        <button
          type="button"
          aria-label={`Remove chord for ${shortcut.title}`}
          disabled={!chord}
          onClick={() => setShortcutChord(shortcut.id, '')}
          className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:invisible"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {error && <p role="alert" className="pl-11 text-xs text-red-500">{error}</p>}
      {!error && overlap && (
        <p className="pl-11 text-xs text-amber-500">Overlaps “{overlap.sequence.toUpperCase()}” ({overlap.title}); the shorter one fires after a short pause.</p>
      )}
    </li>
  )
}
