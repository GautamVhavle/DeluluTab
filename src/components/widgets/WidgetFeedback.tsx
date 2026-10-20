import { useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'

/** Pulsing stand-in while a widget is fetching. */
export function WidgetSkeleton({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div aria-busy="true" aria-label={label} className="flex h-full min-h-0 flex-col justify-center gap-3">
      {children ?? (
        <>
          <div className="h-3 w-1/3 animate-pulse rounded-full bg-foreground/10" />
          <div className="h-24 animate-pulse rounded-xl bg-foreground/10" />
          <div className="h-3 w-2/3 animate-pulse rounded-full bg-foreground/10" />
          <div className="h-3 w-1/2 animate-pulse rounded-full bg-foreground/10" />
        </>
      )}
    </div>
  )
}

export interface SetupField {
  key: string
  label: string
  placeholder: string
  secret?: boolean
}

/**
 * Asks for a value the widget cannot work without. Callers save the result locally;
 * this form does not touch storage itself.
 */
export function WidgetSetup({
  icon,
  title,
  body,
  fields,
  initial,
  submitLabel,
  onSubmit,
  children,
  actions,
}: {
  icon: ReactNode
  title: string
  body: string
  fields: SetupField[]
  initial: Record<string, string>
  submitLabel: string
  /** Returns a message to show when the values are not usable. */
  onSubmit: (values: Record<string, string>) => string | void | Promise<string | void>
  /** Shown between the description and the fields. */
  children?: ReactNode
  /** Extra buttons beside the submit button. */
  actions?: ReactNode
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((field) => [field.key, initial[field.key] ?? ''])))
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    try {
      setError((await onSubmit(draft)) ?? '')
    } catch (err) {
      setError((err as Error).message || 'Something went wrong.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="my-auto grid gap-3 py-1">
        <div className="flex items-center gap-2 text-sm font-medium">{icon}{title}</div>
        <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
        {children}
        {fields.map((field) => (
          <label key={field.key} className="grid gap-1 text-xs text-muted-foreground">
            {field.label}
            <Input
              value={draft[field.key] ?? ''}
              type={field.secret ? 'password' : 'text'}
              autoComplete="off"
              spellCheck={false}
              placeholder={field.placeholder}
              aria-label={field.label}
              className="h-8"
              onChange={(e) => {
                setDraft((current) => ({ ...current, [field.key]: e.target.value }))
                setError('')
              }}
            />
          </label>
        ))}
        {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" disabled={pending || fields.some((field) => !(draft[field.key] ?? '').trim())}>
            {pending ? 'Working…' : submitLabel}
          </Button>
          {actions}
        </div>
      </div>
    </form>
  )
}
