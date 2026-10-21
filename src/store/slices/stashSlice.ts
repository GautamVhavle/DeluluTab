import type { StateCreator } from 'zustand'
import { cleanStashName, cleanTabs, MAX_STASH_GROUPS, MAX_TABS_PER_GROUP } from '@/services/stash'
import type { StashGroup, StashTab } from '@/types'
import type { AppState } from '../appState'
import { newId } from './shared'

export interface StashSlice {
  /** Saved tab sessions. Local to this device (can be large). */
  stashes: StashGroup[]
  /** Saves tabs as a named group (newest first). Returns its id, or null if there was nothing to save or the limit is reached. */
  addStash: (name: string, tabs: StashTab[]) => string | null
  /** An empty list the person can fill by hand. */
  createStash: (name: string) => string | null
  renameStash: (id: string, name: string) => void
  removeStash: (id: string) => void
  addStashTab: (id: string, tab: StashTab) => void
  updateStashTab: (id: string, index: number, tab: StashTab) => void
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
  createStash: (name) => {
    if (get().stashes.length >= MAX_STASH_GROUPS) return null
    const id = newId()
    set((s) => ({ stashes: [{ id, name: cleanStashName(name) || 'Saved tabs', createdAt: Date.now(), tabs: [] }, ...s.stashes] }))
    return id
  },
  renameStash: (id, name) => {
    const clean = cleanStashName(name)
    if (clean) set((s) => ({ stashes: s.stashes.map((g) => (g.id === id ? { ...g, name: clean } : g)) }))
  },
  removeStash: (id) => set((s) => ({ stashes: s.stashes.filter((g) => g.id !== id) })),
  addStashTab: (id, tab) => {
    const [clean] = cleanTabs([tab])
    if (!clean) return
    set((s) => ({
      stashes: s.stashes.map((g) => {
        if (g.id !== id || g.tabs.length >= MAX_TABS_PER_GROUP || g.tabs.some((item) => item.url === clean.url)) return g
        return { ...g, tabs: [...g.tabs, clean] }
      }),
    }))
  },
  updateStashTab: (id, index, tab) => {
    const [clean] = cleanTabs([tab])
    if (!clean) return
    set((s) => ({
      stashes: s.stashes.map((g) => {
        if (g.id !== id || !g.tabs[index]) return g
        if (g.tabs.some((item, i) => i !== index && item.url === clean.url)) return g
        const tabs = g.tabs.map((item, i) => (i === index ? { ...clean, ...(item.pinned ? { pinned: true } : {}) } : item))
        return { ...g, tabs }
      }),
    }))
  },
  removeStashTab: (id, index) =>
    set((s) => ({
      stashes: s.stashes.map((g) => (g.id === id ? { ...g, tabs: g.tabs.filter((_, i) => i !== index) } : g)),
    })),
})
