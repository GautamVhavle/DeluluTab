import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createSplitStorage, splitKeys, subscribeToExternalChanges } from './chromeStorage'
import type {
  Chord,
  Folder,
  Settings,
  Shortcut,
  Todo,
  WidgetKey,
  WidgetsState,
} from './types'

export * from './types'

const STORAGE_KEY = 'delulutab:store'

const newId = () => crypto.randomUUID()

export const MAX_NOTES_LENGTH = 100_000
export const MAX_TODO_LENGTH = 200

/** Swaps item `id` with its neighbour among items sharing the same group; no-op at either end. */
function moveWithinGroup<T extends { id: string }>(
  items: T[],
  id: string,
  direction: -1 | 1,
  sameGroup: (a: T, b: T) => boolean,
): T[] {
  const index = items.findIndex((x) => x.id === id)
  if (index === -1) return items
  const step = direction
  let j = index + step
  while (j >= 0 && j < items.length && !sameGroup(items[index], items[j])) j += step
  if (j < 0 || j >= items.length) return items
  const next = items.slice()
  ;[next[index], next[j]] = [next[j], next[index]]
  return next
}

const prefers12h = () => {
  try {
    return !!new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12
  } catch {
    return false
  }
}

const defaultSettings: Settings = {
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
  quickAppsTab: 'notes',
  chordTrigger: 'Backquote',
  chordWindowMs: 1000,
}

const defaultFolders: Folder[] = [{ id: 'folder-dev', title: 'Dev', icon: 'folder-code' }]

const defaultShortcuts: Shortcut[] = [
  { id: 'sc-github', title: 'GitHub', url: 'https://github.com', icon: 'github', folderId: 'folder-dev' },
  { id: 'sc-claude', title: 'Claude', url: 'https://claude.ai', icon: 'sparkles', folderId: null },
  { id: 'sc-youtube', title: 'YouTube', url: 'https://youtube.com', icon: 'youtube', folderId: null },
  { id: 'sc-gmail', title: 'Gmail', url: 'https://mail.google.com', icon: 'mail', folderId: null },
]

const defaultChords: Chord[] = [
  { id: 'chord-gh', sequence: 'gh', shortcutId: 'sc-github', enabled: true },
  { id: 'chord-cl', sequence: 'cl', shortcutId: 'sc-claude', enabled: true },
  { id: 'chord-yt', sequence: 'yt', shortcutId: 'sc-youtube', enabled: true },
  { id: 'chord-gm', sequence: 'gm', shortcutId: 'sc-gmail', enabled: true },
]

const defaultWidgets: WidgetsState = {
  clock: true,
  weather: true,
  search: true,
  aiLauncher: true,
  news: true,
  quickApps: true,
}

interface AppState {
  settings: Settings
  folders: Folder[]
  shortcuts: Shortcut[]
  chords: Chord[]
  widgets: WidgetsState
  /** Scratchpad text. Saved on every keystroke. */
  notes: string
  todos: Todo[]

  updateSettings: (patch: Partial<Settings>) => void

  addShortcut: (shortcut: Omit<Shortcut, 'id'>) => string
  updateShortcut: (id: string, patch: Partial<Omit<Shortcut, 'id'>>) => void
  removeShortcut: (id: string) => void
  /** Moves a shortcut one slot earlier (-1) or later (1) within its folder / top level. */
  reorderShortcut: (id: string, direction: -1 | 1) => void
  addFolder: (folder: Omit<Folder, 'id'>) => string
  updateFolder: (id: string, patch: Partial<Omit<Folder, 'id'>>) => void
  /** Removes the folder; its shortcuts move to the top level. */
  removeFolder: (id: string) => void
  reorderFolder: (id: string, direction: -1 | 1) => void
  toggleFolderCollapsed: (id: string) => void

  addChord: (chord: Omit<Chord, 'id'>) => string
  updateChord: (id: string, patch: Partial<Omit<Chord, 'id'>>) => void
  removeChord: (id: string) => void
  /** Assigns, changes or (with '') clears the chord for a shortcut. */
  setShortcutChord: (shortcutId: string, sequence: string) => void

  setWidgetVisible: (key: WidgetKey, visible: boolean) => void
  toggleWidget: (key: WidgetKey) => void

  setNotes: (text: string) => void
  addTodo: (text: string) => void
  toggleTodo: (id: string) => void
  removeTodo: (id: string) => void
  clearCompletedTodos: () => void

  /** Resets settings, shortcuts, chords and widgets. Never touches notes or todos. */
  resetAll: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      folders: defaultFolders,
      shortcuts: defaultShortcuts,
      chords: defaultChords,
      widgets: defaultWidgets,
      notes: '',
      todos: [],

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      addShortcut: (shortcut) => {
        const id = newId()
        set((s) => ({ shortcuts: [...s.shortcuts, { ...shortcut, id }] }))
        return id
      },
      updateShortcut: (id, patch) =>
        set((s) => ({ shortcuts: s.shortcuts.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeShortcut: (id) =>
        set((s) => ({
          shortcuts: s.shortcuts.filter((x) => x.id !== id),
          chords: s.chords.filter((c) => c.shortcutId !== id),
        })),
      reorderShortcut: (id, direction) =>
        set((s) => ({
          shortcuts: moveWithinGroup(s.shortcuts, id, direction, (a, b) => a.folderId === b.folderId),
        })),

      addFolder: (folder) => {
        const id = newId()
        set((s) => ({ folders: [...s.folders, { ...folder, id }] }))
        return id
      },
      updateFolder: (id, patch) =>
        set((s) => ({ folders: s.folders.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      reorderFolder: (id, direction) =>
        set((s) => ({ folders: moveWithinGroup(s.folders, id, direction, () => true) })),
      toggleFolderCollapsed: (id) =>
        set((s) => ({ folders: s.folders.map((f) => (f.id === id ? { ...f, collapsed: !f.collapsed } : f)) })),
      removeFolder: (id) =>
        set((s) => ({
          folders: s.folders.filter((f) => f.id !== id),
          shortcuts: s.shortcuts.map((x) => (x.folderId === id ? { ...x, folderId: null } : x)),
        })),

      addChord: (chord) => {
        const id = newId()
        set((s) => ({ chords: [...s.chords, { ...chord, id }] }))
        return id
      },
      updateChord: (id, patch) =>
        set((s) => ({ chords: s.chords.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeChord: (id) => set((s) => ({ chords: s.chords.filter((x) => x.id !== id) })),
      setShortcutChord: (shortcutId, sequence) =>
        set((s) => {
          const existing = s.chords.find((c) => c.shortcutId === shortcutId)
          if (!sequence) return { chords: s.chords.filter((c) => c.shortcutId !== shortcutId) }
          if (existing) {
            return { chords: s.chords.map((c) => (c === existing ? { ...c, sequence } : c)) }
          }
          return { chords: [...s.chords, { id: newId(), sequence, shortcutId, enabled: true }] }
        }),

      setWidgetVisible: (key, visible) => set((s) => ({ widgets: { ...s.widgets, [key]: visible } })),
      toggleWidget: (key) => set((s) => ({ widgets: { ...s.widgets, [key]: !s.widgets[key] } })),

      setNotes: (text) => set({ notes: text.slice(0, MAX_NOTES_LENGTH) }),
      addTodo: (text) => {
        const clean = text.trim().slice(0, MAX_TODO_LENGTH)
        if (!clean) return
        set((s) => ({ todos: [...s.todos, { id: newId(), text: clean, done: false, createdAt: Date.now() }] }))
      },
      toggleTodo: (id) => set((s) => ({ todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })),
      removeTodo: (id) => set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),
      clearCompletedTodos: () => set((s) => ({ todos: s.todos.filter((t) => !t.done) })),

      resetAll: () =>
        set({
          settings: defaultSettings,
          folders: defaultFolders,
          shortcuts: defaultShortcuts,
          chords: defaultChords,
          widgets: defaultWidgets,
        }),
    }),
    {
      name: STORAGE_KEY,
      version: 3,
      // v1 chords carried a URL; v2 chords point at a shortcut. Re-link by URL, drop the unmatched.
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Record<string, any>
        if (version < 2 && Array.isArray(state.chords)) {
          const href = (u: string) => {
            try { return new URL(u).href } catch { return u }
          }
          const shortcuts: Shortcut[] = state.shortcuts ?? []
          state.chords = state.chords.flatMap((c: any) => {
            if (c.shortcutId) return [c]
            const target = c.action?.type === 'open-url' ? href(c.action.url) : null
            const match = shortcuts.find((sc) => href(sc.url) === target)
            return match ? [{ id: c.id, sequence: c.sequence, shortcutId: match.id, enabled: c.enabled !== false }] : []
          })
        }
        // v3: weather/news became real widgets. If both were still at the old "off" defaults, turn them on.
        if (version < 3 && state.widgets && state.widgets.weather === false && state.widgets.news === false) {
          state.widgets = { ...state.widgets, weather: true, news: true }
        }
        return state as AppState
      },
      // Settings sync across devices; notes and todos stay on this device (chrome.storage.local, no 8KB cap).
      storage: createJSONStorage(() => createSplitStorage(['notes', 'todos'])),
      // Persist data only, never action functions.
      partialize: (s) => ({
        settings: s.settings,
        folders: s.folders,
        shortcuts: s.shortcuts,
        chords: s.chords,
        widgets: s.widgets,
        notes: s.notes,
        todos: s.todos,
      }),
      // Shallow-merge each slice so keys added in future versions get their defaults.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>
        return {
          ...current,
          ...p,
          settings: { ...current.settings, ...p.settings },
          widgets: { ...current.widgets, ...p.widgets },
        }
      },
    },
  ),
)

// Keep multiple open tabs (and other devices via sync) in step with each other.
subscribeToExternalChanges(splitKeys(STORAGE_KEY), () => void useAppStore.persist.rehydrate())
