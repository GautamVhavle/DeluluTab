export type Theme = 'dark' | 'light' | 'dynamic'
export type LayoutMode = 'compact' | 'detailed' | 'focus'
export type BackgroundSource = 'unsplash' | 'gradient' | 'custom'

/** Physical key (KeyboardEvent.code) that starts a chord. */
export type ChordTrigger = 'Backquote' | 'Space' | 'Semicolon'

export interface Settings {
  theme: Theme
  layoutMode: LayoutMode
  backgroundSource: BackgroundSource
  /** Image URL, only used when backgroundSource === 'custom'. */
  customBackgroundUrl: string
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

export type WidgetKey = 'clock' | 'weather' | 'search' | 'news' | 'quickApps'
export type WidgetsState = Record<WidgetKey, boolean>
