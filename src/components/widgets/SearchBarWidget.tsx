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

/** `/` and Cmd/Ctrl+K focus the bar. Alt+S flips it between web search and AI. */
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
  const focus = mode === 'focus'
  const compact = mode === 'compact'

  const input = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const toggleMode = useCallback(() => updateSettings({ commandMode: asking ? 'web' : 'ai' }), [asking, updateSettings])
  useFocusShortcuts(input, toggleMode)

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
          'flex items-center gap-1 rounded-2xl border border-white/20 bg-white/40 shadow-sm backdrop-blur-xl transition-shadow dark:border-white/10 dark:bg-white/[0.06]',
          'focus-within:ring-2 focus-within:ring-ring/50',
          focus ? 'p-1.5 text-lg' : compact ? 'p-1 text-sm' : 'p-1.5',
        )}
      >
        <div role="radiogroup" aria-label="Send the query to a search engine or an AI" className="flex shrink-0 rounded-xl bg-black/5 p-0.5 dark:bg-white/10">
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
                'rounded-[10px] px-2.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring',
                focus ? 'py-2' : 'py-1.5',
                commandMode === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
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
                'flex shrink-0 items-center gap-1.5 rounded-xl px-2 text-sm font-medium outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring',
                focus ? 'py-2.5' : 'py-1.5',
              )}
            >
              <PlatformLogo url={targetSite} fallback={targetIcon} className={cn('h-4 w-4', asking ? 'text-violet-400' : 'text-muted-foreground')} />
              <span className={compact ? 'sr-only sm:not-sr-only' : undefined}>{targetName}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
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
          className={cn('min-w-0 flex-1 bg-transparent px-2 outline-none placeholder:text-muted-foreground', focus ? 'py-2.5' : 'py-1.5')}
        />

        {!focused && !compact && (
          <kbd aria-hidden className="mr-2 hidden shrink-0 rounded-md border bg-background/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:block">
            Tab
          </kbd>
        )}
      </div>
      {mode === 'detailed' && (
        <p className="px-1 text-xs text-muted-foreground">
          <kbd className="font-mono">Tab</kbd> or <kbd className="font-mono">{isMac() ? '⌥S' : 'Alt+S'}</kbd> switches search and AI · <kbd className="font-mono">/</kbd> focuses
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
