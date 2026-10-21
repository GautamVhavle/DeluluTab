export type Theme = 'dark' | 'light' | 'dynamic'
export type LayoutMode = 'compact' | 'detailed' | 'focus'
/** Where the command bar sends the query: a web search, or an AI chat. */
export type CommandMode = 'web' | 'ai'
export type ClockFormat = '12h' | '24h'
export type TemperatureUnit = 'c' | 'f'
export type SearchEngineId = 'google' | 'duckduckgo' | 'bing' | 'brave' | 'perplexity' | 'chatgpt' | 'claude'
export type AiProviderId = 'chatgpt' | 'claude' | 'grok' | 'gemini' | 'perplexity'
export type NewsCategory = 'tech' | 'ai' | 'science' | 'world' | 'business'
export type FontId = 'inter' | 'jetbrains' | 'outfit' | 'space-grotesk' | 'cinzel'
export type ClockStyle = 'digital' | 'flip' | 'analog' | 'world'
export type ClockWeight = 'lighter' | 'light' | 'normal' | 'bold' | 'bolder' | 'boldest'
export type ClockFont = 'sans' | 'serif' | 'mono'
export type ClockTracking = 'tight' | 'normal' | 'wide'
/** Parts of the day a greeting can speak to. */
export type GreetingPeriod = 'late' | 'morning' | 'afternoon' | 'evening' | 'night'
/** Lines for each part of the day. */
export type GreetingBook = Record<GreetingPeriod, string[]>
/** Where the quote widget reads from. */
export type QuoteSource = 'builtin' | 'classics' | 'custom' | 'zenquotes' | 'quotable' | 'url'
export type TabTitleMode = 'name' | 'time' | 'custom'

export interface WeatherLocation {
  name: string
  latitude: number
  longitude: number
}

export type BackgroundSource = 'gradient' | 'custom' | 'video' | 'solid'
/** Motion on a solid colour. Still is flat. Fade and breathe move between two colours the person picks. */
export type SolidEffect = 'still' | 'fade' | 'breathe'
export type BackgroundRotation = 'off' | 'newtab' | '1m' | '5m' | '15m' | '1h'

/** Physical key (a KeyboardEvent.code such as 'Backquote') that starts a chord. See utils/chords for the allowed keys. */
export type ChordTrigger = string

export interface Settings {
  theme: Theme
  layoutMode: LayoutMode
  backgroundSource: BackgroundSource
  /** Id from config/gradients, shown when the slideshow is off. */
  gradientPreset: string
  /** Custom stops for the living gradient. Empty means the preset's own colours. */
  gradientColors: string[]
  /** Id from config/ambientVideos, shown when the background is a live scene. */
  ambientVideo: string
  /** HTTPS picture, or JSON with a url, shown with uploads. Empty uses the saved images. */
  imageLink: string
  /** Flat colour shown when the background is solid. */
  solidColor: string
  /** How that colour moves. */
  solidEffect: SolidEffect
  /** The second colour fade and breathe move toward. */
  solidEffectColor: string
  /** Colours the person saved, on top of the built-in ones. */
  solidCustom: string[]
  backgroundRotation: BackgroundRotation
  /** Extra readability overlay on top of the adaptive one, 0-60 (%). */
  backgroundDim: number
  /** Background blur in px, 0-20. */
  backgroundBlur: number
  clockFormat: ClockFormat
  showSeconds: boolean
  /** Optional, used in the greeting. */
  userName: string
  /** Custom lines for each part of the day. Null keeps the built-in greetings. */
  greetings: GreetingBook | null
  /** Name in the header and on the browser tab. Empty keeps DeluluTab. */
  appName: string
  searchEngine: SearchEngineId
  /** Search the web, or ask an AI. The bar remembers which one you used last. */
  commandMode: CommandMode
  temperatureUnit: TemperatureUnit
  /** null = detect automatically with the browser's geolocation. */
  weatherLocation: WeatherLocation | null
  newsCategory: NewsCategory
  /** Topics mixed into the bottom news rail. */
  newsTopics: NewsCategory[]
  /** Chosen provider id per topic. Missing means that topic's first provider. */
  newsProviders: Partial<Record<NewsCategory, string>>
  /** Which list the quote widget walks, one line per minute. */
  quoteSource: QuoteSource
  /** Lines the user wrote. Used when quoteSource is custom. */
  customQuotes: { text: string; by: string }[]
  /** HTTPS JSON file used when quoteSource is url. */
  quoteUrl: string
  /** Preferred AI for the prompt launcher; remembered from the last one used. */
  aiProvider: AiProviderId
  /** What the browser tab says. */
  tabTitleMode: TabTitleMode
  tabTitleCustom: string
  showTabIcon: boolean
  /** Page text size in percent (85-130). */
  fontScale: number
  /** Typeface for the whole page. */
  fontFamily: FontId
  /** Fetch website and platform logos from the web (turn off for symbols only, with no logo requests). */
  showLogos: boolean
  clockStyle: ClockStyle
  clockWeight: ClockWeight
  /** Face used for the numerals. Sans follows the page typeface. */
  clockFont: ClockFont
  clockTracking: ClockTracking
  /** Numeral color as #rrggbb, or null to follow the theme. */
  clockColor: string | null
  /** IANA zone shown next to local time by the World clock. */
  secondTimezone: string
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

export type WidgetKey = 'clock' | 'weather' | 'search' | 'aiLauncher' | 'news' | 'quotes' | 'quickApps' | 'tabStash' | 'github' | 'pomodoro' | 'spotify'
export type WidgetsState = Record<WidgetKey, boolean>

/** One cell in the dashboard grid. Coordinates are in grid units, not pixels. */
export interface WidgetPlacement {
  i: string
  x: number
  y: number
  w: number
  h: number
}

export type GridBreakpoint = 'lg' | 'md' | 'sm'
export type ModeLayouts = Record<GridBreakpoint, WidgetPlacement[]>
/** Saved per layout mode, so Detailed, Compact and Focus remember their own arrangements. */
export type WidgetLayouts = Partial<Record<LayoutMode, ModeLayouts>>

/** User-authored widget. Its code runs in a sandboxed frame, not in the extension page. */
export interface CustomWidget {
  id: string
  name: string
  html: string
  css: string
  js: string
  enabled: boolean
}

/** A user-made mini app: one HTML document, kept on this device. */
export interface MiniApp {
  id: string
  name: string
  html: string
}
