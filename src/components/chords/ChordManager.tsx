import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { CHORD_TRIGGERS, CHORD_WINDOWS_MS, MAX_CHORD_LENGTH, validateSequence } from '@/lib/chords'
import { hostnameOf } from '@/lib/url'
import { cn } from '@/lib/utils'
import { useAppStore, type Chord, type ChordTrigger, type Shortcut } from '@/store/useAppStore'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ShortcutIcon } from '@/components/shortcuts/ShortcutIcon'

const selectClass =
  'h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

export function ChordManager({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <ChordManagerBody />
      </DialogContent>
    </Dialog>
  )
}

function ChordManagerBody() {
  const shortcuts = useAppStore((s) => s.shortcuts)
  const chords = useAppStore((s) => s.chords)
  const trigger = useAppStore((s) => s.settings.chordTrigger)
  const windowMs = useAppStore((s) => s.settings.chordWindowMs)
  const updateSettings = useAppStore((s) => s.updateSettings)

  const triggerLabel = CHORD_TRIGGERS.find((t) => t.value === trigger)?.label ?? trigger

  return (
    <div className="grid gap-5">
      <DialogHeader>
        <DialogTitle>Keyboard chords</DialogTitle>
        <DialogDescription>
          Press <kbd className="rounded border px-1 font-mono text-xs">{triggerLabel}</kbd>, then type a short code to
          jump straight to a site, like a cheat code.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5 text-sm font-medium">
          Trigger key
          <select
            className={selectClass}
            value={trigger}
            onChange={(e) => updateSettings({ chordTrigger: e.target.value as ChordTrigger })}
          >
            {CHORD_TRIGGERS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Pause allowed between keys
          <select
            className={selectClass}
            value={windowMs}
            onChange={(e) => updateSettings({ chordWindowMs: Number(e.target.value) })}
          >
            {CHORD_WINDOWS_MS.map((ms) => (
              <option key={ms} value={ms}>{ms / 1000}s</option>
            ))}
          </select>
        </label>
      </div>
      {trigger !== 'Backquote' && (
        <p className="-mt-3 text-xs text-muted-foreground">
          With this trigger, press Esc first to leave the search box; otherwise the key just types into it.
        </p>
      )}

      <div className="grid gap-1">
        <h3 className="text-sm font-medium">Your shortcuts</h3>
        {shortcuts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add a shortcut first, then give it a chord here.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {shortcuts.map((s) => (
              <ChordRow
                key={s.id}
                shortcut={s}
                chord={chords.find((c) => c.shortcutId === s.id)}
                others={chords
                  .filter((c) => c.shortcutId !== s.id)
                  .map((c) => ({ sequence: c.sequence, title: shortcuts.find((x) => x.id === c.shortcutId)?.title ?? '?' }))}
              />
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Type a code and press Enter (or click away) to save. Clear it to remove the chord. Up to {MAX_CHORD_LENGTH} letters or digits.
        </p>
      </div>
    </div>
  )
}

function ChordRow({
  shortcut,
  chord,
  others,
}: {
  shortcut: Shortcut
  chord?: Chord
  others: { sequence: string; title: string }[]
}) {
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

  const overlap = saved
    ? others.find((o) => o.sequence !== saved && (o.sequence.startsWith(saved) || saved.startsWith(o.sequence)))
    : undefined

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
          onChange={(e) => {
            setDraft(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))
            setError('')
          }}
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
          className="h-4 w-4 accent-violet-500 disabled:opacity-30"
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
        <p className="pl-11 text-xs text-amber-500">
          Overlaps “{overlap.sequence.toUpperCase()}” ({overlap.title}); the shorter one fires after a short pause.
        </p>
      )}
    </li>
  )
}
