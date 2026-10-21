/**
 * The widget catalog. This is the list a contributor edits to add a dashboard widget.
 *
 * 1. Add the id to `WidgetKey` in `src/types/index.ts`.
 * 2. Add an entry here. Leave `defaultVisible` false so a fresh tab stays quiet until the person adds it.
 * 3. Lazy-load the component in `src/components/widgets/registry.tsx`.
 *
 * The grid, the gallery and the settings switches all read this list. None of them need a new branch.
 */
import type { WidgetKey } from '@/types'

export interface WidgetSpec {
  w: number
  h: number
  minW: number
  minH: number
  maxW: number
  maxH: number
}

export interface WidgetCatalogEntry {
  key: WidgetKey
  label: string
  hint: string
  /** One line in the add-widget tray. */
  gallery: string
  /** On the home screen of a fresh install. Extra widgets stay false. */
  defaultVisible: boolean
  /** Core widgets stay on the dashboard. Only optional ones can be turned off, and the layout closes up around them. */
  optional: boolean
  /** Also shown in Focus, when the person has added it. */
  focus: boolean
  spec: WidgetSpec
  /** Set when the widget needs a value that must stay on this device (a username, a token). */
  localSetup?: string
}

export const WIDGET_CATALOG: WidgetCatalogEntry[] = [
  {
    key: 'clock',
    label: 'Clock and greeting',
    hint: 'Time, date and a hello',
    gallery: 'A large clock with a greeting',
    defaultVisible: true,
    optional: false,
    focus: true,
    spec: { w: 7, h: 7, minW: 3, minH: 4, maxW: 12, maxH: 10 },
  },
  {
    key: 'search',
    label: 'Search and ask',
    hint: 'Web search or an AI, from one bar',
    gallery: 'Search the web or ask an AI',
    defaultVisible: true,
    optional: false,
    focus: true,
    spec: { w: 12, h: 3, minW: 4, minH: 2, maxW: 12, maxH: 4 },
  },
  {
    key: 'weather',
    label: 'Weather',
    hint: 'Current conditions and a 4-day forecast',
    gallery: 'Conditions now and the next few days',
    defaultVisible: true,
    optional: false,
    focus: false,
    spec: { w: 5, h: 7, minW: 3, minH: 4, maxW: 8, maxH: 10 },
  },
  {
    key: 'quickApps',
    label: 'Quick apps',
    hint: 'Your shortcuts and folders',
    gallery: 'Shortcuts and folders',
    defaultVisible: true,
    optional: false,
    focus: false,
    spec: { w: 7, h: 8, minW: 3, minH: 4, maxW: 12, maxH: 14 },
  },
  {
    key: 'news',
    label: 'News',
    hint: 'A full-width list under the dashboard',
    gallery: 'Headlines you scroll, with photos',
    defaultVisible: false,
    optional: true,
    focus: false,
    spec: { w: 5, h: 7, minW: 3, minH: 3, maxW: 8, maxH: 14 },
  },
  {
    key: 'quotes',
    label: 'Daily quote',
    hint: 'A line to start the day',
    gallery: 'A quotation in a display face',
    defaultVisible: true,
    optional: false,
    focus: false,
    spec: { w: 5, h: 5, minW: 3, minH: 3, maxW: 8, maxH: 10 },
  },
  {
    key: 'aiLauncher',
    label: 'AI prompt launcher',
    hint: 'A larger box for prompts and presets',
    gallery: 'Prompt presets for ChatGPT, Claude, Grok, Gemini',
    defaultVisible: false,
    optional: true,
    focus: false,
    spec: { w: 6, h: 6, minW: 4, minH: 4, maxW: 12, maxH: 12 },
  },
  {
    key: 'pomodoro',
    label: 'Focus timer',
    hint: 'Pomodoro timer with ambient sounds',
    gallery: 'A focus timer with rain, cafe or noise',
    defaultVisible: false,
    optional: true,
    focus: true,
    spec: { w: 4, h: 6, minW: 3, minH: 4, maxW: 6, maxH: 10 },
  },
  {
    key: 'github',
    label: 'GitHub activity',
    hint: 'Contribution graph and recent repositories',
    gallery: 'Your contribution graph and recent repositories.',
    defaultVisible: false,
    optional: true,
    focus: false,
    localSetup: 'Asks for your GitHub username and keeps it on this device.',
    spec: { w: 6, h: 7, minW: 4, minH: 5, maxW: 12, maxH: 12 },
  },
  {
    key: 'tabStash',
    label: 'Tab stash',
    hint: 'Lists of links you can edit, save and open together',
    gallery: 'Open a list, edit its links, then restore them',
    defaultVisible: false,
    optional: true,
    focus: false,
    spec: { w: 4, h: 6, minW: 3, minH: 4, maxW: 8, maxH: 12 },
  },
  {
    key: 'spotify',
    label: 'Spotify now playing',
    hint: 'What is playing, with album art and progress',
    gallery: 'What is playing right now, with album art and progress.',
    defaultVisible: false,
    optional: true,
    focus: false,
    localSetup: 'Connects with your own Spotify app. Sign-in tokens stay on this device.',
    spec: { w: 4, h: 6, minW: 3, minH: 4, maxW: 6, maxH: 9 },
  },
]

export const catalogByKey = (key: WidgetKey) => WIDGET_CATALOG.find((w) => w.key === key)!
