/**
 * Everything DeluluTab starts with. A fresh install, "Restore default configuration" and the backup
 * importer (for fields a file leaves out) all read from here, so there is exactly one definition of "default".
 */
import type { AiPreset, Chord, Folder, Settings, Shortcut, WidgetsState } from '@/types'

export { AI_PROVIDERS } from '@/config/aiProviders'
export { NEWS_CATEGORIES } from '@/services/news'
export { SEARCH_ENGINES } from '@/config/searchEngines'

const prefers12h = () => {
  try {
    return !!new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12
  } catch {
    return false
  }
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  layoutMode: 'detailed',
  backgroundSource: 'gradient',
  gradientPreset: 'blue-hour',
  unsplashQuery: 'nature',
  backgroundRotation: 'off',
  backgroundDim: 0,
  backgroundBlur: 0,
  clockFormat: prefers12h() ? '12h' : '24h',
  showSeconds: false,
  userName: '',
  searchEngine: 'google',
  temperatureUnit: 'c',
  weatherLocation: null,
  newsCategory: 'tech',
  aiProvider: 'chatgpt',
  tabTitleMode: 'name',
  tabTitleCustom: '',
  showTabIcon: true,
  fontScale: 100,
  fontFamily: 'inter',
  showLogos: true,
  clockStyle: 'digital',
  secondTimezone: 'UTC',
  accent: null,
  quickAppsTab: 'notes',
  githubUsername: '',
  pomodoroWorkMin: 25,
  pomodoroBreakMin: 5,
  ambientVolume: 40,
  chordTrigger: 'Backquote',
  chordWindowMs: 1000,
}

export const DEFAULT_FOLDERS: Folder[] = []

// icon '' = automatic: the platform's official logo (see utils/getFavicon), or a symbol when logos are off.
// URLs are written in canonical form (trailing slash) so exporting and re-importing them changes nothing.
export const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: 'sc-github', title: 'GitHub', url: 'https://github.com/', icon: '', folderId: null },
  { id: 'sc-youtube', title: 'YouTube', url: 'https://www.youtube.com/', icon: '', folderId: null },
  { id: 'sc-reddit', title: 'Reddit', url: 'https://www.reddit.com/', icon: '', folderId: null },
  { id: 'sc-x', title: 'X', url: 'https://x.com/', icon: '', folderId: null },
  { id: 'sc-chatgpt', title: 'ChatGPT', url: 'https://chatgpt.com/', icon: '', folderId: null },
]

/** Press the trigger, then type the code: `gh` opens GitHub, `gpt` opens ChatGPT. */
export const DEFAULT_CHORDS: Chord[] = [
  { id: 'chord-gh', sequence: 'gh', shortcutId: 'sc-github', enabled: true },
  { id: 'chord-yt', sequence: 'yt', shortcutId: 'sc-youtube', enabled: true },
  { id: 'chord-rd', sequence: 'rd', shortcutId: 'sc-reddit', enabled: true },
  { id: 'chord-x', sequence: 'x', shortcutId: 'sc-x', enabled: true },
  { id: 'chord-gpt', sequence: 'gpt', shortcutId: 'sc-chatgpt', enabled: true },
]

export const DEFAULT_WIDGETS: WidgetsState = {
  clock: true,
  weather: true,
  search: true,
  aiLauncher: true,
  news: true,
  quickApps: true,
  tabStash: true,
  github: true,
  pomodoro: true,
}

/** Quick prompts under the AI launcher. Clicking one fills the prompt box; paste your text after it. */
export const DEFAULT_AI_PRESETS: AiPreset[] = [
  { id: 'refactor', label: 'Code refactor', text: 'Refactor this code to be cleaner, more readable and more efficient. Keep the behavior identical and briefly explain each change:\n\n' },
  { id: 'summarize', label: 'Summarize text', text: 'Summarize the following text in 5 concise bullet points, then give a one-sentence takeaway:\n\n' },
  { id: 'explain', label: 'Explain concept', text: "Explain this concept as if I'm new to it. Start with a simple analogy, then give a short example:\n\n" },
  { id: 'fix-bug', label: 'Fix a bug', text: 'Find and fix the bug in this code. Explain what was wrong, then show the corrected version:\n\n' },
  { id: 'email', label: 'Write an email', text: 'Write a clear, friendly, professional email based on these points:\n\n' },
  { id: 'brainstorm', label: 'Brainstorm', text: 'Brainstorm 10 creative ideas for the following, then pick the top 3 and say why:\n\n' },
]

/** Fresh copies, so callers can never mutate the shared defaults. */
export function createDefaultConfig() {
  return {
    settings: { ...DEFAULT_SETTINGS },
    folders: DEFAULT_FOLDERS.map((f) => ({ ...f })),
    shortcuts: DEFAULT_SHORTCUTS.map((s) => ({ ...s })),
    chords: DEFAULT_CHORDS.map((c) => ({ ...c })),
    widgets: { ...DEFAULT_WIDGETS },
  }
}
