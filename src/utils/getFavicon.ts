/**
 * Platform logos and favicons, with a fallback chain so something sensible always shows:
 *
 *   1. The platform's own official logo, for platforms we know (a direct URL on its own servers).
 *   2. Google's favicon service, which has a high-resolution icon for almost any website.
 *   3. A clean symbol (FontAwesome / Material), drawn locally, so there is never a broken image.
 *
 * This module only builds the ordered list of URLs; <PlatformLogo> walks it, moving on when an image fails.
 * Logos are for identifying a site the user chose (their shortcuts, AI tools, search engines).
 */
import type { IconType } from 'react-icons'
import { FaBolt, FaCompass, FaGlobe, FaGoogle, FaRobot, FaXTwitter } from 'react-icons/fa6'
import { SiBrave, SiClaude, SiGithub, SiGmail, SiYoutube } from 'react-icons/si'
import { BingMark } from '@/components/common/BrandMarks'
import { MdStars } from 'react-icons/md'

export type PlatformId = 'openai' | 'claude' | 'gemini' | 'grok' | 'perplexity' | 'google' | 'gmail' | 'github' | 'youtube' | 'x' | 'bing' | 'brave'

interface Platform {
  name: string
  /**
   * The official logo. SVG wherever the platform publishes one; '' where it doesn't (OpenAI blocks automated
   * requests and ships no stable public SVG), in which case the Google favicon service is used.
   * A few of these are content-hashed paths that their owners can change: if one goes stale the image simply
   * fails to load and the chain moves on to the next source.
   */
  logo: string
  /** Canonical site, used to look the icon up when we only know the platform. */
  site: string
  symbol: IconType
}

export const PLATFORMS: Record<PlatformId, Platform> = {
  openai: { name: 'OpenAI', logo: '', site: 'chatgpt.com', symbol: FaRobot },
  // claude.ai/favicon.svg exists but is served with Cross-Origin-Resource-Policy: same-origin, so browsers refuse to
  // embed it anywhere else; Google's favicon service carries the same official icon.
  claude: { name: 'Claude', logo: '', site: 'claude.ai', symbol: SiClaude },
  gemini: { name: 'Gemini', logo: 'https://www.gstatic.com/lamda/images/favicon_v1_150160cddff7f294ce30.svg', site: 'gemini.google.com', symbol: MdStars },
  grok: { name: 'Grok', logo: 'https://grok.com/images/favicon.svg', site: 'grok.com', symbol: FaBolt },
  perplexity: { name: 'Perplexity', logo: 'https://www.perplexity.ai/favicon.svg', site: 'perplexity.ai', symbol: FaCompass },
  // Google and YouTube publish their official favicons as PNG on gstatic.com rather than SVG.
  google: { name: 'Google', logo: 'https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_128dp.png', site: 'google.com', symbol: FaGoogle },
  gmail: { name: 'Gmail', logo: 'https://www.gstatic.com/images/branding/product/1x/gmail_2020q4_32dp.png', site: 'mail.google.com', symbol: SiGmail },
  github: { name: 'GitHub', logo: '', site: 'github.com', symbol: SiGithub },
  youtube: { name: 'YouTube', logo: '', site: 'youtube.com', symbol: SiYoutube },
  x: { name: 'X', logo: 'https://cdn.simpleicons.org/x/000000', site: 'x.com', symbol: FaXTwitter },
  bing: { name: 'Bing', logo: '', site: 'bing.com', symbol: BingMark },
  brave: { name: 'Brave', logo: '', site: 'search.brave.com', symbol: SiBrave },
}

const parse = (input: string): URL | null => {
  const text = input.trim()
  if (!text || text.length > 2048) return null
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`)
  } catch {
    return null
  }
}

/** The site's host without a leading "www.", or null if `input` isn't a web address. */
export function domainOf(input: string): string | null {
  const url = parse(input)
  if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:')) return null
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  return host.includes('.') || host === 'localhost' ? host : null
}

const isHost = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`)

/** Which known platform `input` belongs to. Matches whole domains only, so "notgithub.com" is not GitHub. */
export function detectPlatform(input: string): PlatformId | null {
  const url = parse(input)
  const host = domainOf(input)
  if (!url || !host) return null
  if (host === 'gemini.google.com' || host === 'bard.google.com') return 'gemini'
  if ((host === 'x.com' || host === 'twitter.com') && /^\/i\/grok(\/|$)/.test(url.pathname)) return 'grok'
  if (isHost(host, 'x.com') || isHost(host, 'twitter.com')) return 'x'
  if (host === 'grok.com' || isHost(host, 'x.ai')) return 'grok'
  if (['chatgpt.com', 'openai.com'].some((d) => isHost(host, d))) return 'openai'
  if (['claude.ai', 'anthropic.com'].some((d) => isHost(host, d))) return 'claude'
  if (isHost(host, 'perplexity.ai')) return 'perplexity'
  if (isHost(host, 'github.com')) return 'github'
  if (isHost(host, 'youtube.com') || host === 'youtu.be') return 'youtube'
  if (host === 'mail.google.com' || host === 'gmail.com') return 'gmail'
  if (isHost(host, 'bing.com')) return 'bing'
  if (isHost(host, 'brave.com')) return 'brave'
  if (host === 'google.com') return 'google' // only the Google homepage; other Google products have their own marks
  return null
}

export const officialLogoUrl = (id: PlatformId): string | null => PLATFORMS[id].logo || null

export const googleFaviconUrl = (domain: string, size = 128) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${Math.min(256, Math.max(16, Math.round(size)))}`

/** A second favicon host. Google's service sometimes answers with a generic globe; this one usually has the real mark. */
export const duckDuckGoIconUrl = (domain: string) => `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`

/** Symbol for the third fallback: the platform's own glyph if we know it, else a globe. */
export function fallbackSymbol(input: string): IconType {
  const platform = detectPlatform(input)
  return platform ? PLATFORMS[platform].symbol : FaGlobe
}

const MEMO_PREFIX = 'delulutab:logo:'

const recall = (host: string): string | null => {
  try {
    return localStorage.getItem(MEMO_PREFIX + host)
  } catch {
    return null
  }
}

/** Remember which source worked for a site, so next time a stale first choice isn't tried (and failed) before it. */
export function rememberLogo(input: string, url: string) {
  const host = domainOf(input)
  if (!host) return
  try {
    if (localStorage.getItem(MEMO_PREFIX + host) !== url) localStorage.setItem(MEMO_PREFIX + host, url)
  } catch {
    // storage blocked: the chain still works, just without the shortcut
  }
}

/**
 * The ordered list of image URLs to try for `input` (a URL, or a bare domain).
 * Empty when `enabled` is false (symbols only, no requests) or `input` isn't a web address.
 */
export function getFaviconCandidates(input: string, options: { size?: number; enabled?: boolean } = {}): string[] {
  const { size = 128, enabled = true } = options
  const host = domainOf(input)
  if (!enabled || !host) return []

  const chain: string[] = []
  const platform = detectPlatform(input)
  if (platform) {
    const official = officialLogoUrl(platform)
    if (official) chain.push(official)
    // For platforms the Google service should be asked about the platform's real site, not a path like x.com/i/grok.
    const site = host.endsWith(PLATFORMS[platform].site) ? host : PLATFORMS[platform].site
    chain.push(googleFaviconUrl(site, size), duckDuckGoIconUrl(site))
  } else {
    chain.push(googleFaviconUrl(host, size), duckDuckGoIconUrl(host))
  }

  const remembered = recall(host)
  if (remembered && chain.includes(remembered)) return [remembered, ...chain.filter((u) => u !== remembered)]
  return chain
}

/** Convenience: the first URL to try. */
export const getFavicon = (input: string, size = 128) => getFaviconCandidates(input, { size })[0] ?? null
