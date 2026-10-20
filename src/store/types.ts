export type Theme = 'dark' | 'light' | 'dynamic'
export type LayoutMode = 'compact' | 'detailed' | 'focus'
export type ClockFormat = '12h' | '24h'
export type TemperatureUnit = 'c' | 'f'
export type SearchEngineId = 'google' | 'duckduckgo' | 'bing' | 'ecosia' | 'perplexity' | 'chatgpt' | 'claude'
export type AiProviderId = 'chatgpt' | 'claude' | 'grok' | 'gemini' | 'perplexity'
export type NewsCategory = 'tech' | 'ai' | 'science' | 'world' | 'business'
export type TabTitleMode = 'name' | 'time' | 'custom'

export interface WeatherLocation {
  name: string
  latitude: number
  longitude: number
}

export type BackgroundSource = 'unsplash' | 'gradient' | 'custom'
export type BackgroundRotation = 'off' | 'newtab' | '1m' | '5m' | '15m' | '1h'

/** Physical key (a KeyboardEvent.code such as 'Backquote') that starts a chord. See lib/chords for the allowed keys. */
export type ChordTrigger = string

export interface Settings {
  theme: Theme
  layoutMode: LayoutMode
  backgroundSource: BackgroundSource
  /** Id from lib/gradients, shown when the slideshow is off. */
  gradientPreset: string
  /** Unsplash search keywords. */
  unsplashQuery: string
  backgroundRotation: BackgroundRotation
  /** Extra readability overlay on top of the adaptive one, 0-60 (%). */
  backgroundDim: number
  /** Background blur in px, 0-20. */
  backgroundBlur: number
  clockFormat: ClockFormat
  showSeconds: boolean
  /** Optional, used in the greeting. */
  userName: string
  searchEngine: SearchEngineId
  temperatureUnit: TemperatureUnit
  /** null = detect automatically with the browser's geolocation. */
  weatherLocation: WeatherLocation | null
  newsCategory: NewsCategory
  /** Preferred AI for the prompt launcher; remembered from the last one used. */
  aiProvider: AiProviderId
  /** What the browser tab says. */
  tabTitleMode: TabTitleMode
  tabTitleCustom: string
  showTabIcon: boolean
  /** Page text size in percent (85-130). */
  fontScale: number
  /** Accent color as #rrggbb, or null for the built-in violet. */
  accent: string | null
  /** Last tab open in the mini-tools drawer. */
  quickAppsTab: QuickAppsTab
  /** Public GitHub username for the activity widget ('' = not set). */
  githubUsername: string
  pomodoroWorkMin: number
  pomodoroBreakMin: number
  /** Ambient sound level, 0-100. */
  ambientVolume: number
  chordTrigger: ChordTrigger
  /** Max pause between chord keystrokes before the chord window closes. */
  chordWindowMs: number
}

export interface Shortcut {
  id: string
  title: string
  url: string
  /** '' = auto-fetched favicon, otherwise a Lucide icon name or an image URL. */
  icon: string
  /** Id of the containing Folder, or null for top level. */
  folderId: string | null
}

export interface Folder {
  id: string
  title: string
  icon: string
  /** Absent/false means expanded. */
  collapsed?: boolean
}

/** GTA-style keyboard chord: press the trigger, then type `sequence` to open the shortcut. */
export interface Chord {
  id: string
  /** 1-6 lowercase letters/digits. */
  sequence: string
  shortcutId: string
  enabled: boolean
}

export interface Todo {
  id: string
  text: string
  done: boolean
  createdAt: number
}

export interface StashTab {
  url: string
  title: string
  pinned?: boolean
}

/** A saved set of tabs ("React Work", "Travel Research"). */
export interface StashGroup {
  id: string
  name: string
  createdAt: number
  tabs: StashTab[]
}

export interface AiPreset {
  id: string
  label: string
  /** Text dropped into the prompt box. Ends with a blank line so you can paste straight after it. */
  text: string
}

export type QuickAppsTab = 'notes' | 'todos' | 'calc'

export type WidgetKey = 'clock' | 'weather' | 'search' | 'aiLauncher' | 'news' | 'quickApps' | 'tabStash' | 'github' | 'pomodoro'
export type WidgetsState = Record<WidgetKey, boolean>
