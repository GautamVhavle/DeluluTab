import { useMemo, useState } from 'react'
import { ArrowLeftRight, Copy, Delete } from 'lucide-react'
import { CalcError, evaluate, formatResult } from '@/lib/calc'
import { convert, categoryById, formatConverted, UNIT_CATEGORIES } from '@/lib/units'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

type Mode = 'calc' | 'convert'

export function CalcApp() {
  const [mode, setMode] = useState<Mode>('calc')
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div role="radiogroup" aria-label="Calculator mode" className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-0.5">
        {([['calc', 'Calculator'], ['convert', 'Unit converter']] as const).map(([id, label]) => (
          <button
            key={id}
            role="radio"
            aria-checked={mode === id}
            onClick={() => setMode(id)}
            className={cn('rounded-md px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', mode === id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === 'calc' ? <Calculator /> : <Converter />}
    </div>
  )
}

const KEYS: { label: string; insert?: string; action?: 'clear' | 'back' | 'equals'; wide?: boolean; tone?: 'op' | 'fn' }[] = [
  { label: 'C', action: 'clear', tone: 'fn' }, { label: '(', insert: '(', tone: 'fn' }, { label: ')', insert: ')', tone: 'fn' }, { label: '÷', insert: '/', tone: 'op' },
  { label: '7', insert: '7' }, { label: '8', insert: '8' }, { label: '9', insert: '9' }, { label: '×', insert: '*', tone: 'op' },
  { label: '4', insert: '4' }, { label: '5', insert: '5' }, { label: '6', insert: '6' }, { label: '−', insert: '-', tone: 'op' },
  { label: '1', insert: '1' }, { label: '2', insert: '2' }, { label: '3', insert: '3' }, { label: '+', insert: '+', tone: 'op' },
  { label: '0', insert: '0' }, { label: '.', insert: '.' }, { label: '⌫', action: 'back', tone: 'fn' }, { label: '=', action: 'equals', tone: 'op' },
]

const FUNCTION_KEYS = ['sqrt(', '^', '%', 'pi', 'sin(', 'cos(', 'ln(', 'ans']

interface HistoryItem {
  expression: string
  display: string
  raw: string
}

function Calculator() {
  const [expression, setExpression] = useState('')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [angle, setAngle] = useState<'deg' | 'rad'>('deg')
  const [error, setError] = useState('')

  const ans = history[0] ? Number(history[0].raw) : undefined

  // Live preview while typing; hide errors until the user commits (Enter / =), since half-typed input is normally invalid.
  const preview = useMemo(() => {
    if (!expression.trim()) return null
    try {
      return formatResult(evaluate(expression, { angle, ans }))
    } catch {
      return null
    }
  }, [expression, angle, ans])

  function commit() {
    if (!expression.trim()) return
    try {
      const value = evaluate(expression, { angle, ans })
      const { display, raw } = formatResult(value)
      setHistory((h) => [{ expression, display, raw }, ...h].slice(0, 6))
      setExpression(raw)
      setError('')
    } catch (err) {
      setError(err instanceof CalcError ? err.message : "Couldn't calculate that")
    }
  }

  const insert = (text: string) => {
    setExpression((e) => e + text)
    setError('')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <div className="rounded-xl border bg-background/40 p-3">
        <Input
          data-autofocus
          value={expression}
          onChange={(e) => {
            setExpression(e.target.value)
            setError('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            }
          }}
          placeholder="Type or tap: 12*(3+4)"
          aria-label="Expression"
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
          className="h-10 border-0 bg-transparent px-0 font-mono text-lg shadow-none focus-visible:ring-0"
        />
        <div className="flex h-8 items-center justify-between" aria-live="polite">
          {error ? (
            <p role="alert" className="text-sm text-red-500">{error}</p>
          ) : (
            <p className="text-2xl font-light tabular-nums" aria-label="Result">{preview ? `= ${preview.display}` : <span className="text-muted-foreground">=</span>}</p>
          )}
          {preview && (
            <Button size="sm" variant="ghost" aria-label="Copy result" onClick={() => void navigator.clipboard?.writeText(preview.raw)}>
              <Copy />
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {FUNCTION_KEYS.map((k) => (
          <button key={k} onClick={() => insert(k)} className="rounded-md bg-secondary/70 px-2 py-1 font-mono text-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {k}
          </button>
        ))}
        <button
          onClick={() => setAngle((a) => (a === 'deg' ? 'rad' : 'deg'))}
          aria-label={`Angles in ${angle === 'deg' ? 'degrees' : 'radians'}. Switch.`}
          className="ml-auto rounded-md border px-2 py-1 text-xs uppercase transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {angle}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Keypad">
        {KEYS.map((k) => (
          <button
            key={k.label}
            aria-label={k.action === 'back' ? 'Backspace' : k.action === 'equals' ? 'Equals' : k.action === 'clear' ? 'Clear' : k.label}
            onClick={() => {
              if (k.action === 'clear') (setExpression(''), setError(''))
              else if (k.action === 'back') setExpression((e) => e.slice(0, -1))
              else if (k.action === 'equals') commit()
              else insert(k.insert!)
            }}
            className={cn(
              'grid h-11 place-items-center rounded-lg text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              k.tone === 'op' ? 'bg-primary/90 text-primary-foreground hover:bg-primary' : k.tone === 'fn' ? 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground' : 'bg-secondary/60 hover:bg-accent',
            )}
          >
            {k.action === 'back' ? <Delete className="h-4 w-4" /> : k.label}
          </button>
        ))}
      </div>

      {history.length > 0 && (
        <section aria-label="History" className="grid gap-1">
          <h4 className="text-xs font-medium text-muted-foreground">History</h4>
          <ul className="space-y-0.5">
            {history.map((h, i) => (
              <li key={`${i}-${h.expression}`}>
                <button onClick={() => setExpression(h.raw)} title="Use this result" className="flex w-full items-baseline justify-between gap-3 rounded-md px-2 py-1 text-left text-sm hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="truncate font-mono text-xs text-muted-foreground">{h.expression}</span>
                  <span className="tabular-nums">{h.display}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Converter() {
  const [categoryId, setCategoryId] = useState(UNIT_CATEGORIES[0].id)
  const category = categoryById(categoryId)
  const [from, setFrom] = useState(category.defaults[0])
  const [to, setTo] = useState(category.defaults[1])
  const [value, setValue] = useState('1')

  function pickCategory(id: string) {
    const c = categoryById(id)
    setCategoryId(id)
    setFrom(c.defaults[0])
    setTo(c.defaults[1])
  }

  const parsed = value.trim() === '' ? NaN : Number(value)
  const result = Number.isFinite(parsed) ? convert(parsed, category, from, to) : NaN
  const shown = formatConverted(result)
  const unitLabel = (id: string) => category.units.find((u) => u.id === id)?.label ?? id

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Conversion type" className="flex flex-wrap gap-1">
        {UNIT_CATEGORIES.map((c) => (
          <button
            key={c.id}
            role="radio"
            aria-checked={c.id === categoryId}
            onClick={() => pickCategory(c.id)}
            className={cn('rounded-full px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', c.id === categoryId ? 'bg-primary text-primary-foreground' : 'bg-secondary/70 text-muted-foreground hover:text-foreground')}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid gap-2 rounded-xl border bg-background/40 p-3">
        <Input
          data-autofocus
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Value to convert"
          className="h-10 font-mono text-lg"
        />
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <select aria-label="From unit" className={selectClass} value={from} onChange={(e) => setFrom(e.target.value)}>
            {category.units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
          <Button size="icon" variant="ghost" aria-label="Swap units" onClick={() => (setFrom(to), setTo(from))}>
            <ArrowLeftRight />
          </Button>
          <select aria-label="To unit" className={selectClass} value={to} onChange={(e) => setTo(e.target.value)}>
            {category.units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border bg-background/40 p-3" aria-live="polite">
        <div className="min-w-0">
          <p className="truncate text-3xl font-light tabular-nums" aria-label="Converted value">{shown}</p>
          <p className="truncate text-xs text-muted-foreground">{unitLabel(to)}</p>
        </div>
        <Button size="sm" variant="ghost" aria-label="Copy converted value" disabled={!Number.isFinite(result)} onClick={() => void navigator.clipboard?.writeText(String(result))}>
          <Copy />
        </Button>
      </div>
      {!Number.isFinite(result) && value.trim() !== '' && <p role="alert" className="text-xs text-red-500">Enter a number to convert.</p>}
    </div>
  )
}
