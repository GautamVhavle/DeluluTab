import { useEffect, useState } from 'react'
import { MAX_CHORD_LENGTH, triggerLabel, validateSequence } from '@/utils/chords'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/store/useAppStore'

function chordError(sequence: string, exceptId: string | null) {
  if (!sequence) return null
  const { chords, shortcuts } = useAppStore.getState()
  const others = chords
    .filter((chord) => chord.shortcutId !== exceptId && chord.sequence)
    .map((chord) => ({ sequence: chord.sequence, title: shortcuts.find((item) => item.id === chord.shortcutId)?.title ?? 'Another app' }))
  return validateSequence(sequence, others)
}

/** Saves a chord on an existing shortcut. Returns an error message, or null when it stuck. */
export function saveChord(shortcutId: string, sequence: string): string | null {
  const problem = chordError(sequence, shortcutId)
  if (problem) return problem
  useAppStore.getState().setShortcutChord(shortcutId, sequence)
  return null
}

export { chordError }

export function ChordInput({
  value,
  onChange,
  error,
  onCommit,
}: {
  value: string
  onChange: (value: string) => void
  error?: string
  onCommit?: () => void
}) {
  const trigger = useAppStore((s) => s.settings.chordTrigger)
  return (
    <label className="grid gap-1">
      <span className="text-xs font-medium text-muted-foreground">Chord · press {triggerLabel(trigger)}, then</span>
      <input
        aria-label="Chord"
        value={value}
        maxLength={MAX_CHORD_LENGTH}
        placeholder="gh"
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
        onBlur={() => onCommit?.()}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Enter') {
            e.preventDefault()
            onCommit?.()
          }
        }}
        className={cn(
          'h-9 w-full rounded-md border bg-transparent px-2 text-center font-mono text-sm uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          error ? 'border-red-500' : 'border-input',
        )}
      />
      {error && <span role="alert" className="text-xs text-red-500">{error}</span>}
    </label>
  )
}

/** Chord editor for an app that already exists. Used on the tile and in the edit dialog. */
export function ShortcutChord({ shortcutId }: { shortcutId: string }) {
  const saved = useAppStore((s) => s.chords.find((chord) => chord.shortcutId === shortcutId)?.sequence ?? '')
  const [draft, setDraft] = useState(saved)
  const [error, setError] = useState('')

  useEffect(() => setDraft(saved), [saved])

  function commit() {
    if (draft === saved) return setError('')
    const problem = saveChord(shortcutId, draft)
    setError(problem ?? '')
    if (problem) setDraft(saved)
  }

  return <ChordInput value={draft} onChange={(value) => { setDraft(value); setError('') }} error={error} onCommit={commit} />
}
