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
import { PlatformLogo } from '@/components/common/PlatformLogo'

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

function Img({ src, className }: { src: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <FaGlobe className={className} />
  return <img src={src} alt="" className={className} onError={() => setFailed(true)} draggable={false} />
}

/**
 * `icon` is '' (automatic: the site's official logo, see utils/getFavicon), a key of ICONS, or an image URL.
 * Anything that can't be shown falls back to a symbol, never a broken image.
 */
export function ShortcutIcon({ icon, url, className }: { icon: string; url: string; className?: string }) {
  // A pasted image wins. Otherwise always use the site's favicon, not a generic symbol.
  if (isImageUrl(icon)) return <Img key={icon} src={icon} className={className} />
  if (url.trim()) return <PlatformLogo url={url} className={className} backing size={64} />
  if (icon && ICONS[icon]) {
    const Icon = ICONS[icon]
    return <Icon className={className} />
  }
  return <FaGlobe className={className} />
}
