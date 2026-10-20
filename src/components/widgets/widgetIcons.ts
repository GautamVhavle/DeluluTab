import type { IconType } from 'react-icons'
import { Archive, Clock, Coffee, Github, Newspaper, Search, Sparkles, Spotify, Widgets } from '@/components/common/icons'
import { FaCloudSun } from 'react-icons/fa6'
import type { WidgetKey } from '@/types'

export const WIDGET_ICONS: Record<WidgetKey, IconType> = {
  clock: Clock,
  search: Search,
  aiLauncher: Sparkles,
  weather: FaCloudSun,
  news: Newspaper,
  quickApps: Widgets,
  pomodoro: Coffee,
  github: Github,
  tabStash: Archive,
  spotify: Spotify,
}
