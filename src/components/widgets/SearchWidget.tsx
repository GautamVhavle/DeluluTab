import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WidgetProps } from './types'

export function SearchWidget({ mode }: WidgetProps) {
  const focus = mode === 'focus'
  const compact = mode === 'compact'

  return (
    <form
      className="flex h-full w-full flex-col justify-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const q = new FormData(e.currentTarget).get('q')?.toString().trim()
        if (q) window.location.href = `https://www.google.com/search?q=${encodeURIComponent(q)}`
      }}
    >
      <label
        className={cn(
          'flex items-center gap-3 rounded-xl border bg-background/70 px-4 shadow-sm focus-within:ring-2 focus-within:ring-ring/50',
          focus ? 'py-4 text-lg' : compact ? 'py-2 text-sm' : 'py-3',
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          name="q"
          autoFocus
          autoComplete="off"
          onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
          placeholder="Search the web or ask AI…"
          className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </label>
      {mode === 'detailed' && (
        <p className="px-1 text-xs text-muted-foreground">Press Enter to search · AI answers coming soon</p>
      )}
    </form>
  )
}
