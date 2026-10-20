export type Theme = 'dark' | 'light' | 'dynamic'
export type LayoutMode = 'compact' | 'detailed' | 'focus'
export type BackgroundSource = 'unsplash' | 'gradient' | 'custom'

export interface Settings {
  theme: Theme
  layoutMode: LayoutMode
  backgroundSource: BackgroundSource
  /** Image URL, only used when backgroundSource === 'custom'. */
  customBackgroundUrl: string
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

/** GTA-style keyboard chord: type `sequence` (e.g. "gh") to trigger `action`. */
export interface Chord {
  id: string
  sequence: string
  action: { type: 'open-url'; url: string } | { type: 'custom'; name: string }
  enabled: boolean
}

export type WidgetKey = 'clock' | 'weather' | 'search' | 'news' | 'quickApps'
export type WidgetsState = Record<WidgetKey, boolean>
