import { CLASSIC_QUOTES, QUOTES, type Quote } from '@/config/quotes'
import type { QuoteSource } from '@/types'

export const QUOTE_SOURCES: { id: QuoteSource; label: string; hint: string }[] = [
  { id: 'builtin', label: 'DeluluTab', hint: 'Original lines, kept on this device' },
  { id: 'classics', label: 'Classics', hint: 'Public-domain lines from Dickens, Whitman, Wilde and others' },
  { id: 'custom', label: 'Your own', hint: 'Quotes you write in this panel' },
  { id: 'zenquotes', label: 'ZenQuotes', hint: 'Fetched from ZenQuotes' },
  { id: 'quotable', label: 'Quotable', hint: 'Fetched from Quotable' },
  { id: 'url', label: 'JSON link', hint: 'A JSON file you host' },
]

const ENDPOINTS: Partial<Record<QuoteSource, string>> = {
  zenquotes: 'https://zenquotes.io/api/quotes',
  // api.quotable.io no longer resolves. This host serves the same { results: [{ content, author }] } shape.
  quotable: 'https://quotable.vercel.app/quotes?limit=20',
}

export const isRemoteQuoteSource = (source: QuoteSource) => source === 'zenquotes' || source === 'quotable' || source === 'url'

const cache = new Map<string, Promise<Quote[]>>()

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function field(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value.replace(/\s+/g, ' ').trim()
  }
  return ''
}

/** Turns ZenQuotes, Quotable, or a simple JSON file into quotes. Exported for tests. */
export function quotesFromJson(data: unknown): Quote[] {
  const record = asRecord(data)
  const rows = Array.isArray(data) ? data : record && Array.isArray(record.quotes) ? record.quotes : record && Array.isArray(record.results) ? record.results : []
  const quotes: Quote[] = []
  for (const row of rows) {
    const item = asRecord(row)
    if (!item) continue
    const text = field(item, ['text', 'q', 'content', 'quote']).slice(0, 280)
    const by = field(item, ['by', 'a', 'author']).slice(0, 60)
    if (!text) continue
    quotes.push({ text, by: by || 'Unknown' })
    if (quotes.length >= 40) break
  }
  return quotes
}

async function readText(url: string, signal?: AbortSignal) {
  const direct = await fetch(url, { signal }).catch(() => null)
  if (direct?.ok) return direct.text()
  // ZenQuotes sends no CORS header, and a custom JSON file often doesn't either. The dev server fetches it.
  if (import.meta.env.DEV) {
    const proxied = await fetch(`./quote-proxy?url=${encodeURIComponent(url)}`, { signal }).catch(() => null)
    if (proxied?.ok) return proxied.text()
  }
  throw new Error("Can't reach that quote source.")
}

/** The list for a source. Remote lists are fetched once and reused until the source or URL changes. */
export function loadQuotes(source: QuoteSource, url: string, signal?: AbortSignal): Promise<Quote[]> {
  if (source === 'builtin') return Promise.resolve(QUOTES)
  if (source === 'classics') return Promise.resolve(CLASSIC_QUOTES)
  if (source === 'custom') return Promise.resolve([])
  const endpoint = source === 'url' ? url.trim() : ENDPOINTS[source] ?? ''
  if (!/^https:\/\//i.test(endpoint)) return Promise.reject(new Error('Add an https link to a JSON file.'))
  const key = `${source}\0${endpoint}`
  const cached = cache.get(key)
  if (cached) return cached
  const job = readText(endpoint, signal)
    .then((body) => quotesFromJson(JSON.parse(body)))
    .then((list) => {
      if (!list.length) throw new Error('That source returned no quotes.')
      return list
    })
  job.catch(() => cache.delete(key))
  cache.set(key, job)
  return job
}
