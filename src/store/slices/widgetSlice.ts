import type { StateCreator } from 'zustand'
import { createDefaultConfig } from '@/config/defaults'
import {
  cleanWidgetCode,
  CUSTOM_WIDGET_STARTER,
  customGridId,
  layoutsEqual,
  MAX_CUSTOM_WIDGETS,
  MAX_WIDGET_NAME,
  stripGridId,
} from '@/utils/widgetLayout'
import type { CustomWidget, LayoutMode, ModeLayouts, WidgetKey, WidgetLayouts, WidgetsState } from '@/types'
import type { AppState } from '../appState'
import { newId } from './shared'

export interface WidgetSlice {
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
  setWidgetVisible: (key: WidgetKey, visible: boolean) => void
  toggleWidget: (key: WidgetKey) => void
  setLayoutEditing: (editing: boolean) => void
  setWidgetLayouts: (mode: LayoutMode, layouts: ModeLayouts) => void
  resetWidgetLayouts: (mode?: LayoutMode) => void
  addCustomWidget: () => string | null
  updateCustomWidget: (id: string, patch: Partial<Omit<CustomWidget, 'id'>>) => void
  removeCustomWidget: (id: string) => void
  setCustomEditorId: (id: string | null) => void
}

export const createWidgetSlice: StateCreator<AppState, [], [], WidgetSlice> = (set, get) => ({
  widgets: createDefaultConfig().widgets,
  widgetLayouts: {},
  customWidgets: [],
  layoutEditing: false,
  layoutGeneration: 0,
  customEditorId: null,

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
})
