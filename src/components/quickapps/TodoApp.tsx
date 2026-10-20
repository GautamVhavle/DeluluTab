import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Plus, X } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { MAX_TODO_LENGTH, useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function TodoApp() {
  const todos = useAppStore((s) => s.todos)
  const addTodo = useAppStore((s) => s.addTodo)
  const toggleTodo = useAppStore((s) => s.toggleTodo)
  const removeTodo = useAppStore((s) => s.removeTodo)
  const clearCompleted = useAppStore((s) => s.clearCompletedTodos)
  const [draft, setDraft] = useState('')

  const done = todos.filter((t) => t.done).length

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    addTodo(draft)
    setDraft('')
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <form onSubmit={submit} className="flex gap-2">
        <Input
          data-autofocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MAX_TODO_LENGTH}
          placeholder="Add a task and press Enter"
          aria-label="New task"
          autoComplete="off"
        />
        <Button type="submit" size="icon" disabled={!draft.trim()} aria-label="Add task">
          <Plus />
        </Button>
      </form>

      {todos.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
          No tasks yet. Add what you want to get done today.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto" aria-label="Tasks">
          <AnimatePresence initial={false}>
            {todos.map((t) => (
              <motion.li
                key={t.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.18 }}
                className="group flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-accent/50"
              >
                <button
                  role="checkbox"
                  aria-checked={t.done}
                  aria-label={t.text}
                  onClick={() => toggleTodo(t.id)}
                  className={cn(
                    'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    t.done ? 'border-primary bg-primary text-primary-foreground' : 'border-input hover:border-primary',
                  )}
                >
                  {t.done && <Check className="h-3 w-3" />}
                </button>
                <span className={cn('min-w-0 flex-1 break-words text-sm', t.done && 'text-muted-foreground line-through')}>{t.text}</span>
                <button
                  aria-label={`Delete ${t.text}`}
                  onClick={() => removeTodo(t.id)}
                  className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-red-500 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {todos.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground" aria-live="polite">
          <span>{done} of {todos.length} done</span>
          {done > 0 && (
            <button onClick={clearCompleted} className="rounded underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Clear completed
            </button>
          )}
        </div>
      )}
    </div>
  )
}
