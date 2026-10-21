import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { saveIntegration } from '@/services/integrations'
import { createSplitStorage, splitKeys, subscribeToExternalChanges } from '@/services/storage/chromeStorage'
import type { Shortcut } from '@/types'
import type { AppState } from './appState'
import { createLibrarySlice } from './slices/librarySlice'
import { createNotesSlice } from './slices/notesSlice'
import { createSessionSlice, type ImportedConfig } from './slices/sessionSlice'
import { createSettingsSlice } from './slices/settingsSlice'
import { MAX_NOTES_LENGTH, MAX_TODO_LENGTH } from './slices/shared'
import { createStashSlice } from './slices/stashSlice'
import { createWidgetSlice } from './slices/widgetSlice'

export type { ImportedConfig }
export { MAX_NOTES_LENGTH, MAX_TODO_LENGTH }
export type * from '@/types'

const STORAGE_KEY = 'delulutab:store'

export const useAppStore = create<AppState>()(
  persist(
    (...args) => ({
      ...createSettingsSlice(...args),
      ...createLibrarySlice(...args),
      ...createWidgetSlice(...args),
      ...createNotesSlice(...args),
      ...createStashSlice(...args),
      ...createSessionSlice(...args),
    }),
    {
      name: STORAGE_KEY,
      version: 11,
      // v1 chords carried a URL; v2 chords point at a shortcut. Re-link by URL, drop the unmatched.
      migrate: async (persisted, version) => {
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
        // v4: the GitHub username became a device-only value. Layouts, widget choices and the background
        // are the user's and are left exactly as they were; saved sizes are clamped to the new limits on load.
        if (version < 4) {
          const settings = { ...(state.settings ?? {}) }
          if (typeof settings.githubUsername === 'string' && settings.githubUsername) {
            try {
              await saveIntegration('github', { username: settings.githubUsername })
              settings.githubUsername = ''
            } catch {
              // Leave the synced username in place if local storage could not take it.
            }
          }
          state.settings = settings
        }
        if (version < 5 && state.settings?.searchEngine === 'ecosia') {
          state.settings = { ...state.settings, searchEngine: 'brave' }
        }
        if (version < 6 && state.settings?.layoutMode === 'compact') {
          state.settings = { ...state.settings, layoutMode: 'detailed' }
        }
        if (version < 7 && state.settings?.clockWeight === 'regular') {
          state.settings = { ...state.settings, clockWeight: 'normal' }
        }
        // v8: Bing and NASA daily photos are gone. A saved picture link moves to Uploads.
        if (version < 8 && state.settings) {
          const settings = { ...state.settings }
          const raw = typeof settings.dailyUrl === 'string' ? settings.dailyUrl.trim() : ''
          const url = /^https:\/\/\S{1,300}$/i.test(raw) ? raw.slice(0, 300) : ''
          if (settings.backgroundSource === 'daily') {
            settings.backgroundSource = url ? 'custom' : 'gradient'
            settings.imageLink = url
          } else if (typeof settings.imageLink !== 'string') {
            settings.imageLink = ''
          }
          delete settings.dailyUrl
          delete settings.dailyProvider
          delete settings.bingImage
          state.settings = settings
        }
        // v9: Unsplash backgrounds are gone. Anyone still on Photos falls back to the gradient.
        if (version < 9 && state.settings) {
          const settings = { ...state.settings }
          if (settings.backgroundSource === 'unsplash') settings.backgroundSource = 'gradient'
          delete settings.unsplashQuery
          state.settings = settings
        }
        // v10: a blank greeting name shows Cat. A chosen name, and the background, stay as they were.
        if (version < 10 && state.settings) {
          const settings = { ...state.settings }
          if (typeof settings.userName !== 'string' || !settings.userName.trim()) settings.userName = 'Cat'
          state.settings = settings
        }
        // v11: a new tab opens in Focus. Detailed is still one tap away.
        if (version < 11 && state.settings?.layoutMode === 'detailed') {
          state.settings = { ...state.settings, layoutMode: 'focus' }
        }
        return state as AppState
      },
      // Settings sync across devices; notes, tasks, stashes and custom widgets stay on this device.
      storage: createJSONStorage(() => createSplitStorage(['notes', 'todos', 'stashes', 'customWidgets', 'miniApps'])),
      // Persist data only, never action functions.
      partialize: (s) => ({
        settings: s.settings,
        folders: s.folders,
        shortcuts: s.shortcuts,
        chords: s.chords,
        widgets: s.widgets,
        widgetLayouts: s.widgetLayouts,
        customWidgets: s.customWidgets,
        miniApps: s.miniApps,
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
          miniApps: p.miniApps ?? current.miniApps,
        }
      },
    },
  ),
)

// Keep multiple open tabs (and other devices via sync) in step with each other.
subscribeToExternalChanges(splitKeys(STORAGE_KEY), () => void useAppStore.persist.rehydrate())
