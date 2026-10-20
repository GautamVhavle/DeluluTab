import { useState } from 'react'
import type { IconType } from 'react-icons'
import {
  FaAmazon,
  FaBagShopping,
  FaBook,
  FaBookmark,
  FaBrain,
  FaBriefcase,
  FaCode,
  FaCompass,
  FaComment,
  FaDiscord,
  FaEnvelope,
  FaGamepad,
  FaGithub,
  FaGlobe,
  FaGoogle,
  FaHeart,
  FaLinkedin,
  FaMusic,
  FaNewspaper,
  FaReddit,
  FaRobot,
  FaSpotify,
  FaStackOverflow,
  FaStar,
  FaTwitch,
  FaVideo,
  FaWandMagicSparkles,
  FaWikipediaW,
  FaXTwitter,
  FaYoutube,
} from 'react-icons/fa6'
import { MdStars } from 'react-icons/md'
import { hostnameOf } from '@/lib/url'

/** Icons a shortcut can use. The keys are saved in settings, so never rename one. */
export const ICONS: Record<string, IconType> = {
  globe: FaGlobe,
  sparkles: FaWandMagicSparkles,
  github: FaGithub,
  youtube: FaYoutube,
  reddit: FaReddit,
  x: FaXTwitter,
  chatgpt: FaRobot,
  claude: FaBrain,
  gemini: MdStars,
  perplexity: FaCompass,
  google: FaGoogle,
  mail: FaEnvelope,
  linkedin: FaLinkedin,
  discord: FaDiscord,
  twitch: FaTwitch,
  spotify: FaSpotify,
  stackoverflow: FaStackOverflow,
  amazon: FaAmazon,
  wikipedia: FaWikipediaW,
  news: FaNewspaper,
  bookmark: FaBookmark,
  code: FaCode,
  star: FaStar,
  heart: FaHeart,
  music: FaMusic,
  video: FaVideo,
  gamepad: FaGamepad,
  shopping: FaBagShopping,
  book: FaBook,
  work: FaBriefcase,
  chat: FaComment,
}

export const ICON_NAMES = Object.keys(ICONS)

export const isImageUrl = (icon: string) => /^(https?:|data:image\/)/i.test(icon)

export const faviconFor = (url: string) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostnameOf(url))}&sz=64`

function Img({ src, className }: { src: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <FaGlobe className={className} />
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
  return src ? <Img key={src} src={src} className={className} /> : <FaGlobe className={className} />
}
