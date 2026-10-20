import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Search, Sparkles } from 'lucide-react'
import { engineById, SEARCH_ENGINES } from '@/lib/searchEngines'
import { navigateTo } from '@/lib/navigate'
import { isMac } from '@/lib/platform'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { WidgetProps } from './types'

const isEditable = (el: EventTarget | null) => {
  const t = el as HTMLElement | null
  return !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))
}

/** `/` and Cmd/Ctrl+K focus the search bar from anywhere on the page. */
function useFocusShortcuts(input: React.RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return // typing in a dialog, don't steal focus
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        input.current?.focus()
        input.current?.select()
      } else if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isEditable(e.target)) {
        e.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [input])
}

export function SearchBarWidget({ mode }: WidgetProps) {
  const engineId = useAppStore((s) => s.settings.searchEngine)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const engine = engineById(engineId)
  const focus = mode === 'focus'
  const compact = mode === 'compact'

  const input = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  useFocusShortcuts(input)

  const web = SEARCH_ENGINES.filter((e) => e.group === 'web')
  const ai = SEARCH_ENGINES.filter((e) => e.group === 'ai')

  return (
    <form
      role="search"
      className="flex h-full w-full flex-col justify-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const q = new FormData(e.currentTarget).get('q')?.toString().trim()
        if (q) navigateTo(engine.url(q))
      }}
    >
      <div
        className={cn(
          'flex items-center gap-1 rounded-2xl border border-white/20 bg-white/40 shadow-sm backdrop-blur-xl transition-shadow dark:border-white/10 dark:bg-white/[0.06]',
          'focus-within:ring-2 focus-within:ring-ring/50',
          focus ? 'p-1.5 text-lg' : compact ? 'p-1 text-sm' : 'p-1.5',
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Search engine: ${engine.name}`}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-sm font-medium outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring',
                focus ? 'py-2.5' : 'py-1.5',
              )}
            >
              {engine.group === 'ai' ? <Sparkles className="h-4 w-4 text-violet-400" /> : <Search className="h-4 w-4 text-muted-foreground" />}
              <span className={compact ? 'sr-only sm:not-sr-only' : undefined}>{engine.name}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="min-w-[12rem]"
            // After picking an engine, go straight to typing instead of back to the menu button.
            onCloseAutoFocus={(e) => {
              e.preventDefault()
              input.current?.focus()
            }}
          >
            <DropdownMenuLabel>Search the web</DropdownMenuLabel>
            {web.map((e) => (
              <EngineItem key={e.id} name={e.name} active={e.id === engineId} onSelect={() => updateSettings({ searchEngine: e.id })} />
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Ask an AI</DropdownMenuLabel>
            {ai.map((e) => (
              <EngineItem key={e.id} name={e.name} active={e.id === engineId} onSelect={() => updateSettings({ searchEngine: e.id })} />
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <input
          ref={input}
          name="q"
          autoFocus
          autoComplete="off"
          aria-label={`Search with ${engine.name}`}
          placeholder={engine.group === 'ai' ? `Ask ${engine.name}…` : `Search with ${engine.name}…`}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
          className={cn('min-w-0 flex-1 bg-transparent px-2 outline-none placeholder:text-muted-foreground', focus ? 'py-2.5' : 'py-1.5')}
        />

        {!focused && !compact && (
          <kbd aria-hidden className="mr-2 hidden shrink-0 rounded-md border bg-background/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:block">
            /
          </kbd>
        )}
      </div>
      {mode === 'detailed' && (
        <p className="px-1 text-xs text-muted-foreground">
          Press <kbd className="font-mono">/</kbd> or <kbd className="font-mono">{isMac() ? '⌘K' : 'Ctrl K'}</kbd> to jump here
        </p>
      )}
    </form>
  )
}

function EngineItem({ name, active, onSelect }: { name: string; active: boolean; onSelect: () => void }) {
  return (
    <DropdownMenuItem onSelect={onSelect} className="justify-between">
      {name}
      {active && <Check className="text-primary" />}
    </DropdownMenuItem>
  )
}
