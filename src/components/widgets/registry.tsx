import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { WidgetKey } from '@/types'
import type { WidgetProps } from '@/types/widget'

/**
 * The only place a built-in widget is registered. The grid renders whatever is in this map,
 * so adding a widget does not require editing the grid.
 */
const load = (importer: () => Promise<Record<string, ComponentType<WidgetProps>>>, name: string) =>
  lazy(() => importer().then((module) => ({ default: module[name] as ComponentType<WidgetProps> })))

export const widgetRegistry: Record<WidgetKey, LazyExoticComponent<ComponentType<WidgetProps>>> = {
  clock: load(() => import('./ClockWidget'), 'ClockWidget'),
  search: load(() => import('./SearchBarWidget'), 'SearchBarWidget'),
  aiLauncher: load(() => import('./AiLauncherWidget'), 'AiLauncherWidget'),
  weather: load(() => import('./WeatherWidget'), 'WeatherWidget'),
  quickApps: load(() => import('./QuickAppsWidget'), 'QuickAppsWidget'),
  news: load(() => import('./NewsWidget'), 'NewsWidget'),
  quotes: load(() => import('./QuotesWidget'), 'QuotesWidget'),
  tabStash: load(() => import('./TabStashWidget'), 'TabStashWidget'),
  github: load(() => import('./GithubWidget'), 'GithubWidget'),
  pomodoro: load(() => import('./PomodoroWidget'), 'PomodoroWidget'),
  spotify: load(() => import('./SpotifyWidget'), 'SpotifyWidget'),
}
