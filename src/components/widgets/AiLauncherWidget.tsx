import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowUp } from '@/lib/icons'
import { AI_PROVIDERS, aiProviderById, type AiProvider } from '@/lib/aiProviders'
import { PlatformLogo } from '@/components/common/PlatformLogo'
import { openInNewTab } from '@/lib/navigate'
import { DEFAULT_AI_PRESETS } from '@/store/defaults'
import type { AiPreset } from '@/store/types'
import { isMac } from '@/lib/platform'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import type { WidgetProps } from './types'

/** Alt+A, or Cmd/Ctrl+Shift+K, focuses the prompt from anywhere on the page. */
function useFocusHotkeys(target: React.RefObject<HTMLTextAreaElement | null>) {
  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return // typing in a dialog, don't steal focus
      const altA = e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.code === 'KeyA'
      const modShiftK = (e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey && e.code === 'KeyK'
      if (!altA && !modShiftK) return
      e.preventDefault()
      target.current?.focus()
      target.current?.select()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [target])
}

/** The provider's official logo on a white chip (logos are designed for light backgrounds), glyph as fallback. */
function Logo({ provider, size }: { provider: AiProvider; size: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden
      className={cn('grid shrink-0 place-items-center rounded-lg bg-white shadow-sm ring-1 ring-black/5', size === 'md' ? 'h-8 w-8' : 'h-6 w-6')}
    >
      <PlatformLogo url={provider.site} fallback={provider.glyph} className={cn('text-slate-700', size === 'md' ? 'h-5 w-5' : 'h-4 w-4')} />
    </span>
  )
}

export function AiLauncherWidget({ mode }: WidgetProps) {
  const providerId = useAppStore((s) => s.settings.aiProvider)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const provider = aiProviderById(providerId)
  const compact = mode === 'compact'

  const [prompt, setPrompt] = useState('')
  const field = useRef<HTMLTextAreaElement>(null)
  useFocusHotkeys(field)

  const select = (p: AiProvider) => updateSettings({ aiProvider: p.id })

  const launch = () => {
    const text = prompt.trim()
    if (!text) return
    openInNewTab(provider.url(text))
    setPrompt('')
  }

  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }
  useEffect(() => {
    if (field.current) grow(field.current)
  }, [prompt, mode])

  /** Fills the prompt box with the preset. Anything already typed or pasted goes after it. */
  const applyPreset = (preset: AiPreset) => {
    const existing = prompt.trim()
    const next = existing.startsWith(preset.text.trim()) ? prompt : existing ? `${preset.text}${existing}` : preset.text
    setPrompt(next)
    // Focus right away so anything typed next lands in the prompt box, not on the preset button; the caret is
    // moved to the end once React has written the new text into the field.
    field.current?.focus()
    requestAnimationFrame(() => field.current?.setSelectionRange(next.length, next.length))
  }

  const onFieldKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Alt+1..5 switches provider without leaving the keyboard (codes, because Option+digit types symbols on a Mac).
    const digit = /^Digit([1-5])$/.exec(e.code)
    if (e.altKey && !e.ctrlKey && !e.metaKey && digit) {
      e.preventDefault()
      select(AI_PROVIDERS[Number(digit[1]) - 1])
      return
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      launch()
    } else if (e.key === 'Escape') {
      e.currentTarget.blur()
    }
  }

  // Standard radio-group arrows so the provider choice is keyboard-friendly.
  const onGroupKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const group = e.currentTarget // React clears currentTarget once the handler returns
    const index = AI_PROVIDERS.findIndex((p) => p.id === providerId)
    const next = AI_PROVIDERS[(index + step + AI_PROVIDERS.length) % AI_PROVIDERS.length]
    select(next)
    requestAnimationFrame(() => group.querySelector<HTMLElement>('[aria-checked="true"]')?.focus())
  }

  const mod = isMac() ? '⌥' : 'Alt'

  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <div role="radiogroup" aria-label="AI provider" onKeyDown={onGroupKeyDown} className="flex flex-wrap items-center gap-1">
        {AI_PROVIDERS.map((p, i) => {
          const active = p.id === providerId
          return (
            <motion.button
              key={p.id}
              layout
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={p.name}
              tabIndex={active ? 0 : -1}
              title={`${p.name} (${mod}+${i + 1})`}
              onClick={() => {
                select(p)
                field.current?.focus()
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-full text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                compact ? 'p-1.5' : 'px-2.5 py-1.5',
                active ? 'text-white' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
              )}
              style={active ? { background: p.tile } : undefined}
            >
              <span aria-hidden className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white ring-1 ring-black/5">
                <PlatformLogo url={p.site} fallback={p.glyph} className="h-3.5 w-3.5 text-slate-700" />
              </span>
              {(active || !compact) && <span className={cn(!active && 'hidden sm:inline')}>{p.name}</span>}
            </motion.button>
          )
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          launch()
        }}
        className="flex items-end gap-2 rounded-2xl border bg-background/40 p-1.5 backdrop-blur-md transition-shadow focus-within:ring-2"
        // The ring takes the active provider's brand color.
        style={{ ['--tw-ring-color' as string]: `${provider.color}80`, borderColor: `${provider.color}55` }}
      >
        <Logo provider={provider} size={compact ? 'sm' : 'md'} />
        <textarea
          ref={field}
          rows={1}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={onFieldKeyDown}
          aria-label={`Prompt for ${provider.name}`}
          placeholder={`Ask ${provider.name}…`}
          className={cn(
            'min-w-0 flex-1 resize-none bg-transparent px-1 outline-none placeholder:text-muted-foreground',
            compact ? 'max-h-6 py-0.5 text-sm leading-5' : 'max-h-12 py-1.5 text-sm leading-5',
          )}
        />
        <button
          type="submit"
          disabled={!prompt.trim()}
          aria-label={`Ask ${provider.name} in a new tab`}
          title={`Open in ${provider.name} (Enter). Shift+Enter for a new line. ${mod}+A to focus.`}
          className={cn(
            'grid shrink-0 place-items-center rounded-lg text-white outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30',
            compact ? 'h-6 w-6' : 'h-8 w-8',
          )}
          style={{ background: provider.tile }}
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>

      {mode === 'detailed' && (
        <div role="group" aria-label="Prompt presets" className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
          {DEFAULT_AI_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p)}
              title={p.text.trim()}
              className="shrink-0 rounded-full border bg-background/40 px-2.5 py-1 text-[11px] text-muted-foreground outline-none transition-colors hover:border-primary/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
