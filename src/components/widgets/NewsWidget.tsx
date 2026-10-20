import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink, RefreshCw } from '@/lib/icons'
import { useCachedResource } from '@/hooks/useCachedResource'
import { categoryById, fetchNews, NEWS_CATEGORIES, timeAgo } from '@/lib/news'
import { cn } from '@/lib/utils'
import { useAppStore, type NewsCategory } from '@/store/useAppStore'
import type { WidgetProps } from './types'

const TTL_MS = 30 * 60 * 1000
const TICKER_MS = 7000

function useNews(category: NewsCategory) {
  return useCachedResource(`news:${category}`, (signal) => fetchNews(category, signal), TTL_MS)
}

function Chips({ category, onChange }: { category: NewsCategory; onChange: (c: NewsCategory) => void }) {
  return (
    <div role="radiogroup" aria-label="News category" className="flex gap-1">
      {NEWS_CATEGORIES.map((c) => (
        <button
          key={c.id}
          role="radio"
          aria-checked={category === c.id}
          onClick={() => onChange(c.id)}
          className={cn(
            'rounded-full px-2.5 py-0.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            category === c.id ? 'bg-primary text-primary-foreground' : 'bg-secondary/70 text-muted-foreground hover:text-foreground',
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}

/** One headline at a time, rotating. Hover or focus pauses it. */
function Ticker() {
  const category = useAppStore((s) => s.settings.newsCategory)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const { data, error, loading, refresh } = useNews(category)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const cfg = categoryById(category)
  const next = NEWS_CATEGORIES[(NEWS_CATEGORIES.findIndex((c) => c.id === category) + 1) % NEWS_CATEGORIES.length]

  useEffect(() => setIndex(0), [category])
  useEffect(() => {
    if (paused || !data || data.length < 2) return
    const id = setInterval(() => setIndex((i) => (i + 1) % data.length), TICKER_MS)
    return () => clearInterval(id)
  }, [paused, data])

  const headline = data?.[index % (data?.length || 1)]

  return (
    <div className="flex h-full items-center gap-3 text-sm" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <button
        onClick={() => updateSettings({ newsCategory: next.id })}
        title={`Switch to ${next.label}`}
        className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-xs text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {cfg.label}
      </button>
      <div className="relative h-5 min-w-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {headline ? (
            <motion.a
              key={headline.link}
              href={headline.link}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 truncate leading-5 outline-none hover:underline focus-visible:underline"
              title={headline.title}
            >
              {headline.title}
            </motion.a>
          ) : (
            <motion.span key="status" className="absolute inset-0 truncate leading-5 text-muted-foreground">
              {error || (loading ? 'Loading headlines…' : 'No headlines right now')}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {error && !data && (
        <button onClick={refresh} aria-label="Retry loading headlines" className="shrink-0 rounded text-muted-foreground hover:text-foreground">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

function Card() {
  const category = useAppStore((s) => s.settings.newsCategory)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const { data, error, loading, refresh } = useNews(category)
  const cfg = categoryById(category)

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Chips category={category} onChange={(newsCategory) => updateSettings({ newsCategory })} />
        <button
          onClick={refresh}
          aria-label="Refresh headlines"
          className="rounded-md p-1 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto" aria-busy={loading && !data} aria-label={`${cfg.label} headlines`}>
        {data?.slice(0, 6).map((h) => (
          <li key={h.link}>
            <a
              href={h.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-lg px-2 py-1.5 outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="line-clamp-2 text-sm leading-snug">{h.title}</span>
              <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                {h.source}
                {h.publishedAt > 0 && <> · {timeAgo(h.publishedAt)}</>}
                <ExternalLink className="ml-auto h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
              </span>
            </a>
          </li>
        ))}
        {!data && loading &&
          [0, 1, 2, 3].map((i) => <li key={i} aria-hidden className="h-10 animate-pulse rounded-lg bg-secondary/50" />)}
        {error && (
          <li className="px-2 text-sm">
            <p role="alert" className="text-muted-foreground">{error}</p>
            <button onClick={refresh} className="mt-1 text-xs underline underline-offset-2">Try again</button>
          </li>
        )}
      </ul>
    </div>
  )
}

export function NewsWidget({ mode }: WidgetProps) {
  return mode === 'compact' ? <Ticker /> : <Card />
}
