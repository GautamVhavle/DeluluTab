import type { Chord, ChordTrigger, Shortcut } from '@/types'

export const MIN_CHORD_WINDOW_MS = 300
export const MAX_CHORD_WINDOW_MS = 3000
export const CHORD_WINDOW_STEP_MS = 100
export const MAX_CHORD_LENGTH = 6

export const clampChordWindow = (ms: number) =>
  Math.min(MAX_CHORD_WINDOW_MS, Math.max(MIN_CHORD_WINDOW_MS, Math.round(ms / CHORD_WINDOW_STEP_MS) * CHORD_WINDOW_STEP_MS))

/**
 * Keys that may start a chord, as KeyboardEvent.code values. Letters and digits are out (they type the chord),
 * as are keys the page or browser already owns, so a chord can never fight normal typing or shortcuts.
 */
const TRIGGER_CODES = new Set([
  'Backquote', 'Backslash', 'IntlBackslash', 'Semicolon', 'Quote', 'Comma', 'Period', 'Minus', 'Equal',
  'BracketLeft', 'BracketRight', 'Space', 'F2', 'F4', 'F8', 'F9',
])

/** One-click choices in settings. */
export const TRIGGER_PRESETS: ChordTrigger[] = ['Backquote', 'Backslash', 'Semicolon', 'Quote', 'Comma', 'Period', 'Space', 'F2', 'F4', 'F8', 'F9']

const TRIGGER_LABELS: Record<string, string> = {
  Backquote: '`', Backslash: '\\', IntlBackslash: '\\', Semicolon: ';', Quote: "'", Comma: ',', Period: '.',
  Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Space: 'Space',
}

export const triggerLabel = (code: ChordTrigger) => TRIGGER_LABELS[code] ?? code

/** Returns why `code` can't be a trigger, or null if it can. */
export function validateTrigger(code: string): string | null {
  if (TRIGGER_CODES.has(code)) return null
  if (/^(Key[A-Z]|Digit\d|Numpad\d)$/.test(code)) return "Letters and numbers type the chord itself, so they can't start one."
  if (/^(Shift|Control|Alt|Meta|OS)(Left|Right)?$/.test(code) || code === 'CapsLock') return "Modifier keys can't start a chord."
  if (code === 'Slash') return '/ already focuses the search bar.'
  if (code === 'Escape') return 'Esc cancels a chord.'
  if (code === 'Backspace') return 'Backspace undoes a key inside a chord.'
  if (/^F(1|3|5|6|7|10|11|12)$/.test(code)) return 'The browser reserves that key.'
  if (/^(Enter|Tab|Arrow|Home|End|Page|Delete|Insert)/.test(code)) return 'That key is used for moving around and editing.'
  return 'Choose a punctuation key, Space, or F2, F4, F8 or F9.'
}

export const isValidTrigger = (code: string) => validateTrigger(code) === null

/** Triggers that never produce text, so they still work while a text field is focused. Others would swallow typing. */
const isTypingSafe = (code: ChordTrigger) => code === 'Backquote' || /^F\d+$/.test(code)

const INVALID_FLASH_MS = 700
const SUCCESS_FLASH_MS = 600

export interface ResolvedChord {
  id: string
  sequence: string
  shortcutId: string
  url: string
  title: string
  icon: string
}

/** Enabled chords whose shortcut still exists, ready to match against. */
export function resolveChords(chords: Chord[], shortcuts: Shortcut[]): ResolvedChord[] {
  const byId = new Map(shortcuts.map((s) => [s.id, s]))
  return chords.flatMap((c) => {
    const sc = byId.get(c.shortcutId)
    if (!c.enabled || !sc || !c.sequence) return []
    return [{ id: c.id, sequence: c.sequence, shortcutId: sc.id, url: sc.url, title: sc.title, icon: sc.icon }]
  })
}

/** Returns an error message, or null if `sequence` (already lowercased) is acceptable. */
export function validateSequence(
  sequence: string,
  others: { sequence: string; title: string }[],
): string | null {
  if (!/^[a-z0-9]+$/.test(sequence)) return 'Use letters and numbers only'
  if (sequence.length > MAX_CHORD_LENGTH) return `At most ${MAX_CHORD_LENGTH} characters`
  const clash = others.find((o) => o.sequence === sequence)
  return clash ? `Already used by ${clash.title}` : null
}

export type ChordStatus = 'idle' | 'listening' | 'invalid' | 'success'

export interface ChordEngineState {
  status: ChordStatus
  /** Keys typed since the trigger. */
  buffer: string
  /** Set while the buffer exactly matches a chord (it may still be waiting on a longer one). */
  matchedId: string | null
  /** Bumps each time the listening window restarts, so the HUD can restart its countdown. */
  epoch: number
}

export const IDLE_STATE: ChordEngineState = { status: 'idle', buffer: '', matchedId: null, epoch: 0 }

interface EngineConfig {
  trigger: ChordTrigger
  windowMs: number
  chords: ResolvedChord[]
}

interface EngineOptions {
  /** Read fresh on every key so settings/chord edits apply immediately. */
  getConfig: () => EngineConfig
  onChange: (state: ChordEngineState) => void
  onMatch: (chord: ResolvedChord) => void
  /** Return true to ignore the keyboard entirely (e.g. while a dialog is open). */
  isBlocked?: () => boolean
}

function isEditable(target: EventTarget | null) {
  const el = target as HTMLElement | null
  if (!el || !el.tagName) return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

/**
 * Press the trigger, then type a sequence. The window restarts after every key, so the limit is
 * the pause *between* keys, not the total time. A chord fires as soon as it can't be extended;
 * if a longer chord shares its prefix (`g` vs `gh`), it fires when the window runs out instead.
 */
export function createChordEngine(options: EngineOptions) {
  let state = IDLE_STATE
  let epoch = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  const publish = (next: ChordEngineState) => {
    state = next
    options.onChange(state)
  }
  const after = (ms: number, fn: () => void) => {
    clearTimeout(timer)
    timer = setTimeout(fn, ms)
  }
  const reset = () => {
    clearTimeout(timer)
    if (state.status !== 'idle') publish({ ...IDLE_STATE, epoch })
  }

  function fire(chord: ResolvedChord) {
    clearTimeout(timer)
    publish({ status: 'success', buffer: chord.sequence, matchedId: chord.id, epoch })
    options.onMatch(chord)
    after(SUCCESS_FLASH_MS, reset)
  }

  function listen(buffer: string, matched: ResolvedChord | null) {
    epoch++
    publish({ status: 'listening', buffer, matchedId: matched?.id ?? null, epoch })
    after(options.getConfig().windowMs, () => (matched ? fire(matched) : reset()))
  }

  function evaluate(buffer: string) {
    if (buffer === '') return listen('', null)
    const { chords } = options.getConfig()
    const exact = chords.find((c) => c.sequence === buffer) ?? null
    const extendable = chords.some((c) => c.sequence.length > buffer.length && c.sequence.startsWith(buffer))

    if (exact && !extendable) return fire(exact)
    if (!exact && !extendable) {
      publish({ status: 'invalid', buffer, matchedId: null, epoch })
      return after(INVALID_FLASH_MS, reset)
    }
    listen(buffer, exact)
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (options.isBlocked?.()) return reset()
    if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return
    if (state.status === 'success') return

    const { trigger } = options.getConfig()

    if (state.status === 'idle') {
      if (e.code !== trigger || e.shiftKey || e.repeat) return
      if (isEditable(e.target) && !isTypingSafe(trigger)) return
      e.preventDefault()
      return evaluate('')
    }

    // listening or invalid
    if (e.code === trigger) {
      e.preventDefault()
      return e.repeat ? undefined : reset()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      return reset()
    }
    if (e.key === 'Backspace') {
      e.preventDefault()
      return evaluate(state.buffer.slice(0, -1))
    }
    if (/^[a-zA-Z0-9]$/.test(e.key)) {
      e.preventDefault() // keep the characters out of the focused search box
      if (e.repeat || state.status === 'invalid') return
      evaluate(state.buffer + e.key.toLowerCase())
    }
  }

  return {
    handleKeyDown,
    cancel: reset,
    dispose: () => clearTimeout(timer),
  }
}
