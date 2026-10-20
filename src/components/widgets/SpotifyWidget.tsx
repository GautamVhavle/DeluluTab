import { useState } from 'react'
import { Check, Copy, Edit, ExternalLink, Spotify } from '@/components/common/icons'
import { WidgetSetup, WidgetSkeleton } from '@/components/widgets/WidgetFeedback'
import { useCachedResource } from '@/hooks/useCachedResource'
import { useIntegration } from '@/hooks/useIntegration'
import { connectSpotify, disconnectSpotify, fetchNowPlaying, isSpotifyConnected, spotifyRedirectUri } from '@/services/spotify'
import { cn } from '@/utils/cn'
import type { WidgetProps } from './types'

const TTL_MS = 15_000

function fingerprint(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0
  return hash.toString(36)
}

const clock = (ms: number) => {
  const total = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

function RedirectUri({ uri }: { uri: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="grid gap-1 text-xs text-muted-foreground">
      Redirect URI for your Spotify app
      <div className="flex items-center gap-1 rounded-md border bg-background/60 px-2 py-1">
        <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground">{uri}</code>
        <button
          type="button"
          aria-label="Copy redirect URI"
          className="rounded p-1 outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => {
            void navigator.clipboard.writeText(uri).then(() => {
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1500)
            })
          }}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
    </div>
  )
}

export function SpotifyWidget({ mode }: WidgetProps) {
  const { values, ready } = useIntegration('spotify')
  const connected = isSpotifyConnected(values)
  const [editing, setEditing] = useState(false)
  const compact = mode === 'compact'
  const redirectUri = spotifyRedirectUri()
  const { data, error, loading, refresh } = useCachedResource(
    connected && !editing ? `spotify:${fingerprint(values.clientId + values.refreshToken)}` : null,
    (signal) => fetchNowPlaying(signal),
    TTL_MS,
  )

  if (!ready) return <WidgetSkeleton label="Loading Spotify" />

  if (!connected || editing) {
    return (
      <WidgetSetup
        icon={<Spotify className="text-[#1DB954]" aria-hidden />}
        title="Spotify now playing"
        body={
          redirectUri
            ? 'Create an app at developer.spotify.com/dashboard, add the redirect URI below, then paste its Client ID. Sign-in tokens stay on this device and only go to Spotify.'
            : 'Connecting to Spotify works in the installed extension, where Chrome can open the Spotify sign-in window.'
        }
        fields={[{ key: 'clientId', label: 'Client ID', placeholder: '32-character Client ID' }]}
        initial={{ clientId: values.clientId ?? '' }}
        submitLabel="Connect Spotify"
        actions={
          editing && (
            <>
              <button type="button" className="text-xs underline underline-offset-2" onClick={() => setEditing(false)}>Cancel</button>
              <button
                type="button"
                className="text-xs text-red-500 underline underline-offset-2"
                onClick={() => {
                  void disconnectSpotify()
                  setEditing(false)
                }}
              >
                Disconnect
              </button>
            </>
          )
        }
        onSubmit={async (draft) => {
          const clientId = draft.clientId.trim()
          if (!/^[a-f0-9]{32}$/i.test(clientId)) return 'A Spotify Client ID is 32 letters and numbers.'
          if (!redirectUri) return 'Install the extension to connect Spotify.'
          await connectSpotify(clientId)
          setEditing(false)
        }}
      >
        {redirectUri && <RedirectUri uri={redirectUri} />}
      </WidgetSetup>
    )
  }

  if (!data && loading) {
    return (
      <WidgetSkeleton label="Loading what's playing">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 shrink-0 animate-pulse rounded-lg bg-foreground/10" />
          <div className="grid flex-1 gap-2">
            <div className="h-3 w-2/3 animate-pulse rounded-full bg-foreground/10" />
            <div className="h-3 w-1/2 animate-pulse rounded-full bg-foreground/10" />
          </div>
        </div>
      </WidgetSkeleton>
    )
  }

  const fraction = data && data.durationMs > 0 ? Math.min(1, data.progressMs / data.durationMs) : 0

  return (
    <div className="flex h-full min-h-0 flex-col justify-center gap-3">
      <div className="flex items-center justify-between gap-2 text-sm font-medium">
        <span className="flex items-center gap-2 text-muted-foreground"><Spotify className="text-[#1DB954]" aria-hidden /> Spotify</span>
        <button type="button" onClick={() => setEditing(true)} aria-label="Spotify connection" className="rounded-md p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
          <Edit className="h-3.5 w-3.5" />
        </button>
      </div>

      {error && !data && (
        <div className="grid gap-2 text-sm">
          <p role="alert" className="text-muted-foreground">{error}</p>
          <button type="button" onClick={refresh} className="w-fit text-xs underline underline-offset-2">Try again</button>
        </div>
      )}

      {data && !data.title && <p className="text-sm text-muted-foreground">Nothing is playing on Spotify right now.</p>}

      {data && data.title && (
        <div className="flex min-h-0 flex-1 items-center gap-3">
          {data.art ? (
            <img src={data.art} alt="" className={cn('shrink-0 rounded-lg object-cover shadow-md', compact ? 'h-10 w-10' : 'h-16 w-16 @[20rem]:h-20 @[20rem]:w-20')} />
          ) : (
            <div className={cn('grid shrink-0 place-items-center rounded-lg bg-foreground/10', compact ? 'h-10 w-10' : 'h-16 w-16')}><Spotify aria-hidden /></div>
          )}
          <div className="min-w-0 flex-1">
            {data.url ? (
              <a href={data.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 truncate text-sm font-medium hover:underline">
                <span className="truncate">{data.title}</span> <ExternalLink className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
              </a>
            ) : (
              <p className="truncate text-sm font-medium">{data.title}</p>
            )}
            <p className="truncate text-xs text-muted-foreground">{data.artist}{data.album ? ` · ${data.album}` : ''}</p>
            {!data.playing && <p className="mt-1 text-[11px] text-muted-foreground">Paused</p>}
            {!compact && data.durationMs > 0 && (
              <div className="mt-2">
                <div className="h-1 overflow-hidden rounded-full bg-foreground/10">
                  <div className="h-full rounded-full bg-[#1DB954]" style={{ width: `${fraction * 100}%` }} />
                </div>
                <p className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
                  <span>{clock(data.progressMs)}</span>
                  <span>{clock(data.durationMs)}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
