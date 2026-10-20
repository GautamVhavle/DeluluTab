import { useState } from 'react'
import { Check, Copy, Eye, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MAX_NOTES_LENGTH, useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import { Markdown } from './Markdown'

/** Distraction-free scratchpad. Every keystroke goes straight into the store, which persists it. */
export function NotesApp() {
  const notes = useAppStore((s) => s.notes)
  const setNotes = useAppStore((s) => s.setNotes)
  const [preview, setPreview] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const words = notes.trim() ? notes.trim().split(/\s+/).length : 0

  async function copy() {
    try {
      await navigator.clipboard.writeText(notes)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard can be blocked; the text is still selectable.
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div role="group" aria-label="Notes view" className="flex rounded-lg bg-secondary p-0.5">
          {([['write', 'Write', Pencil], ['preview', 'Preview', Eye]] as const).map(([id, label, Icon]) => {
            const active = (id === 'preview') === preview
            return (
              <button
                key={id}
                aria-pressed={active}
                onClick={() => setPreview(id === 'preview')}
                className={cn('flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', active ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                <Icon className="h-3 w-3" /> {label}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={copy} disabled={!notes} aria-label="Copy notes">
            {copied ? <Check className="text-emerald-500" /> : <Copy />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!notes}
            onClick={() => (confirmClear ? (setNotes(''), setConfirmClear(false)) : setConfirmClear(true))}
            onBlur={() => setConfirmClear(false)}
            aria-label={confirmClear ? 'Confirm clear notes' : 'Clear notes'}
            className={confirmClear ? 'text-red-500' : undefined}
          >
            <Trash2 /> {confirmClear && 'Clear all?'}
          </Button>
        </div>
      </div>

      {preview ? (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border bg-background/40 p-3" aria-label="Notes preview">
          <Markdown source={notes} />
        </div>
      ) : (
        <textarea
          data-autofocus
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={MAX_NOTES_LENGTH}
          spellCheck
          placeholder={'Jot something down…\n\nMarkdown works: # heading, **bold**, - [ ] task'}
          aria-label="Notes"
          className="min-h-0 flex-1 resize-none rounded-xl border bg-background/40 p-3 text-sm leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      )}

      <p className="flex items-center justify-between text-[11px] text-muted-foreground" aria-live="polite">
        <span>{words} {words === 1 ? 'word' : 'words'} · {notes.length.toLocaleString()} characters</span>
        <span className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-500" /> Saved on this device</span>
      </p>
    </div>
  )
}
