import { useState } from 'react'
import {
  Bookmark,
  BookOpen,
  Briefcase,
  Code,
  Gamepad2,
  Github,
  Globe,
  Heart,
  Mail,
  MessageSquare,
  Music,
  ShoppingBag,
  Sparkles,
  Star,
  Video,
  Youtube,
  type LucideIcon,
} from 'lucide-react'
import { hostnameOf } from '@/lib/url'

export const ICONS: Record<string, LucideIcon> = {
  globe: Globe,
  sparkles: Sparkles,
  github: Github,
  youtube: Youtube,
  mail: Mail,
  bookmark: Bookmark,
  code: Code,
  star: Star,
  heart: Heart,
  music: Music,
  video: Video,
  gamepad: Gamepad2,
  shopping: ShoppingBag,
  book: BookOpen,
  work: Briefcase,
  chat: MessageSquare,
}

export const ICON_NAMES = Object.keys(ICONS)

export const isImageUrl = (icon: string) => /^(https?:|data:image\/)/i.test(icon)

export const faviconFor = (url: string) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostnameOf(url))}&sz=64`

function Img({ src, className }: { src: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <Globe className={className} />
  return <img src={src} alt="" className={className} onError={() => setFailed(true)} draggable={false} />
}

/**
 * `icon` is '' (auto favicon of `url`), a key of ICONS, or an image URL.
 * Falls back to a globe if an image fails to load.
 */
export function ShortcutIcon({ icon, url, className }: { icon: string; url: string; className?: string }) {
  if (icon && ICONS[icon]) {
    const Icon = ICONS[icon]
    return <Icon className={className} />
  }
  const src = isImageUrl(icon) ? icon : icon === '' ? faviconFor(url) : null
  // key resets the failed state when the source changes (e.g. while editing)
  return src ? <Img key={src} src={src} className={className} /> : <Globe className={className} />
}
