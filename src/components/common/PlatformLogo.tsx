import { useEffect, useMemo, useState } from 'react'
import type { IconType } from 'react-icons'
import { detectPlatform, fallbackSymbol, getFaviconCandidates, rememberLogo, type PlatformId } from '@/utils/getFavicon'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/store/useAppStore'

const TINT: Partial<Record<PlatformId, string>> = {
  claude: 'text-[#D97757]',
  youtube: 'text-[#FF0000]',
  gmail: 'text-[#EA4335]',
  bing: 'text-[#008373]',
  brave: 'text-[#FB542B]',
  github: 'text-foreground',
}

interface Props {
  /** A web address (or bare domain) to find the logo for. */
  url: string
  className?: string
  /** Symbol to show until the logo loads, and if it never does. Defaults to the platform's glyph or a globe. */
  fallback?: IconType
  /** Pixel size to request from the favicon service. */
  size?: number
  /**
   * Put a white chip behind the logo once it has loaded. Official logos are drawn for light backgrounds (GitHub's and
   * X's are plain black), so on a dark tile they would disappear.
   */
  backing?: boolean
}

/**
 * Shows a site's logo, trying each source in turn (see utils/getFavicon). A symbol sits underneath the whole time,
 * so there is never an empty box or a broken image, and nothing shifts when the logo arrives.
 */
export function PlatformLogo({ url, className, fallback, size = 128, backing = false }: Props) {
  const enabled = useAppStore((s) => s.settings.showLogos)
  const candidates = useMemo(() => getFaviconCandidates(url, { size, enabled }), [url, size, enabled])
  const key = candidates.join('|')
  const [index, setIndex] = useState(0)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    setIndex(0)
    setLoaded(false)
  }, [key])

  const Symbol = fallback ?? fallbackSymbol(url)
  const platform = detectPlatform(url)
  const tint = platform ? TINT[platform] : undefined
  const src = candidates[index]

  return (
    <span className={cn('relative inline-block shrink-0 align-middle transition-colors', backing && loaded && 'rounded-md bg-white shadow-sm ring-1 ring-black/5', className)}>
      <Symbol aria-hidden className={cn('absolute inset-0 h-full w-full transition-opacity', tint, loaded && 'opacity-0')} />
      {src && (
        <img
          key={src}
          src={src}
          alt=""
          draggable={false}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => {
            setLoaded(true)
            rememberLogo(url, src)
          }}
          onError={() => setIndex((i) => i + 1)}
          className={cn('absolute object-contain transition-opacity', backing && loaded ? 'inset-[12%] h-[76%] w-[76%]' : 'inset-0 h-full w-full', loaded ? 'opacity-100' : 'opacity-0')}
        />
      )}
    </span>
  )
}
