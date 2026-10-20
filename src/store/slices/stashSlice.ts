import type { StateCreator } from 'zustand'
import { cleanStashName, cleanTabs, MAX_STASH_GROUPS } from '@/services/stash'
import type { StashGroup, StashTab } from '@/types'
import type { AppState } from '../appState'
import { newId } from './shared'

export interface StashSlice {
  /** Saved tab sessions. Local to this device (can be large). */
  stashes: StashGroup[]
  /** Saves tabs as a named group (newest first). Returns its id, or null if there was nothing to save or the limit is reached. */
  addStash: (name: string, tabs: StashTab[]) => string | null
  renameStash: (id: string, name: string) => void
  removeStash: (id: string) => void
  removeStashTab: (id: string, index: number) => void
}

export const createStashSlice: StateCreator<AppState, [], [], StashSlice> = (set, get) => ({
  stashes: [],
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
})
