import { useEffect, useState } from 'react'
import { RefreshCw } from '@/components/common/icons'
import { useCachedResource } from '@/hooks/useCachedResource'
import { fetchTopics, NEWS_TOPICS, timeAgo, type Headline } from '@/services/news'
import { cn } from '@/utils/cn'
import { useAppStore, type NewsCategory } from '@/store/useAppStore'

const TTL_MS = 30 * 60 * 1000

type Filter = NewsCategory | 'all'

/**
 * Story cards under the dashboard. Categories sit above a grid of floating cards,
 * each with the photo the feed included. Nothing moves on its own.
 */
export function NewsRail() {
  const topics = useAppStore((s) => s.settings.newsTopics)
  const providers = useAppStore((s) => s.settings.newsProviders)
  const available = topics?.length ? topics : NEWS_TOPICS.map((topic) => topic.id)
  const key = `news-v3:${available.join(',')}:${available.map((topic) => providers?.[topic] ?? '').join(',')}`
  const { data, error, loading, refresh } = useCachedResource(key, (signal) => fetchTopics(available, providers, signal), TTL_MS)
  const [filter, setFilter] = useState<Filter>('all')
  const stories = data ?? []
  const shown = filter === 'all' ? stories : stories.filter((story) => story.topic === filter)
  const choices = NEWS_TOPICS.filter((topic) => available.includes(topic.id))

  useEffect(() => {
    if (filter !== 'all' && !available.includes(filter)) setFilter('all')
  }, [available, filter])

  return (
    <section aria-label="News" className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="mr-1 text-sm font-semibold wallpaper-ink">News</h2>
        <div role="radiogroup" aria-label="News categories" className="flex flex-wrap gap-1.5">
          <CategoryChip label="All" pressed={filter === 'all'} onClick={() => setFilter('all')} />
          {choices.map((topic) => (
            <CategoryChip key={topic.id} label={topic.label} pressed={filter === topic.id} onClick={() => setFilter(topic.id)} />
          ))}
        </div>
        <button type="button" onClick={refresh} className="wallpaper-ink ml-auto inline-flex items-center gap-1 text-xs underline underline-offset-2">
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} /> {error ? 'Try again' : 'Refresh'}
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-white/15 bg-white/75 px-4 py-8 text-sm text-muted-foreground shadow-lg backdrop-blur-xl dark:bg-slate-950/75">
          {error || (loading ? 'Loading headlines…' : 'No headlines in this category right now.')}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((story) => (
            <li key={story.link}>
              <a
                href={story.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/85 shadow-lg shadow-black/10 outline-none backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-ring dark:border-white/10 dark:bg-slate-950/80"
              >
                <StoryImage story={story} />
                <span className="flex flex-1 flex-col p-4">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {NEWS_TOPICS.find((topic) => topic.id === story.topic)?.label}
                    {' · '}
                    {story.source}
                    {story.publishedAt > 0 && <> · {timeAgo(story.publishedAt)}</>}
                  </span>
                  <span className="mt-2 text-base font-semibold leading-snug group-hover:underline">{story.title}</span>
                  {story.summary && <span className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{story.summary}</span>}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function CategoryChip({ label, pressed, onClick }: { label: string; pressed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={pressed}
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1 text-xs font-medium shadow-sm outline-none backdrop-blur transition-colors focus-visible:ring-2 focus-visible:ring-ring',
        pressed ? 'bg-primary text-primary-foreground' : 'bg-white/75 text-muted-foreground hover:text-foreground dark:bg-slate-950/70',
      )}
    >
      {label}
    </button>
  )
}

function StoryImage({ story }: { story: Headline }) {
  const list = story.images?.length ? story.images : story.image ? [story.image] : []
  const [index, setIndex] = useState(0)
  const src = list[index]

  useEffect(() => setIndex(0), [story.link])

  return (
    <span className="relative block aspect-video w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
      {src ? (
        <img
          key={src}
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          onError={() => setIndex((current) => current + 1)}
          className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <span className="absolute inset-0 grid place-items-center bg-gradient-to-br from-indigo-500/80 to-slate-900 px-4 text-center text-xs font-semibold uppercase tracking-wide text-white">
          {story.source}
        </span>
      )}
    </span>
  )
}
