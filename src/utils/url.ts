/** Turns "github.com/foo" into a full https URL. Returns null for anything that isn't http(s). */
export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname.includes('.') && url.hostname !== 'localhost') return null
    return url.toString()
  } catch {
    return null
  }
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** The short name under an app icon. Drops a tagline ("GitHub: Build…") and a raw address ("youtube.com"). */
export function appTitle(title: string, url: string): string {
  const name = title.trim()
  const host = hostnameOf(url)
  const looksLikeAddress = !name || name === host || name === url || /^https?:\/\//i.test(name)
  if (looksLikeAddress) {
    const parts = host.split('.').filter(Boolean)
    const stem = parts.length > 1 ? parts[parts.length - 2] : parts[0]
    if (!stem) return name || host
    return stem.charAt(0).toUpperCase() + stem.slice(1)
  }
  return name.split(/\s+[-|–—·]\s+|:\s+/)[0]?.trim() || name
}
