import type { StateCreator } from 'zustand'
import { catalogByKey } from '@/config/widgetCatalog'
import { createDefaultConfig } from '@/config/defaults'
import { WIDGET_TEMPLATES } from '@/config/widgetTemplates'
import {
  cleanWidgetCode,
  customGridId,
  layoutsEqual,
  MAX_CUSTOM_WIDGETS,
  MAX_WIDGET_NAME,
  stripGridId,
} from '@/utils/widgetLayout'
import type { CustomWidget, LayoutMode, MiniApp, ModeLayouts, WidgetKey, WidgetLayouts, WidgetsState } from '@/types'
import type { AppState } from '../appState'
import { newId } from './shared'

export interface WidgetSlice {
  widgets: WidgetsState
  /** Grid positions per layout mode. Synced; the coordinates are small. */
  widgetLayouts: WidgetLayouts
  /** User HTML/CSS/JS widgets. Local only — the code can be large, and it stays on this device. */
  customWidgets: CustomWidget[]
  /** HTML mini apps shown in the launchpad. Local only. */
  miniApps: MiniApp[]
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
  addCustomWidget: (templateId?: string) => string | null
  updateCustomWidget: (id: string, patch: Partial<Omit<CustomWidget, 'id'>>) => void
  removeCustomWidget: (id: string) => void
  setCustomEditorId: (id: string | null) => void
  addMiniApp: (app: { name: string; html: string }) => string | null
  updateMiniApp: (id: string, patch: Partial<Omit<MiniApp, 'id'>>) => void
  removeMiniApp: (id: string) => void
}

export const createWidgetSlice: StateCreator<AppState, [], [], WidgetSlice> = (set, get) => ({
  widgets: createDefaultConfig().widgets,
  widgetLayouts: {},
  customWidgets: [],
  miniApps: [],
  layoutEditing: false,
  layoutGeneration: 0,
  customEditorId: null,

  setWidgetVisible: (key, visible) =>
    set((s) => (visible || catalogByKey(key).optional ? { widgets: { ...s.widgets, [key]: visible } } : s)),
  toggleWidget: (key) => set((s) => (s.widgets[key] && !catalogByKey(key).optional ? s : { widgets: { ...s.widgets, [key]: !s.widgets[key] } })),
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
  addCustomWidget: (templateId) => {
    if (get().customWidgets.length >= MAX_CUSTOM_WIDGETS) return null
    const template = WIDGET_TEMPLATES.find((item) => item.id === templateId) ?? WIDGET_TEMPLATES[0]
    const id = newId()
    const taken = new Set(get().customWidgets.map((widget) => widget.name))
    let name = template.name
    let n = 2
    while (taken.has(name)) {
      name = `${template.name} ${n}`
      n += 1
    }
    const widget: CustomWidget = {
      id,
      name: name.slice(0, MAX_WIDGET_NAME),
      html: template.html,
      css: template.css,
      js: template.js,
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
  addMiniApp: ({ name, html }) => {
    if (get().miniApps.length >= 12) return null
    const id = newId()
    const app: MiniApp = {
      id,
      name: name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 40) || 'Mini app',
      html: html.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, 20_000),
    }
    set((s) => ({ miniApps: [...s.miniApps, app] }))
    return id
  },
  updateMiniApp: (id, patch) =>
    set((s) => ({
      miniApps: s.miniApps.map((app) => {
        if (app.id !== id) return app
        return {
          ...app,
          name: patch.name !== undefined ? patch.name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 40) || 'Mini app' : app.name,
          html: patch.html !== undefined ? patch.html.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, 20_000) : app.html,
        }
      }),
    })),
  removeMiniApp: (id) => set((s) => ({ miniApps: s.miniApps.filter((app) => app.id !== id) })),
})
