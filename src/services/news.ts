import type { NewsCategory } from '@/types'

export interface NewsProvider {
  id: string
  topic: NewsCategory
  label: string
  source: string
  feed: string
}

export const NEWS_TOPICS: { id: NewsCategory; label: string }[] = [
  { id: 'tech', label: 'Tech' },
  { id: 'ai', label: 'AI' },
  { id: 'science', label: 'Science' },
  { id: 'world', label: 'World' },
  { id: 'business', label: 'Business' },
]

/**
 * Sources that actually ship a story photo. Each topic has two, so one blocked feed
 * does not leave that category empty.
 */
export const NEWS_PROVIDERS: NewsProvider[] = [
  { id: 'verge', topic: 'tech', label: 'The Verge', source: 'The Verge', feed: 'https://www.theverge.com/rss/index.xml' },
  { id: 'ars', topic: 'tech', label: 'Ars Technica', source: 'Ars Technica', feed: 'https://feeds.arstechnica.com/arstechnica/index' },
  { id: 'bbc-tech', topic: 'tech', label: 'BBC Tech', source: 'BBC', feed: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
  { id: 'verge-ai', topic: 'ai', label: 'The Verge AI', source: 'The Verge', feed: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  { id: 'guardian-ai', topic: 'ai', label: 'The Guardian', source: 'The Guardian', feed: 'https://www.theguardian.com/technology/artificialintelligenceai/rss' },
  { id: 'mit', topic: 'ai', label: 'MIT Tech Review', source: 'MIT Technology Review', feed: 'https://www.technologyreview.com/feed/' },
  { id: 'bbc-science', topic: 'science', label: 'BBC Science', source: 'BBC', feed: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml' },
  { id: 'nasa', topic: 'science', label: 'NASA', source: 'NASA', feed: 'https://www.nasa.gov/rss/dyn/breaking_news.rss' },
  { id: 'guardian-science', topic: 'science', label: 'The Guardian', source: 'The Guardian', feed: 'https://www.theguardian.com/science/rss' },
  { id: 'bbc-world', topic: 'world', label: 'BBC World', source: 'BBC', feed: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { id: 'guardian-world', topic: 'world', label: 'The Guardian', source: 'The Guardian', feed: 'https://www.theguardian.com/world/rss' },
  { id: 'bbc-business', topic: 'business', label: 'BBC Business', source: 'BBC', feed: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { id: 'guardian-business', topic: 'business', label: 'The Guardian', source: 'The Guardian', feed: 'https://www.theguardian.com/business/rss' },
]

/** Kept so older imports still resolve a category label. */
export const NEWS_CATEGORIES = NEWS_TOPICS.map((topic) => {
  const provider = NEWS_PROVIDERS.find((item) => item.topic === topic.id)!
  return { id: topic.id, label: topic.label, source: provider.source, feed: provider.feed }
})

export const categoryById = (id: NewsCategory) => NEWS_CATEGORIES.find((item) => item.id === id) ?? NEWS_CATEGORIES[0]

export const providersFor = (topic: NewsCategory) => NEWS_PROVIDERS.filter((item) => item.topic === topic)

export const providerById = (id: string) => NEWS_PROVIDERS.find((item) => item.id === id)

export function providerFor(topic: NewsCategory, chosen: Partial<Record<NewsCategory, string>> | undefined) {
  const list = providersFor(topic)
  return list.find((item) => item.id === chosen?.[topic]) ?? list[0]
}

export interface Headline {
  title: string
  link: string
  source: string
  publishedAt: number
  /** Best story image. Empty when the feed had none. */
  image: string
  /** Other pictures from the same item, tried if the first one fails to load. */
  images: string[]
  /** Plain-text blurb, tags already stripped. */
  summary: string
  topic: NewsCategory
}

export class NewsError extends Error {}

const decode = (text: string) =>
  text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ')
    .trim()

function field(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'))
  return match ? decode(match[1]) : ''
}

/** Turns a feed URL into something sharp enough for a card. BBC thumbs arrive at 240px. */
export function upgradeImage(url: string) {
  const text = decode(url)
  if (!/^https?:\/\//i.test(text)) return ''
  if (/spacer|pixel|1x1|tracking|favicon/i.test(text)) return ''
  return text.replace(/(ichef\.bbci\.co\.uk\/ace\/standard\/)\d+\//, '$1800/')
}

function imagesFrom(block: string) {
  const unescaped = block.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0*39;/g, "'")
  const found: { url: string; width: number }[] = []
  for (const text of [block, unescaped]) {
    for (const match of text.matchAll(/<(?:media:content|media:thumbnail|enclosure)\b([^>]*)\/?>/gi)) {
      const url = match[1].match(/\burl=["']([^"']+)["']/i)?.[1]
      const width = Number(match[1].match(/\bwidth=["'](\d+)["']/i)?.[1] ?? 0)
      if (url) found.push({ url, width })
    }
    for (const match of text.matchAll(/<img\b([^>]*)>/gi)) {
      const url = match[1].match(/\bsrc=["']([^"']+)["']/i)?.[1]
      if (url) found.push({ url, width: 0 })
    }
  }
  const ranked = found
    .map((item) => ({ url: upgradeImage(item.url), width: item.width }))
    .filter((item) => item.url)
    .sort((a, b) => b.width - a.width || b.url.length - a.url.length)
  const seen = new Set<string>()
  const urls: string[] = []
  for (const item of ranked) {
    if (seen.has(item.url)) continue
    seen.add(item.url)
    urls.push(item.url)
    if (urls.length >= 4) break
  }
  return urls
}

/** og:image (or twitter:image) from an article page. Exported for tests. */
export function ogImageFrom(html: string) {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    const url = match ? upgradeImage(match[1]) : ''
    if (url) return url
  }
  return ''
}

const ogCache = new Map<string, Promise<string>>()
let ogActive = 0
const ogQueue: Array<() => void> = []

function pooled<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      ogActive += 1
      task().then(resolve, reject).finally(() => {
        ogActive -= 1
        ogQueue.shift()?.()
      })
    }
    if (ogActive < 3) run()
    else ogQueue.push(run)
  })
}

/**
 * Picture for a story. Uses the feed image when there is one, otherwise the article's og:image.
 * Feeds like TechCrunch ship no photo, so the page itself is the fallback.
 */
export function previewImage(link: string, known = '') {
  const ready = upgradeImage(known)
  if (ready) return Promise.resolve(ready)
  const cached = ogCache.get(link)
  if (cached) return cached
  const job = pooled(async () => {
    try {
      const html = await readFeed(link)
      return ogImageFrom(html)
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err
      return ''
    }
  })
  ogCache.set(link, job)
  return job
}

/** Pulls headlines out of an RSS or Atom document. Exported for tests. */
export function parseFeed(xml: string, source: string, topic: NewsCategory): Headline[] {
  const chunks = xml.split(/<item[\s>]|<entry[\s>]/i).slice(1)
  const headlines: Headline[] = []
  for (const chunk of chunks) {
    const title = field(chunk, 'title')
    const linkTag = field(chunk, 'link')
    const href = chunk.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] ?? ''
    const link = /^https?:\/\//i.test(linkTag) ? linkTag : href
    if (!title || !/^https?:\/\//i.test(link)) continue
    const when = Date.parse(field(chunk, 'pubDate') || field(chunk, 'published') || field(chunk, 'updated'))
    const images = imagesFrom(chunk)
    const summary = (field(chunk, 'description') || field(chunk, 'summary')).slice(0, 180)
    headlines.push({
      title,
      link,
      source,
      publishedAt: Number.isNaN(when) ? 0 : when,
      image: images[0] ?? '',
      images,
      summary: summary && summary !== title ? summary : '',
      topic,
    })
    if (headlines.length >= 12) break
  }
  return headlines
}

const looksLikeFeed = (body: string) => /<(rss|feed|rdf:RDF|channel|item|entry)\b/i.test(body.slice(0, 2500))

async function readBody(response: Response) {
  const body = await response.text()
  return looksLikeFeed(body) ? body : ''
}

async function readFeed(url: string, signal?: AbortSignal) {
  const direct = await fetch(url, { signal, headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' } }).catch(() => null)
  if (direct?.ok) {
    const body = await readBody(direct)
    if (body) return body
  }
  // The dev server fetches the feed for us. The extension talks to the publishers directly.
  if (import.meta.env.DEV) {
    const proxied = await fetch(`./rss-proxy?url=${encodeURIComponent(url)}`, { signal }).catch(() => null)
    if (proxied?.ok) {
      const body = await readBody(proxied)
      if (body) return body
    }
  }
  throw new NewsError("Can't reach the news service. Check your connection.")
}

export async function fetchProvider(provider: NewsProvider, signal?: AbortSignal) {
  let xml: string
  try {
    xml = await readFeed(provider.feed, signal)
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    if (err instanceof NewsError) throw err
    throw new NewsError("Can't reach the news service. Check your connection.")
  }
  const items = parseFeed(xml, provider.source, provider.topic)
  if (items.length === 0) throw new NewsError(`${provider.label} didn't return any headlines.`)
  return items
}

/** Headlines for one topic, using its selected provider. */
export async function fetchNews(category: NewsCategory, signal?: AbortSignal) {
  const provider = providerFor(category, {})
  return fetchProvider(provider, signal)
}

async function fetchTopic(topic: NewsCategory, chosen: Partial<Record<NewsCategory, string>> | undefined, signal?: AbortSignal) {
  const all = providersFor(topic)
  const preferred = providerFor(topic, chosen)
  const order = [preferred, ...all.filter((item) => item.id !== preferred.id)]
  const batches = await Promise.all(order.map(async (provider) => {
    try {
      return await fetchProvider(provider, signal)
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err
      return [] as Headline[]
    }
  }))
  const seen = new Set<string>()
  const stories: Headline[] = []
  for (const batch of batches) {
    for (const story of batch) {
      if (seen.has(story.link)) continue
      seen.add(story.link)
      stories.push(story)
      if (stories.length >= 8) return stories
    }
  }
  return stories
}

/** Mixes every selected topic. Each topic tries all of its publications, preferred one first. */
export async function fetchTopics(topics: NewsCategory[], chosen: Partial<Record<NewsCategory, string>> | undefined, signal?: AbortSignal) {
  const list = topics.length ? topics : NEWS_TOPICS.map((topic) => topic.id)
  const batches = await Promise.all(list.map((topic) => fetchTopic(topic, chosen, signal)))
  const seen = new Set<string>()
  const merged = batches.flat().filter((item) => {
    if (seen.has(item.link)) return false
    seen.add(item.link)
    return true
  })
  merged.sort((a, b) => b.publishedAt - a.publishedAt)
  if (merged.length === 0) throw new NewsError("Can't reach the news service. Check your connection.")
  return merged
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
