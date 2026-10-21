import type { IconType } from 'react-icons'
import { FaGoogle, FaShieldHalved } from 'react-icons/fa6'
import { SiBrave } from 'react-icons/si'
import { BingMark } from '@/components/common/BrandMarks'
import type { SearchEngineId } from '@/types'
import { aiProviderById } from './aiProviders'

export interface SearchEngine {
  id: SearchEngineId
  name: string
  group: 'web' | 'ai'
  icon: IconType
  /** The engine's site, used to look up its logo. */
  site: string
  url: (query: string) => string
}

const q = encodeURIComponent
const ai = (id: 'perplexity' | 'chatgpt' | 'claude'): Pick<SearchEngine, 'name' | 'icon' | 'site' | 'url'> => {
  const p = aiProviderById(id)
  return { name: p.name, icon: p.glyph, site: p.site, url: p.url }
}

export const SEARCH_ENGINES: SearchEngine[] = [
  { id: 'google', site: 'https://www.google.com/', name: 'Google', group: 'web', icon: FaGoogle, url: (s) => `https://www.google.com/search?q=${q(s)}` },
  { id: 'duckduckgo', site: 'https://duckduckgo.com/', name: 'DuckDuckGo', group: 'web', icon: FaShieldHalved, url: (s) => `https://duckduckgo.com/?q=${q(s)}` },
  { id: 'bing', site: 'https://www.bing.com/', name: 'Bing', group: 'web', icon: BingMark, url: (s) => `https://www.bing.com/search?q=${q(s)}` },
  { id: 'brave', site: 'https://search.brave.com/', name: 'Brave', group: 'web', icon: SiBrave, url: (s) => `https://search.brave.com/search?q=${q(s)}` },
  { id: 'perplexity', group: 'ai', ...ai('perplexity') },
  { id: 'chatgpt', group: 'ai', ...ai('chatgpt') },
  { id: 'claude', group: 'ai', ...ai('claude') },
]

export const engineById = (id: SearchEngineId) => SEARCH_ENGINES.find((e) => e.id === id) ?? SEARCH_ENGINES[0]
