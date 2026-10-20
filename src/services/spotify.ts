/**
 * Spotify "now playing" through the PKCE sign-in flow, using a Client ID the person creates for themselves.
 * There is no DeluluTab server and no shared secret: tokens go from Spotify to chrome.storage.local and back
 * to Spotify, nowhere else. Requires the `identity` permission for chrome.identity.launchWebAuthFlow.
 */
import { loadIntegration, saveIntegration, type IntegrationValues } from '@/services/integrations'

export interface NowPlaying {
  playing: boolean
  title: string
  artist: string
  album: string
  art: string
  url: string
  progressMs: number
  durationMs: number
}

export class SpotifyError extends Error {
  constructor(message: string, readonly kind: 'auth' | 'network' | 'other') {
    super(message)
  }
}

const ID = 'spotify'
const SCOPES = 'user-read-currently-playing user-read-playback-state'
const AUTHORIZE = 'https://accounts.spotify.com/authorize'
const TOKEN = 'https://accounts.spotify.com/api/token'
const NOW_PLAYING = 'https://api.spotify.com/v1/me/player/currently-playing'

const empty: NowPlaying = { playing: false, title: '', artist: '', album: '', art: '', url: '', progressMs: 0, durationMs: 0 }

/** Where Spotify sends the person back to. Null outside the installed extension. */
export function spotifyRedirectUri(): string | null {
  try {
    return typeof chrome !== 'undefined' && chrome.identity?.getRedirectURL ? chrome.identity.getRedirectURL('spotify') : null
  } catch {
    return null
  }
}

export const isSpotifyConnected = (values: IntegrationValues) => Boolean(values.clientId && values.refreshToken)

const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

function randomString(bytes: number) {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)))
}

async function challengeFor(verifier: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(new Uint8Array(digest))
}

async function requestToken(body: Record<string, string>): Promise<IntegrationValues> {
  let res: Response
  try {
    res = await fetch(TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
    })
  } catch {
    throw new SpotifyError("Can't reach Spotify. Check your connection.", 'network')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok || typeof data.access_token !== 'string') {
    const auth = res.status === 400 || res.status === 401
    throw new SpotifyError(auth ? 'Spotify signed you out. Connect again.' : `Spotify returned an error (${res.status}).`, auth ? 'auth' : 'other')
  }
  const out: IntegrationValues = {
    accessToken: data.access_token,
    expiresAt: String(Date.now() + Math.max(60, Number(data.expires_in) || 3600) * 1000),
  }
  if (typeof data.refresh_token === 'string') out.refreshToken = data.refresh_token
  return out
}

/** Opens Spotify's consent screen, then stores the tokens on this device. */
export async function connectSpotify(clientId: string): Promise<void> {
  const redirectUri = spotifyRedirectUri()
  if (!redirectUri) throw new SpotifyError('Connecting to Spotify works in the installed extension.', 'other')
  const verifier = randomString(48)
  const state = randomString(16)
  const url = new URL(AUTHORIZE)
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: await challengeFor(verifier),
    state,
  }).toString()

  let returned: string | undefined
  try {
    returned = await chrome.identity.launchWebAuthFlow({ url: url.href, interactive: true })
  } catch (err) {
    throw new SpotifyError(`Spotify sign-in did not finish. ${(err as Error).message || ''}`.trim(), 'auth')
  }
  const params = returned ? new URL(returned).searchParams : null
  if (!params || params.get('state') !== state) throw new SpotifyError('Spotify sign-in did not finish.', 'auth')
  const code = params.get('code')
  if (!code) {
    const reason = params.get('error')
    throw new SpotifyError(reason === 'access_denied' ? 'Spotify access was declined.' : 'Spotify sign-in did not finish. Check the Client ID and redirect URI.', 'auth')
  }
  const tokens = await requestToken({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, code_verifier: verifier })
  await saveIntegration(ID, { clientId, ...tokens, token: '' })
}

export async function disconnectSpotify(): Promise<void> {
  await saveIntegration(ID, { accessToken: '', refreshToken: '', expiresAt: '', token: '' })
}

let refreshing: Promise<string> | null = null

/** A usable access token, refreshing it when it is about to run out. */
async function accessToken(force = false): Promise<string> {
  const values = await loadIntegration(ID)
  if (!isSpotifyConnected(values)) throw new SpotifyError('Connect Spotify to see what is playing.', 'auth')
  if (!force && values.accessToken && Number(values.expiresAt) - 60_000 > Date.now()) return values.accessToken
  refreshing ??= (async () => {
    try {
      const next = await requestToken({ grant_type: 'refresh_token', refresh_token: values.refreshToken, client_id: values.clientId })
      await saveIntegration(ID, next)
      return next.accessToken
    } catch (err) {
      // Another tab may have refreshed first and rotated the refresh token. Use what it saved.
      const latest = await loadIntegration(ID)
      if (latest.refreshToken !== values.refreshToken && latest.accessToken) return latest.accessToken
      if (err instanceof SpotifyError && err.kind === 'auth') await disconnectSpotify()
      throw err
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

export async function fetchNowPlaying(signal?: AbortSignal): Promise<NowPlaying> {
  const request = async (token: string) => {
    try {
      return await fetch(NOW_PLAYING, { signal, headers: { Authorization: `Bearer ${token}` } })
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err
      throw new SpotifyError("Can't reach Spotify. Check your connection.", 'network')
    }
  }
  let res = await request(await accessToken())
  if (res.status === 401) res = await request(await accessToken(true))
  if (res.status === 204 || res.status === 202) return empty
  if (res.status === 401 || res.status === 403) throw new SpotifyError('Spotify refused access. Connect again.', 'auth')
  if (res.status === 429) throw new SpotifyError('Spotify asked us to slow down. Trying again shortly.', 'other')
  if (!res.ok) throw new SpotifyError(`Spotify returned an error (${res.status}).`, 'other')
  const data = await res.json()
  const item = data?.item
  if (!item || typeof item.name !== 'string') return empty
  const artist = Array.isArray(item.artists) ? item.artists.map((a: { name?: string }) => a?.name).filter(Boolean).join(', ') : ''
  return {
    playing: data.is_playing !== false,
    title: item.name,
    artist,
    album: typeof item.album?.name === 'string' ? item.album.name : '',
    art: typeof item.album?.images?.[0]?.url === 'string' ? item.album.images[0].url : '',
    url: typeof item.external_urls?.spotify === 'string' ? item.external_urls.spotify : '',
    progressMs: Math.max(0, Number(data.progress_ms) || 0),
    durationMs: Math.max(0, Number(item.duration_ms) || 0),
  }
}
