import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createChromeStorage, subscribeToExternalChanges } from './chromeStorage'
import type {
  Chord,
  Folder,
  Settings,
  Shortcut,
  WidgetKey,
  WidgetsState,
} from './types'

export * from './types'

const STORAGE_KEY = 'delulutab:store'

const newId = () => crypto.randomUUID()

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

const defaultSettings: Settings = {
  theme: 'dark',
  layoutMode: 'detailed',
  backgroundSource: 'gradient',
  customBackgroundUrl: '',
}

const defaultFolders: Folder[] = [{ id: 'folder-dev', title: 'Dev', icon: 'folder-code' }]

const defaultShortcuts: Shortcut[] = [
  { id: 'sc-github', title: 'GitHub', url: 'https://github.com', icon: 'github', folderId: 'folder-dev' },
  { id: 'sc-claude', title: 'Claude', url: 'https://claude.ai', icon: 'sparkles', folderId: null },
  { id: 'sc-youtube', title: 'YouTube', url: 'https://youtube.com', icon: 'youtube', folderId: null },
  { id: 'sc-gmail', title: 'Gmail', url: 'https://mail.google.com', icon: 'mail', folderId: null },
]

const defaultChords: Chord[] = [
  { id: 'chord-gh', sequence: 'gh', action: { type: 'open-url', url: 'https://github.com' }, enabled: true },
]

const defaultWidgets: WidgetsState = {
  clock: true,
  weather: false,
  search: true,
  news: false,
  quickApps: true,
}

interface AppState {
  settings: Settings
  folders: Folder[]
  shortcuts: Shortcut[]
  chords: Chord[]
  widgets: WidgetsState

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

  setWidgetVisible: (key: WidgetKey, visible: boolean) => void
  toggleWidget: (key: WidgetKey) => void

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

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      addShortcut: (shortcut) => {
        const id = newId()
        set((s) => ({ shortcuts: [...s.shortcuts, { ...shortcut, id }] }))
        return id
      },
      updateShortcut: (id, patch) =>
        set((s) => ({ shortcuts: s.shortcuts.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeShortcut: (id) => set((s) => ({ shortcuts: s.shortcuts.filter((x) => x.id !== id) })),
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

      setWidgetVisible: (key, visible) => set((s) => ({ widgets: { ...s.widgets, [key]: visible } })),
      toggleWidget: (key) => set((s) => ({ widgets: { ...s.widgets, [key]: !s.widgets[key] } })),

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
      version: 1,
      storage: createJSONStorage(() => createChromeStorage('sync')),
      // Persist data only, never action functions.
      partialize: (s) => ({
        settings: s.settings,
        folders: s.folders,
        shortcuts: s.shortcuts,
        chords: s.chords,
        widgets: s.widgets,
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
subscribeToExternalChanges(STORAGE_KEY, () => void useAppStore.persist.rehydrate())
