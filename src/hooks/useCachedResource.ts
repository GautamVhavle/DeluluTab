import { useCallback, useEffect, useRef, useState } from 'react'

interface Entry<T> {
  t: number
  v: T
}

function read<T>(key: string): Entry<T> | null {
  try {
    const raw = localStorage.getItem(`delulutab:cache:${key}`)
    return raw ? (JSON.parse(raw) as Entry<T>) : null
  } catch {
    return null
  }
}

function write<T>(key: string, v: T) {
  try {
    localStorage.setItem(`delulutab:cache:${key}`, JSON.stringify({ t: Date.now(), v }))
  } catch {
    // Cache is an optimization only.
  }
}

interface State<T> {
  key: string | null
  data: T | null
  error: string
  loading: boolean
  updatedAt: number
}

/**
 * Stale-while-revalidate fetch: shows the cached copy immediately, and only hits the network when it is
 * older than `ttlMs`. Keeps showing old data (with an error) if a refresh fails. `key = null` means "idle".
 */
export function useCachedResource<T>(key: string | null, fetcher: (signal: AbortSignal) => Promise<T>, ttlMs: number) {
  const [state, setState] = useState<State<T>>({ key: null, data: null, error: '', loading: false, updatedAt: 0 })
  const [nonce, setNonce] = useState(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const force = useRef(false)

  useEffect(() => {
    if (!key) {
      setState({ key: null, data: null, error: '', loading: false, updatedAt: 0 })
      return
    }
    const cached = read<T>(key)
    const forced = force.current
    force.current = false
    const fresh = !!cached && Date.now() - cached.t < ttlMs && !forced
    setState({ key, data: cached?.v ?? null, error: '', loading: !fresh, updatedAt: cached?.t ?? 0 })
    if (fresh) return

    const controller = new AbortController()
    fetcherRef.current(controller.signal).then(
      (v) => {
        write(key, v)
        setState({ key, data: v, error: '', loading: false, updatedAt: Date.now() })
      },
      (err) => {
        if (controller.signal.aborted) return
        setState((s) => ({ ...s, loading: false, error: err instanceof Error ? err.message : 'Something went wrong.' }))
      },
    )
    return () => controller.abort()
  }, [key, ttlMs, nonce])

  const refresh = useCallback(() => {
    force.current = true
    setNonce((n) => n + 1)
  }, [])

  // Don't show the previous key's data for one frame while switching.
  const current = state.key === key ? state : { ...state, data: null, loading: !!key }
  return { data: current.data, error: current.error, loading: current.loading, updatedAt: current.updatedAt, refresh }
}
