import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, type IconType } from '@/components/common/icons'
import { PlatformLogo } from '@/components/common/PlatformLogo'
import { AI_PROVIDERS, aiProviderById } from '@/config/aiProviders'
import { engineById, SEARCH_ENGINES } from '@/config/searchEngines'
import { navigateTo } from '@/utils/navigate'
import { isMac } from '@/utils/platform'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/store/useAppStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/common/dropdown-menu'
import type { WidgetProps } from './types'

const isEditable = (el: EventTarget | null) => {
  const t = el as HTMLElement | null
  return !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))
}

/** `/` focuses the bar. Alt+S flips it between web search and AI. */
function useFocusShortcuts(input: React.RefObject<HTMLInputElement | null>, toggleMode: () => void) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return
      if (e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.code === 'KeyS' && (e.target === input.current || !isEditable(e.target))) {
        e.preventDefault()
        toggleMode()
        input.current?.focus()
        return
      }
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isEditable(e.target)) {
        e.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [input, toggleMode])
}

export function SearchBarWidget({ mode }: WidgetProps) {
  const engineId = useAppStore((s) => s.settings.searchEngine)
  const providerId = useAppStore((s) => s.settings.aiProvider)
  const commandMode = useAppStore((s) => s.settings.commandMode)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const webEngine = engineById(engineId)
  const engine = webEngine.group === 'web' ? webEngine : engineById('google')
  const provider = aiProviderById(providerId)
  const asking = commandMode === 'ai'
  const compact = mode === 'compact'
  const roomy = !compact

  const input = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const toggleMode = useCallback(() => updateSettings({ commandMode: asking ? 'web' : 'ai' }), [asking, updateSettings])
  useFocusShortcuts(input, toggleMode)
  useEffect(() => {
    const field = input.current
    if (!field) return
    const id = requestAnimationFrame(() => {
      if (document.querySelector('[role="dialog"]')) return
      const active = document.activeElement
      if (active instanceof HTMLElement && active !== document.body) return
      field.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [])

  const web = SEARCH_ENGINES.filter((e) => e.group === 'web')
  const targetName = asking ? provider.name : engine.name
  const targetSite = asking ? provider.site : engine.site
  const targetIcon = asking ? provider.glyph : engine.icon

  return (
    <form
      role="search"
      className="flex h-full w-full flex-col justify-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const q = new FormData(e.currentTarget).get('q')?.toString().trim()
        if (!q) return
        navigateTo(asking ? provider.url(q) : engine.url(q))
      }}
    >
      <div
        className={cn(
          'flex items-center gap-1 rounded-2xl border border-black/10 bg-white shadow-sm transition-shadow dark:border-white/10 dark:bg-slate-950',
          'focus-within:border-primary focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary',
          roomy ? 'p-1.5' : 'p-1 text-sm',
        )}
      >
        <div role="radiogroup" aria-label="Send the query to a search engine or an AI" className="flex shrink-0 rounded-xl bg-slate-100 p-0.5 dark:bg-slate-900">
          {([
            ['web', 'Search'],
            ['ai', 'Ask'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={commandMode === value}
              onClick={() => updateSettings({ commandMode: value })}
              className={cn(
                'rounded-[10px] px-2.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                roomy ? 'py-1.5' : 'py-1',
                commandMode === value ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-slate-100' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={asking ? `AI: ${targetName}` : `Search engine: ${targetName}`}
              className={cn(
                'flex min-w-0 max-w-[9rem] shrink items-center gap-1.5 rounded-xl px-2 text-sm font-medium transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                roomy ? 'py-1.5' : 'py-1',
              )}
            >
              <PlatformLogo url={targetSite} fallback={targetIcon} className={cn('h-4 w-4 shrink-0', asking ? 'text-violet-400' : 'text-muted-foreground')} />
              <span className={cn('truncate', compact && 'sr-only sm:not-sr-only')}>{targetName}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="min-w-[12rem]"
            onCloseAutoFocus={(e) => {
              e.preventDefault()
              input.current?.focus()
            }}
          >
            <DropdownMenuLabel>{asking ? 'Ask an AI' : 'Search the web'}</DropdownMenuLabel>
            {asking
              ? AI_PROVIDERS.map((item) => (
                  <EngineItem key={item.id} site={item.site} Icon={item.glyph} name={item.name} active={item.id === providerId} onSelect={() => updateSettings({ aiProvider: item.id, commandMode: 'ai' })} />
                ))
              : web.map((item) => (
                  <EngineItem key={item.id} site={item.site} Icon={item.icon} name={item.name} active={item.id === engine.id} onSelect={() => updateSettings({ searchEngine: item.id, commandMode: 'web' })} />
                ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <input
          ref={input}
          name="q"
          autoFocus
          autoComplete="off"
          aria-label={asking ? `Ask ${targetName}` : `Search with ${targetName}`}
          placeholder={asking ? `Ask ${targetName}…` : `Search with ${targetName}…`}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') e.currentTarget.blur()
            if (e.key === 'Tab' && !e.altKey && !e.metaKey && !e.ctrlKey) {
              e.preventDefault()
              toggleMode()
            }
          }}
          className={cn('min-w-0 flex-1 bg-transparent px-2 outline-none placeholder:text-muted-foreground', roomy ? 'py-1.5' : 'py-1')}
        />

        {!focused && roomy && (
          <kbd aria-hidden className="mr-2 hidden shrink-0 rounded-md border border-black/10 bg-background/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground dark:border-white/15 sm:block">
            /
          </kbd>
        )}
      </div>
      {roomy && (
        <p className="px-1 text-xs text-muted-foreground">
          <kbd className="font-mono">/</kbd> focuses · <kbd className="font-mono">Tab</kbd> or <kbd className="font-mono">{isMac() ? '⌥S' : 'Alt+S'}</kbd> switches search and AI
        </p>
      )}
    </form>
  )
}

function EngineItem({ Icon, site, name, active, onSelect }: { Icon: IconType; site: string; name: string; active: boolean; onSelect: () => void }) {
  return (
    <DropdownMenuItem onSelect={onSelect} className="justify-between">
      <span className="flex items-center gap-2">
        <PlatformLogo url={site} fallback={Icon} className="h-4 w-4 text-muted-foreground" />
        {name}
      </span>
      {active && <Check className="text-primary" />}
    </DropdownMenuItem>
  )
}
