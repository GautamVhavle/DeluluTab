import { useEffect, useState } from 'react'

const KEY = 'delulutab:geo'
const MAX_AGE_MS = 24 * 60 * 60 * 1000

export interface Coords {
  latitude: number
  longitude: number
}

interface GeoState {
  coords: Coords | null
  loading: boolean
  error: string
}

const round = (n: number) => Math.round(n * 100) / 100 // ~1 km: plenty for weather, and less precise than we have to store

function readCached(): Coords | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const { t, c } = JSON.parse(raw)
    return Date.now() - t < MAX_AGE_MS ? c : null
  } catch {
    return null
  }
}

/** Browser geolocation, only requested while `enabled`. The result is cached for a day so new tabs don't re-prompt. */
export function useGeolocation(enabled: boolean, attempt = 0): GeoState {
  const [state, setState] = useState<GeoState>({ coords: null, loading: false, error: '' })

  useEffect(() => {
    if (!enabled) {
      setState({ coords: null, loading: false, error: '' })
      return
    }
    const cached = attempt === 0 ? readCached() : null
    if (cached) {
      setState({ coords: cached, loading: false, error: '' })
      return
    }
    if (!navigator.geolocation) {
      setState({ coords: null, loading: false, error: "This browser can't share your location." })
      return
    }

    let cancelled = false
    setState({ coords: null, loading: true, error: '' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return
        const coords = { latitude: round(pos.coords.latitude), longitude: round(pos.coords.longitude) }
        try {
          localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), c: coords }))
        } catch {
          // fine
        }
        setState({ coords, loading: false, error: '' })
      },
      (err) => {
        if (cancelled) return
        const error =
          err.code === err.PERMISSION_DENIED
            ? 'Location access is off for this page.'
            : "Couldn't work out where you are."
        setState({ coords: null, loading: false, error })
      },
      { timeout: 10_000, maximumAge: 60 * 60 * 1000 },
    )
    return () => {
      cancelled = true
    }
  }, [enabled, attempt])

  return state
}
