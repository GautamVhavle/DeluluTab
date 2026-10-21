import { useState } from 'react'
import { Plus, Trash2 } from '@/components/common/icons'
import { QuotesWidget } from '@/components/widgets/QuotesWidget'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { QUOTE_SOURCES } from '@/services/quotes'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/store/useAppStore'
import { Section } from './SettingsUi'

const MAX_QUOTES = 24

/** Source, custom lines, and a JSON link for the quote widget. */
export function QuotesPanel() {
  const source = useAppStore((s) => s.settings.quoteSource)
  const quotes = useAppStore((s) => s.settings.customQuotes)
  const quoteUrl = useAppStore((s) => s.settings.quoteUrl)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const [text, setText] = useState('')
  const [by, setBy] = useState('')

  function add() {
    const line = text.trim()
    if (!line || quotes.length >= MAX_QUOTES) return
    updateSettings({
      quoteSource: 'custom',
      customQuotes: [...quotes, { text: line.slice(0, 180), by: by.trim().slice(0, 48) || 'You' }],
    })
    setText('')
    setBy('')
  }

  return (
    <div className="grid gap-7">
      <Section title="Preview" hint="The line on your dashboard. It fades out every minute and the next one fades in.">
        <div className="rounded-2xl border bg-card/60 p-5">
          <div className="mx-auto min-h-28 max-w-md">
            <QuotesWidget mode="compact" />
          </div>
        </div>
      </Section>

      <Section title="Source" hint="Pick where the lines come from.">
        <div role="radiogroup" aria-label="Quote source" className="grid gap-2">
          {QUOTE_SOURCES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={source === item.id}
              onClick={() => updateSettings({ quoteSource: item.id })}
              className={cn(
                'rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                source === item.id ? 'border-primary bg-primary/10' : 'hover:bg-accent/50',
              )}
            >
              <span className="block text-sm font-medium">{item.label}</span>
              <span className="block text-xs text-muted-foreground">{item.hint}</span>
            </button>
          ))}
        </div>
      </Section>

      {source === 'url' && (
        <Section title="JSON link" hint="An https address. The widget reads the file and rotates through it.">
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Address</span>
            <Input
              value={quoteUrl}
              placeholder="https://example.com/quotes.json"
              aria-label="Quotes JSON link"
              inputMode="url"
              spellCheck={false}
              onChange={(e) => updateSettings({ quoteUrl: e.target.value.slice(0, 300) })}
            />
          </label>
          <div className="rounded-xl border bg-secondary/40 p-3">
            <p className="text-xs font-medium">Any of these shapes</p>
            <ul className="mt-2 space-y-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
              <li>{'{ "text": "…", "by": "…" }'}</li>
              <li>{'{ "q": "…", "a": "…" }'}</li>
              <li>{'{ "content": "…", "author": "…" }'}</li>
            </ul>
          </div>
        </Section>
      )}

      {source === 'custom' && (
        <Section title="Your own quotes" hint={`${quotes.length} of ${MAX_QUOTES} on the dashboard.`}>
          <div className="grid gap-3 rounded-2xl border bg-card/40 p-3">
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">The line</span>
              <textarea
                value={text}
                maxLength={180}
                rows={2}
                placeholder="Write the quote"
                aria-label="Quote text"
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); add() } }}
                className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </label>
            <div className="flex items-end gap-2">
              <label className="grid min-w-0 flex-1 gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Author</span>
                <Input value={by} maxLength={48} placeholder="Optional" aria-label="Quote author" onChange={(e) => setBy(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
              </label>
              <Button type="button" onClick={add} disabled={!text.trim() || quotes.length >= MAX_QUOTES} className="shrink-0">
                <Plus /> Add
              </Button>
            </div>
          </div>
          {quotes.length > 0 ? (
            <ul className="grid gap-2">
              {quotes.map((quote, index) => (
                <li key={`${quote.text}-${index}`} className="flex items-start gap-3 rounded-xl border bg-card/40 px-3 py-2.5">
                  <p className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug">“{quote.text}”</span>
                    <span className="mt-1 block text-xs font-medium text-muted-foreground">{quote.by}</span>
                  </p>
                  <button
                    type="button"
                    aria-label={`Remove quote by ${quote.by}`}
                    onClick={() => updateSettings({ customQuotes: quotes.filter((_, i) => i !== index) })}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">No custom quotes yet.</p>
          )}
        </Section>
      )}
    </div>
  )
}
