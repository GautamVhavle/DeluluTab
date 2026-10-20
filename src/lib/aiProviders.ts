import { Asterisk, CircleSlash, Hexagon, Search, Sparkle, type LucideIcon } from 'lucide-react'
import type { AiProviderId } from '@/store/types'

export interface AiProvider {
  id: AiProviderId
  name: string
  /** Brand accent: ring, send button and highlights. */
  color: string
  /** Background for the provider's logo tile (a gradient for Gemini). */
  tile: string
  glyph: LucideIcon
  /** Chat URL with the prompt in a query parameter. No API key involved: the site reads it on load. */
  url: (prompt: string) => string
}

const q = encodeURIComponent

export const AI_PROVIDERS: AiProvider[] = [
  { id: 'chatgpt', name: 'ChatGPT', color: '#10a37f', tile: '#10a37f', glyph: Hexagon, url: (p) => `https://chatgpt.com/?q=${q(p)}` },
  { id: 'claude', name: 'Claude', color: '#d97757', tile: '#d97757', glyph: Asterisk, url: (p) => `https://claude.ai/new?q=${q(p)}` },
  { id: 'grok', name: 'Grok', color: '#9ca3af', tile: '#18181b', glyph: CircleSlash, url: (p) => `https://x.com/i/grok?text=${q(p)}` },
  { id: 'gemini', name: 'Gemini', color: '#6c8ef5', tile: 'linear-gradient(135deg, #4285f4, #9b72cb 55%, #d96570)', glyph: Sparkle, url: (p) => `https://gemini.google.com/app?prompt=${q(p)}` },
  { id: 'perplexity', name: 'Perplexity', color: '#20b8cd', tile: '#20b8cd', glyph: Search, url: (p) => `https://www.perplexity.ai/search?q=${q(p)}` },
]

export const aiProviderById = (id: AiProviderId) => AI_PROVIDERS.find((p) => p.id === id) ?? AI_PROVIDERS[0]
