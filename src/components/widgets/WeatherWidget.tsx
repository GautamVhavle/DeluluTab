import { useEffect, useState } from 'react'
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  LocateFixed,
  MapPin,
  Moon,
  Search,
  Sun,
  Wind,
  type IconType,
} from '@/components/common/icons'
import { useCachedResource } from '@/hooks/useCachedResource'
import { requestCurrentPosition } from '@/hooks/useGeolocation'
import {
  cityFromTimezone,
  describeWeather,
  fetchForecast,
  formatTemp,
  formatWind,
  placeFromCoords,
  searchPlaces,
  type Place,
  type WeatherKind,
} from '@/services/weather'
import { cn } from '@/utils/cn'
import { useAppStore, type TemperatureUnit } from '@/store/useAppStore'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import type { WidgetProps } from './types'

const TTL_MS = 15 * 60 * 1000

const ICONS: Record<WeatherKind, IconType> = {
  clear: Sun,
  partly: CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
}

function WeatherIcon({ code, isDay = true, className }: { code: number; isDay?: boolean; className?: string }) {
  const { kind } = describeWeather(code)
  const Icon = !isDay && kind === 'clear' ? Moon : !isDay && kind === 'partly' ? CloudMoon : ICONS[kind]
  return <Icon className={className} aria-hidden />
}

const weekday = (date: string, i: number) =>
  i === 0 ? 'Today' : new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })

function UnitToggle({ unit, onChange }: { unit: TemperatureUnit; onChange: (u: TemperatureUnit) => void }) {
  return (
    <div role="radiogroup" aria-label="Temperature unit" className="flex rounded-lg bg-secondary/70 p-0.5">
      {(['c', 'f'] as const).map((u) => (
        <button
          key={u}
          role="radio"
          aria-checked={unit === u}
          onClick={() => onChange(u)}
          className={cn(
            'rounded-md px-2 py-0.5 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            unit === u ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          °{u.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

function LocationPicker({ onPick, onUseMyLocation, onClose }: { onPick: (p: Place) => void; onUseMyLocation: () => void; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [state, setState] = useState<'idle' | 'loading' | 'empty' | 'error'>('idle')

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setState('idle')
      return
    }
    const controller = new AbortController()
    setState('loading')
    const timer = setTimeout(() => {
      searchPlaces(q, controller.signal).then(
        (places) => {
          setResults(places)
          setState(places.length ? 'idle' : 'empty')
        },
        (err) => !controller.signal.aborted && (setResults([]), setState(err?.name === 'AbortError' ? 'idle' : 'error')),
      )
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex gap-2">
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), onClose())}
          placeholder="Search for a city"
          aria-label="Search for a city"
          className="h-8"
        />
        <Button size="sm" variant="outline" onClick={onUseMyLocation} aria-label="Use my location" title="Use my location">
          <LocateFixed />
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto text-sm">
        {results.map((p) => (
          <li key={`${p.latitude},${p.longitude}`}>
            <button
              onClick={() => onPick(p)}
              className="flex w-full items-baseline gap-2 rounded-md px-2 py-1 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="font-medium">{p.name}</span>
              <span className="truncate text-xs text-muted-foreground">{p.region}</span>
            </button>
          </li>
        ))}
        {state === 'loading' && <li className="px-2 text-xs text-muted-foreground">Searching…</li>}
        {state === 'empty' && <li className="px-2 text-xs text-muted-foreground">No places match “{query.trim()}”.</li>}
        {state === 'error' && <li role="alert" className="px-2 text-xs text-red-500">Couldn't search right now. Try again.</li>}
      </ul>
    </div>
  )
}

export function WeatherWidget({ mode }: WidgetProps) {
  const unit = useAppStore((s) => s.settings.temperatureUnit)
  const location = useAppStore((s) => s.settings.weatherLocation)
  const updateSettings = useAppStore((s) => s.updateSettings)

  const [picking, setPicking] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)

  const coords = location
  const { data, error, loading, refresh } = useCachedResource(
    coords ? `weather:${coords.latitude},${coords.longitude}` : null,
    (signal) => fetchForecast(coords!.latitude, coords!.longitude, signal),
    TTL_MS,
  )

  const compact = mode === 'compact'
  const place = location?.name ?? (data ? cityFromTimezone(data.timezone) : 'Your location')
  const setUnit = (temperatureUnit: TemperatureUnit) => updateSettings({ temperatureUnit })

  const useMyLocation = () => {
    setPicking(false)
    setGeoError('')
    setGeoLoading(true)
    // Called in the click, so Brave and Chrome are allowed to show the location prompt.
    void requestCurrentPosition()
      .then(async (point) => {
        const place = await placeFromCoords(point.latitude, point.longitude).catch(() => null)
        updateSettings({
          weatherLocation: {
            name: place?.name || 'Your location',
            latitude: point.latitude,
            longitude: point.longitude,
          },
        })
      })
      .catch((err: unknown) => {
        setGeoError(err instanceof Error ? err.message : "Couldn't work out where you are.")
      })
      .finally(() => setGeoLoading(false))
  }

  if (picking) {
    return (
      <LocationPicker
        onClose={() => setPicking(false)}
        onUseMyLocation={useMyLocation}
        onPick={(p) => {
          updateSettings({ weatherLocation: { name: p.name, latitude: p.latitude, longitude: p.longitude } })
          setPicking(false)
        }}
      />
    )
  }

  // Nothing to show yet.
  if (!data) {
    const message = geoError || error
    return (
      <div className="flex h-full flex-col justify-center gap-2 text-sm" aria-busy={!message && !geoLoading}>
        {geoLoading ? (
          <p className="text-muted-foreground">Allow location in the browser prompt. The weather will use your city.</p>
        ) : message ? (
          <>
            <p role="alert" className="text-muted-foreground">{message}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={useMyLocation}>Use my location</Button>
              <Button size="sm" variant="ghost" onClick={() => setPicking(true)}>Choose a city</Button>
              {coords && <Button size="sm" variant="ghost" onClick={refresh}>Try again</Button>}
            </div>
          </>
        ) : coords ? (
          <p className="animate-pulse text-muted-foreground">Loading weather…</p>
        ) : (
          <>
            <p className="text-muted-foreground">The weather needs your city.</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={useMyLocation}>Use my location</Button>
              <Button size="sm" variant="ghost" onClick={() => setPicking(true)}>Choose a city</Button>
            </div>
          </>
        )}
      </div>
    )
  }

  const { current, daily } = data
  const { label } = describeWeather(current.code)
  const today = daily[0]

  if (compact) {
    return (
      <div className="flex h-full flex-col justify-between gap-3">
        <button
          onClick={() => setPicking(true)}
          title="Change location"
          className="truncate rounded text-left text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          {place}
        </button>
        <div>
          <WeatherIcon code={current.code} isDay={current.isDay} className="mb-2 h-8 w-8 text-amber-300" />
          <p className="text-4xl font-light tabular-nums leading-none">{formatTemp(current.temp, unit)}°</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
        <button
          onClick={() => setUnit(unit === 'c' ? 'f' : 'c')}
          aria-label={`Switch to °${unit === 'c' ? 'F' : 'C'}`}
          className="self-start rounded px-1 text-[11px] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          °{unit.toUpperCase()}
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setPicking(true)}
          title="Change location"
          className="flex min-w-0 items-center gap-1.5 rounded-md text-sm font-medium outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{place}</span>
          {location === null && <span className="shrink-0 text-[10px] font-normal uppercase tracking-wide text-muted-foreground">auto</span>}
          <Search className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
        </button>
        <UnitToggle unit={unit} onChange={setUnit} />
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <WeatherIcon code={current.code} isDay={current.isDay} className="h-11 w-11 shrink-0 text-amber-400" />
          <div>
            <p className="text-4xl font-light tabular-nums leading-none">{formatTemp(current.temp, unit)}°</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {label}
              {today && <> · H {formatTemp(today.max, unit)}° L {formatTemp(today.min, unit)}°</>}
            </p>
            <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>Feels {formatTemp(current.feelsLike, unit)}°</span>
              <span className="flex items-center gap-0.5"><Droplets className="h-3 w-3" />{Math.round(current.humidity)}%</span>
              <span className="flex items-center gap-0.5"><Wind className="h-3 w-3" />{formatWind(current.windKmh, unit)}</span>
            </p>
          </div>
        </div>

        <ul className="hidden shrink-0 gap-3 @[24rem]:flex" aria-label="Forecast">
          {daily.slice(1, 5).map((d, i) => (
            <li key={d.date} className="flex flex-col items-center gap-1 text-xs">
              <span className="text-muted-foreground">{weekday(d.date, i + 1)}</span>
              <WeatherIcon code={d.code} className="h-5 w-5" />
              <span className="tabular-nums">{formatTemp(d.max, unit)}°</span>
              <span className="tabular-nums text-muted-foreground">{formatTemp(d.min, unit)}°</span>
            </li>
          ))}
        </ul>
      </div>
      {error && <p role="alert" className="text-[11px] text-red-500">{error} Showing the last update.</p>}
      {loading && !error && <span className="sr-only">Updating weather</span>}
    </div>
  )
}
