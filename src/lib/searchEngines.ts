import type { SearchEngineId } from '@/store/types'

export interface SearchEngine {
  id: SearchEngineId
  name: string
  group: 'web' | 'ai'
  url: (query: string) => string
}

const q = encodeURIComponent

export const SEARCH_ENGINES: SearchEngine[] = [
  { id: 'google', name: 'Google', group: 'web', url: (s) => `https://www.google.com/search?q=${q(s)}` },
  { id: 'duckduckgo', name: 'DuckDuckGo', group: 'web', url: (s) => `https://duckduckgo.com/?q=${q(s)}` },
  { id: 'bing', name: 'Bing', group: 'web', url: (s) => `https://www.bing.com/search?q=${q(s)}` },
  { id: 'ecosia', name: 'Ecosia', group: 'web', url: (s) => `https://www.ecosia.org/search?q=${q(s)}` },
  { id: 'perplexity', name: 'Perplexity', group: 'ai', url: (s) => `https://www.perplexity.ai/search?q=${q(s)}` },
  { id: 'chatgpt', name: 'ChatGPT', group: 'ai', url: (s) => `https://chatgpt.com/?q=${q(s)}` },
  { id: 'claude', name: 'Claude', group: 'ai', url: (s) => `https://claude.ai/new?q=${q(s)}` },
]

export const engineById = (id: SearchEngineId) => SEARCH_ENGINES.find((e) => e.id === id) ?? SEARCH_ENGINES[0]
