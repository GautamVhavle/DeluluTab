/** JSON from a host that does not send CORS. The dev server can read it; the extension fetches directly. */
export async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const direct = await fetch(url, { signal, headers: { Accept: 'application/json' } }).catch(() => null)
  if (direct?.ok) return direct.json()
  if (import.meta.env.DEV) {
    const proxied = await fetch(`./quote-proxy?url=${encodeURIComponent(url)}`, { signal })
    if (proxied.ok) return proxied.json()
  }
  throw new Error('That source is not reachable from here.')
}
