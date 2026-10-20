import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createSplitStorage, splitKeys, subscribeToExternalChanges } from './chromeStorage'
import { cleanStashName, cleanTabs, MAX_STASH_GROUPS } from '@/lib/stash'
import {
  cleanWidgetCode,
  CUSTOM_WIDGET_STARTER,
  customGridId,
  layoutsEqual,
  MAX_CUSTOM_WIDGETS,
  MAX_WIDGET_NAME,
  stripGridId,
} from '@/lib/widgetLayout'
import { createDefaultConfig } from './defaults'
import type {
  Chord,
  CustomWidget,
  Folder,
  LayoutMode,
  ModeLayouts,
  Settings,
  Shortcut,
  StashGroup,
  StashTab,
  Todo,
  WidgetKey,
  WidgetLayouts,
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

interface AppState {
  settings: Settings
  folders: Folder[]
  shortcuts: Shortcut[]
  chords: Chord[]
  widgets: WidgetsState
  /** Grid positions per layout mode. Synced; the coordinates are small. */
  widgetLayouts: WidgetLayouts
  /** User HTML/CSS/JS widgets. Local only — the code can be large, and it stays on this device. */
  customWidgets: CustomWidget[]
  /** iOS-style jiggle mode. Not saved: a new tab always opens locked. */
  layoutEditing: boolean
  /** Bumped when the saved layout is reset, so an open grid repacks. */
  layoutGeneration: number
  /** Id of the custom widget open in the editor, or null. */
  customEditorId: string | null
  /** Scratchpad text. Saved on every keystroke. */
  notes: string
  todos: Todo[]
  /** Saved tab sessions. Local to this device (can be large). */
  stashes: StashGroup[]

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
  setLayoutEditing: (editing: boolean) => void
  setWidgetLayouts: (mode: LayoutMode, layouts: ModeLayouts) => void
  resetWidgetLayouts: (mode?: LayoutMode) => void
  addCustomWidget: () => string | null
  updateCustomWidget: (id: string, patch: Partial<Omit<CustomWidget, 'id'>>) => void
  removeCustomWidget: (id: string) => void
  setCustomEditorId: (id: string | null) => void

  setNotes: (text: string) => void
  addTodo: (text: string) => void
  toggleTodo: (id: string) => void
  removeTodo: (id: string) => void
  clearCompletedTodos: () => void

  /** Saves tabs as a named group (newest first). Returns its id, or null if there was nothing to save or the limit is reached. */
  addStash: (name: string, tabs: StashTab[]) => string | null
  renameStash: (id: string, name: string) => void
  removeStash: (id: string) => void
  removeStashTab: (id: string, index: number) => void

  /** Back to the built-in configuration (settings, shortcuts, chords, widgets). Notes and tasks stay unless asked. */
  restoreDefaults: (options?: { clearNotes?: boolean }) => void
  /** Replaces the configuration with an already-validated backup (see lib/backup). */
  importConfig: (config: ImportedConfig) => void
}

export interface ImportedConfig {
  settings: Settings
  folders: Folder[]
  shortcuts: Shortcut[]
  chords: Chord[]
  widgets: WidgetsState
  widgetLayouts?: WidgetLayouts
  customWidgets?: CustomWidget[]
  notes?: string
  todos?: Todo[]
  stashes?: StashGroup[]
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...createDefaultConfig(),
      widgetLayouts: {},
      customWidgets: [],
      layoutEditing: false,
      layoutGeneration: 0,
      customEditorId: null,
      notes: '',
      todos: [],
      stashes: [],

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
      setLayoutEditing: (layoutEditing) => set({ layoutEditing }),
      setWidgetLayouts: (mode, layouts) =>
        set((s) => (layoutsEqual(s.widgetLayouts[mode], layouts) ? s : { widgetLayouts: { ...s.widgetLayouts, [mode]: layouts } })),
      resetWidgetLayouts: (mode) =>
        set((s) => {
          if (!mode) return { widgetLayouts: {}, layoutGeneration: s.layoutGeneration + 1 }
          if (!s.widgetLayouts[mode]) return { layoutGeneration: s.layoutGeneration + 1 }
          const widgetLayouts = { ...s.widgetLayouts }
          delete widgetLayouts[mode]
          return { widgetLayouts, layoutGeneration: s.layoutGeneration + 1 }
        }),
      addCustomWidget: () => {
        if (get().customWidgets.length >= MAX_CUSTOM_WIDGETS) return null
        const id = newId()
        const count = get().customWidgets.length
        const widget: CustomWidget = {
          id,
          name: count === 0 ? 'Custom widget' : `Custom widget ${count + 1}`,
          html: CUSTOM_WIDGET_STARTER.html,
          css: CUSTOM_WIDGET_STARTER.css,
          js: CUSTOM_WIDGET_STARTER.js,
          enabled: true,
        }
        set((s) => ({ customWidgets: [...s.customWidgets, widget], customEditorId: id }))
        return id
      },
      updateCustomWidget: (id, patch) =>
        set((s) => ({
          customWidgets: s.customWidgets.map((w) => {
            if (w.id !== id) return w
            return {
              ...w,
              ...patch,
              id: w.id,
              name: patch.name !== undefined ? patch.name.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, MAX_WIDGET_NAME) : w.name,
              html: patch.html !== undefined ? cleanWidgetCode(patch.html) : w.html,
              css: patch.css !== undefined ? cleanWidgetCode(patch.css) : w.css,
              js: patch.js !== undefined ? cleanWidgetCode(patch.js) : w.js,
              enabled: patch.enabled !== undefined ? !!patch.enabled : w.enabled,
            }
          }),
        })),
      removeCustomWidget: (id) =>
        set((s) => ({
          customWidgets: s.customWidgets.filter((w) => w.id !== id),
          widgetLayouts: stripGridId(s.widgetLayouts, customGridId(id)),
          customEditorId: s.customEditorId === id ? null : s.customEditorId,
        })),
      setCustomEditorId: (customEditorId) => set({ customEditorId }),

      setNotes: (text) => set({ notes: text.slice(0, MAX_NOTES_LENGTH) }),
      addTodo: (text) => {
        const clean = text.trim().slice(0, MAX_TODO_LENGTH)
        if (!clean) return
        set((s) => ({ todos: [...s.todos, { id: newId(), text: clean, done: false, createdAt: Date.now() }] }))
      },
      toggleTodo: (id) => set((s) => ({ todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })),
      removeTodo: (id) => set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),
      clearCompletedTodos: () => set((s) => ({ todos: s.todos.filter((t) => !t.done) })),

      addStash: (name, tabs) => {
        const clean = cleanTabs(tabs)
        if (clean.length === 0 || get().stashes.length >= MAX_STASH_GROUPS) return null
        const id = newId()
        set((s) => ({ stashes: [{ id, name: cleanStashName(name) || 'Saved tabs', createdAt: Date.now(), tabs: clean }, ...s.stashes] }))
        return id
      },
      renameStash: (id, name) => {
        const clean = cleanStashName(name)
        if (clean) set((s) => ({ stashes: s.stashes.map((g) => (g.id === id ? { ...g, name: clean } : g)) }))
      },
      removeStash: (id) => set((s) => ({ stashes: s.stashes.filter((g) => g.id !== id) })),
      removeStashTab: (id, index) =>
        set((s) => ({
          // A group with no tabs left is removed rather than kept empty.
          stashes: s.stashes.flatMap((g) => {
            if (g.id !== id) return [g]
            const tabs = g.tabs.filter((_, i) => i !== index)
            return tabs.length ? [{ ...g, tabs }] : []
          }),
        })),

      restoreDefaults: ({ clearNotes = false } = {}) =>
        set((s) => ({
          ...createDefaultConfig(),
          notes: clearNotes ? '' : s.notes,
          todos: clearNotes ? [] : s.todos,
          stashes: clearNotes ? [] : s.stashes,
          customWidgets: clearNotes ? [] : s.customWidgets,
          widgetLayouts: {},
          layoutEditing: false,
          layoutGeneration: s.layoutGeneration + 1,
          customEditorId: null,
        })),

      importConfig: (config) =>
        set((s) => ({
          settings: config.settings,
          folders: config.folders,
          shortcuts: config.shortcuts,
          chords: config.chords,
          widgets: config.widgets,
          widgetLayouts: config.widgetLayouts ?? s.widgetLayouts,
          customWidgets: config.customWidgets ?? s.customWidgets,
          layoutGeneration: s.layoutGeneration + 1,
          // A backup made without notes must not wipe the notes already on this device.
          notes: config.notes ?? s.notes,
          todos: config.todos ?? s.todos,
          stashes: config.stashes ?? s.stashes,
        })),
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
      storage: createJSONStorage(() => createSplitStorage(['notes', 'todos', 'stashes', 'customWidgets'])),
      // Persist data only, never action functions.
      partialize: (s) => ({
        settings: s.settings,
        folders: s.folders,
        shortcuts: s.shortcuts,
        chords: s.chords,
        widgets: s.widgets,
        widgetLayouts: s.widgetLayouts,
        customWidgets: s.customWidgets,
        notes: s.notes,
        todos: s.todos,
        stashes: s.stashes,
      }),
      // Shallow-merge each slice so keys added in future versions get their defaults.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>
        return {
          ...current,
          ...p,
          settings: { ...current.settings, ...p.settings },
          widgets: { ...current.widgets, ...p.widgets },
          widgetLayouts: p.widgetLayouts ? { ...current.widgetLayouts, ...p.widgetLayouts } : current.widgetLayouts,
          customWidgets: p.customWidgets ?? current.customWidgets,
        }
      },
    },
  ),
)

// Keep multiple open tabs (and other devices via sync) in step with each other.
subscribeToExternalChanges(splitKeys(STORAGE_KEY), () => void useAppStore.persist.rehydrate())
