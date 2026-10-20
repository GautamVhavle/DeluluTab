import type { StateCreator } from 'zustand'
import { createDefaultConfig } from '@/config/defaults'
import type { Chord, Folder, Shortcut } from '@/types'
import type { AppState } from '../appState'
import { moveWithinGroup, newId } from './shared'

export interface LibrarySlice {
  folders: Folder[]
  shortcuts: Shortcut[]
  chords: Chord[]
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
}

export const createLibrarySlice: StateCreator<AppState, [], [], LibrarySlice> = (set) => {
  const defaults = createDefaultConfig()
  return {
    folders: defaults.folders,
    shortcuts: defaults.shortcuts,
    chords: defaults.chords,

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
  }
}
