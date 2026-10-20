import type { NewsCategory } from '@/types'

export interface NewsCategoryConfig {
  id: NewsCategory
  label: string
  source: string
  feed: string
}

export const NEWS_CATEGORIES: NewsCategoryConfig[] = [
  { id: 'tech', label: 'Tech', source: 'TechCrunch', feed: 'https://techcrunch.com/feed/' },
  { id: 'ai', label: 'AI', source: 'MIT Technology Review', feed: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/' },
  { id: 'science', label: 'Science', source: 'ScienceDaily', feed: 'https://www.sciencedaily.com/rss/top/science.xml' },
  { id: 'world', label: 'World', source: 'BBC News', feed: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { id: 'business', label: 'Business', source: 'BBC News', feed: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
]

export const categoryById = (id: NewsCategory) => NEWS_CATEGORIES.find((c) => c.id === id) ?? NEWS_CATEGORIES[0]

export interface Headline {
  title: string
  link: string
  source: string
  publishedAt: number
}

export class NewsError extends Error {}

/** Feed titles can contain HTML entities (&amp; &#8217;). A textarea decodes them without running anything. */
function decodeEntities(text: string) {
  const el = document.createElement('textarea')
  el.innerHTML = text
  return el.value.trim()
}

/** Free RSS-to-JSON converter (rss2json.com): public feeds rarely send CORS headers, so they can't be read directly. */
export async function fetchNews(category: NewsCategory, signal?: AbortSignal): Promise<Headline[]> {
  const cfg = categoryById(category)
  let res: Response
  try {
    res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(cfg.feed)}`, { signal })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new NewsError("Can't reach the news service. Check your connection.")
  }
  if (!res.ok) throw new NewsError('The news service is busy. Try again in a minute.')
  const data = await res.json()
  if (data.status !== 'ok' || !Array.isArray(data.items)) throw new NewsError(`${cfg.label} headlines aren't available right now.`)

  return data.items
    .filter((i: any) => typeof i.link === 'string' && /^https?:\/\//i.test(i.link) && i.title)
    .slice(0, 10)
    .map((i: any) => ({
      title: decodeEntities(String(i.title)),
      link: i.link,
      source: cfg.source,
      // rss2json reports "YYYY-MM-DD HH:mm:ss" in UTC
      publishedAt: Date.parse(String(i.pubDate).replace(' ', 'T') + 'Z') || 0,
    }))
}

export function timeAgo(ms: number, now = Date.now()) {
  if (!ms) return ''
  const mins = Math.max(0, Math.round((now - ms) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}
