import type { SearchEngineId } from '@/store/types'
import { aiProviderById } from './aiProviders'

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
  { id: 'perplexity', name: 'Perplexity', group: 'ai', url: aiProviderById('perplexity').url },
  { id: 'chatgpt', name: 'ChatGPT', group: 'ai', url: aiProviderById('chatgpt').url },
  { id: 'claude', name: 'Claude', group: 'ai', url: aiProviderById('claude').url },
]

export const engineById = (id: SearchEngineId) => SEARCH_ENGINES.find((e) => e.id === id) ?? SEARCH_ENGINES[0]
