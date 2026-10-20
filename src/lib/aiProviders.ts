import type { IconType } from 'react-icons'
import { FaBolt, FaBrain, FaCompass, FaRobot } from 'react-icons/fa6'
import { MdStars } from 'react-icons/md'
import type { AiProviderId } from '@/store/types'

export interface AiProvider {
  id: AiProviderId
  name: string
  /** Brand accent: ring, send button and highlights. */
  color: string
  /** Background for the provider's logo tile (a gradient for Gemini). */
  tile: string
  /** FontAwesome / Material glyph that stands in for the logo. */
  glyph: IconType
  /** The provider's site, used to look up its official logo. */
  site: string
  /** Chat URL with the prompt in a query parameter. No API key involved: the site reads it on load. */
  url: (prompt: string) => string
}

const q = encodeURIComponent

export const AI_PROVIDERS: AiProvider[] = [
  { id: 'chatgpt', site: 'https://chatgpt.com/', name: 'ChatGPT', color: '#10a37f', tile: '#10a37f', glyph: FaRobot, url: (p) => `https://chatgpt.com/?q=${q(p)}` },
  { id: 'claude', site: 'https://claude.ai/', name: 'Claude', color: '#d97757', tile: '#d97757', glyph: FaBrain, url: (p) => `https://claude.ai/new?q=${q(p)}` },
  { id: 'grok', site: 'https://x.com/i/grok', name: 'Grok', color: '#9ca3af', tile: '#18181b', glyph: FaBolt, url: (p) => `https://x.com/i/grok?text=${q(p)}` },
  { id: 'gemini', site: 'https://gemini.google.com/', name: 'Gemini', color: '#6c8ef5', tile: 'linear-gradient(135deg, #4285f4, #9b72cb 55%, #d96570)', glyph: MdStars, url: (p) => `https://gemini.google.com/app?prompt=${q(p)}` },
  { id: 'perplexity', site: 'https://www.perplexity.ai/', name: 'Perplexity', color: '#20b8cd', tile: '#20b8cd', glyph: FaCompass, url: (p) => `https://www.perplexity.ai/search?q=${q(p)}` },
]

export const aiProviderById = (id: AiProviderId) => AI_PROVIDERS.find((p) => p.id === id) ?? AI_PROVIDERS[0]
