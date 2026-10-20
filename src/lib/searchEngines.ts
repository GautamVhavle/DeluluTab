import type { IconType } from 'react-icons'
import { FaGoogle, FaLeaf, FaMicrosoft, FaShieldHalved } from 'react-icons/fa6'
import type { SearchEngineId } from '@/store/types'
import { aiProviderById } from './aiProviders'

export interface SearchEngine {
  id: SearchEngineId
  name: string
  group: 'web' | 'ai'
  icon: IconType
  url: (query: string) => string
}

const q = encodeURIComponent
const ai = (id: 'perplexity' | 'chatgpt' | 'claude'): Pick<SearchEngine, 'name' | 'icon' | 'url'> => {
  const p = aiProviderById(id)
  return { name: p.name, icon: p.glyph, url: p.url }
}

export const SEARCH_ENGINES: SearchEngine[] = [
  { id: 'google', name: 'Google', group: 'web', icon: FaGoogle, url: (s) => `https://www.google.com/search?q=${q(s)}` },
  { id: 'duckduckgo', name: 'DuckDuckGo', group: 'web', icon: FaShieldHalved, url: (s) => `https://duckduckgo.com/?q=${q(s)}` },
  { id: 'bing', name: 'Bing', group: 'web', icon: FaMicrosoft, url: (s) => `https://www.bing.com/search?q=${q(s)}` },
  { id: 'ecosia', name: 'Ecosia', group: 'web', icon: FaLeaf, url: (s) => `https://www.ecosia.org/search?q=${q(s)}` },
  { id: 'perplexity', group: 'ai', ...ai('perplexity') },
  { id: 'chatgpt', group: 'ai', ...ai('chatgpt') },
  { id: 'claude', group: 'ai', ...ai('claude') },
]

export const engineById = (id: SearchEngineId) => SEARCH_ENGINES.find((e) => e.id === id) ?? SEARCH_ENGINES[0]
