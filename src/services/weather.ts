import type { TemperatureUnit } from '@/types'

export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm'

/** WMO weather codes as returned by Open-Meteo. */
const WMO: Record<number, [WeatherKind, string]> = {
  0: ['clear', 'Clear sky'],
  1: ['clear', 'Mostly clear'],
  2: ['partly', 'Partly cloudy'],
  3: ['cloudy', 'Overcast'],
  45: ['fog', 'Fog'],
  48: ['fog', 'Rime fog'],
  51: ['drizzle', 'Light drizzle'],
  53: ['drizzle', 'Drizzle'],
  55: ['drizzle', 'Heavy drizzle'],
  56: ['drizzle', 'Freezing drizzle'],
  57: ['drizzle', 'Freezing drizzle'],
  61: ['rain', 'Light rain'],
  63: ['rain', 'Rain'],
  65: ['rain', 'Heavy rain'],
  66: ['rain', 'Freezing rain'],
  67: ['rain', 'Freezing rain'],
  71: ['snow', 'Light snow'],
  73: ['snow', 'Snow'],
  75: ['snow', 'Heavy snow'],
  77: ['snow', 'Snow grains'],
  80: ['rain', 'Light showers'],
  81: ['rain', 'Showers'],
  82: ['rain', 'Violent showers'],
  85: ['snow', 'Snow showers'],
  86: ['snow', 'Heavy snow showers'],
  95: ['storm', 'Thunderstorm'],
  96: ['storm', 'Thunderstorm with hail'],
  99: ['storm', 'Thunderstorm with hail'],
}

export function describeWeather(code: number): { kind: WeatherKind; label: string } {
  const [kind, label] = WMO[code] ?? ['cloudy', 'Unknown']
  return { kind, label }
}

export interface Forecast {
  timezone: string
  current: { temp: number; feelsLike: number; humidity: number; windKmh: number; code: number; isDay: boolean }
  daily: { date: string; code: number; max: number; min: number }[]
}

export interface Place {
  name: string
  region: string
  latitude: number
  longitude: number
}

export class WeatherError extends Error {}

async function getJson(url: string, signal?: AbortSignal) {
  let res: Response
  try {
    res = await fetch(url, { signal })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new WeatherError("Can't reach the weather service. Check your connection.")
  }
  if (!res.ok) throw new WeatherError(`The weather service returned an error (${res.status}).`)
  return res.json()
}

/** Always fetched in °C and km/h; the unit toggle converts on screen, so switching never refetches. */
export async function fetchForecast(latitude: number, longitude: number, signal?: AbortSignal): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: '5',
  })
  const d = await getJson(`https://api.open-meteo.com/v1/forecast?${params}`, signal)
  return {
    timezone: d.timezone,
    current: {
      temp: d.current.temperature_2m,
      feelsLike: d.current.apparent_temperature,
      humidity: d.current.relative_humidity_2m,
      windKmh: d.current.wind_speed_10m,
      code: d.current.weather_code,
      isDay: d.current.is_day === 1,
    },
    daily: d.daily.time.map((date: string, i: number) => ({
      date,
      code: d.daily.weather_code[i],
      max: d.daily.temperature_2m_max[i],
      min: d.daily.temperature_2m_min[i],
    })),
  }
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ name: query, count: '5', language: 'en', format: 'json' })
  const d = await getJson(`https://geocoding-api.open-meteo.com/v1/search?${params}`, signal)
  return (d.results ?? []).map((r: any) => ({
    name: r.name,
    region: [r.admin1, r.country].filter(Boolean).join(', '),
    latitude: r.latitude,
    longitude: r.longitude,
  }))
}

export const formatTemp = (celsius: number, unit: TemperatureUnit) =>
  Math.round(unit === 'f' ? (celsius * 9) / 5 + 32 : celsius)

export const formatWind = (kmh: number, unit: TemperatureUnit) =>
  unit === 'f' ? `${Math.round(kmh * 0.621371)} mph` : `${Math.round(kmh)} km/h`

/** "Europe/Berlin" -> "Berlin": the closest thing to a place name without a reverse-geocoding service. */
export const cityFromTimezone = (tz: string) => tz.split('/').pop()?.replace(/_/g, ' ') ?? tz
