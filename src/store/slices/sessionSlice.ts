import type { StateCreator } from 'zustand'
import { createDefaultConfig } from '@/config/defaults'
import type { Chord, CustomWidget, Folder, Settings, Shortcut, StashGroup, Todo, WidgetLayouts, WidgetsState } from '@/types'
import type { AppState } from '../appState'

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

export interface SessionSlice {
  /** Back to the built-in configuration (settings, shortcuts, chords, widgets). Notes and tasks stay unless asked. */
  restoreDefaults: (options?: { clearNotes?: boolean }) => void
  /** Replaces the configuration with an already-validated backup (see services/backup). */
  importConfig: (config: ImportedConfig) => void
}

export const createSessionSlice: StateCreator<AppState, [], [], SessionSlice> = (set) => ({
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
})
