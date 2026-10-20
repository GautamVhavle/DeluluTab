/**
 * Geometry for the dashboard grid. Positions are grid units (x, y, w, h), saved per layout mode.
 * Pixel size comes from the grid component, so a saved layout stays valid when the window resizes.
 */
import type { CustomWidget, GridBreakpoint, LayoutMode, ModeLayouts, WidgetKey, WidgetLayouts, WidgetPlacement, WidgetsState } from '@/store/types'

export const MAX_CUSTOM_WIDGETS = 8
export const MAX_WIDGET_CODE = 24_000
export const MAX_WIDGET_NAME = 40

export const GRID_BREAKPOINTS: Record<GridBreakpoint, number> = { lg: 1080, md: 720, sm: 0 }
export const GRID_COLS: Record<GridBreakpoint, number> = { lg: 12, md: 8, sm: 4 }
export const GRID_BREAKPOINT_KEYS: GridBreakpoint[] = ['lg', 'md', 'sm']

const SAFE_ID = /^[A-Za-z0-9-]{8,64}$/

interface WidgetSpec {
  w: number
  h: number
  minW: number
  minH: number
}

export const BUILTIN_WIDGETS: { key: WidgetKey; label: string; hint: string }[] = [
  { key: 'clock', label: 'Clock and greeting', hint: 'Time, date and a hello' },
  { key: 'search', label: 'Search bar', hint: 'Google, DuckDuckGo, Bing and more' },
  { key: 'aiLauncher', label: 'AI prompt launcher', hint: 'ChatGPT, Claude, Grok, Gemini, Perplexity' },
  { key: 'weather', label: 'Weather', hint: 'Current conditions and a 4-day forecast' },
  { key: 'news', label: 'News', hint: 'Headlines by category' },
  { key: 'quickApps', label: 'Quick apps', hint: 'Your shortcuts and folders' },
  { key: 'pomodoro', label: 'Focus timer', hint: 'Pomodoro timer with ambient sounds' },
  { key: 'github', label: 'GitHub activity', hint: 'Contribution graph and recent repositories' },
  { key: 'tabStash', label: 'Tab stash', hint: 'Save and restore sets of tabs' },
]

const SPECS: Record<WidgetKey, WidgetSpec> = {
  clock: { w: 6, h: 4, minW: 3, minH: 3 },
  search: { w: 6, h: 2, minW: 3, minH: 2 },
  aiLauncher: { w: 6, h: 4, minW: 4, minH: 3 },
  weather: { w: 4, h: 4, minW: 3, minH: 3 },
  news: { w: 4, h: 6, minW: 3, minH: 4 },
  quickApps: { w: 4, h: 6, minW: 3, minH: 4 },
  pomodoro: { w: 4, h: 5, minW: 3, minH: 4 },
  github: { w: 8, h: 5, minW: 4, minH: 4 },
  tabStash: { w: 4, h: 5, minW: 3, minH: 3 },
}

const CUSTOM_SPEC: WidgetSpec = { w: 4, h: 4, minW: 2, minH: 3 }
const FOCUS_KEYS: WidgetKey[] = ['clock', 'search', 'pomodoro']

export const CUSTOM_WIDGET_STARTER = {
  html: '<div class="box">\n  <p>Make something delulu.</p>\n</div>\n',
  css: '.box {\n  height: 100%;\n  display: grid;\n  place-items: center;\n  text-align: center;\n  padding: 1rem;\n}\n.box p {\n  margin: 0;\n  font-size: 1.25rem;\n}\n',
  js: '// Runs in a sandbox. It cannot read your notes, tabs, or the rest of DeluluTab.\n',
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

const clamp = (v: unknown, min: number, max: number) => {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, Math.round(n)))
}

export function cleanWidgetCode(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\u0000/g, '').slice(0, MAX_WIDGET_CODE) : ''
}

export function cleanWidgetName(value: unknown, fallback = 'Custom widget'): string {
  const name = typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, MAX_WIDGET_NAME) : ''
  return name || fallback
}

export const customGridId = (id: string) => `custom:${id}`

export function customIdFromGrid(gridId: string): string | null {
  if (!gridId.startsWith('custom:')) return null
  const id = gridId.slice('custom:'.length)
  return SAFE_ID.test(id) ? id : null
}

export function isBuiltinGridId(id: string): id is WidgetKey {
  return BUILTIN_WIDGETS.some((w) => w.key === id)
}

export function gridLabel(id: string, custom: CustomWidget[]): string {
  const customId = customIdFromGrid(id)
  if (customId) return custom.find((w) => w.id === customId)?.name || 'Custom widget'
  return BUILTIN_WIDGETS.find((w) => w.key === id)?.label ?? 'Widget'
}

export function visibleGridIds(mode: LayoutMode, widgets: WidgetsState, custom: CustomWidget[]): string[] {
  const keys = mode === 'focus' ? FOCUS_KEYS : BUILTIN_WIDGETS.map((w) => w.key)
  const builtin = keys.filter((key) => widgets[key])
  if (mode === 'focus') return builtin
  return [...builtin, ...custom.filter((w) => w.enabled).map((w) => customGridId(w.id))]
}

function specFor(id: string): WidgetSpec {
  return isBuiltinGridId(id) ? SPECS[id] : CUSTOM_SPEC
}

export function constraintsFor(id: string, cols: number) {
  const spec = specFor(id)
  return { minW: Math.min(spec.minW, cols), minH: spec.minH, maxW: cols, maxH: 24 }
}

function spanFor(id: string, cols: number, mode: LayoutMode) {
  const spec = specFor(id)
  if (mode === 'focus') {
    if (id === 'clock') return { w: Math.min(cols, 8), h: 5 }
    if (id === 'search') return { w: Math.min(cols, Math.max(6, cols - 2)), h: 2 }
    if (id === 'pomodoro') return { w: Math.min(cols, 6), h: 6 }
    return { w: cols, h: 4 }
  }
  const scaled = Math.round(spec.w * (cols / 12))
  const w = Math.min(cols, Math.max(Math.min(spec.minW, cols), scaled))
  const h = mode === 'compact' ? Math.max(2, spec.h - 1) : spec.h
  return { w, h }
}

function pack(ids: string[], mode: LayoutMode, cols: number, y0: number): WidgetPlacement[] {
  if (mode === 'focus' && y0 === 0) {
    let y = 0
    return ids.map((id) => {
      const { w, h } = spanFor(id, cols, mode)
      const item = { i: id, x: Math.max(0, Math.floor((cols - w) / 2)), y, w, h }
      y += h
      return item
    })
  }
  let x = 0
  let y = y0
  let rowH = 0
  const out: WidgetPlacement[] = []
  for (const id of ids) {
    const { w, h } = spanFor(id, cols, mode)
    if (x > 0 && x + w > cols) {
      y += rowH
      x = 0
      rowH = 0
    }
    out.push({ i: id, x, y, w, h })
    x += w
    rowH = Math.max(rowH, h)
    if (x >= cols) {
      y += rowH
      x = 0
      rowH = 0
    }
  }
  return out
}

function isAllowed(id: string, allowedCustom: Set<string> | null) {
  if (isBuiltinGridId(id)) return true
  const customId = customIdFromGrid(id)
  if (!customId) return false
  return allowedCustom === null || allowedCustom.has(customId)
}

export function normalizePlacement(raw: { i?: unknown; x?: unknown; y?: unknown; w?: unknown; h?: unknown }, cols: number, allowedCustom: Set<string> | null): WidgetPlacement | null {
  if (typeof raw.i !== 'string' || !isAllowed(raw.i, allowedCustom)) return null
  const limits = constraintsFor(raw.i, cols)
  return {
    i: raw.i,
    x: clamp(raw.x, 0, Math.max(0, cols - 1)),
    y: clamp(raw.y, 0, 200),
    w: clamp(raw.w, limits.minW, cols),
    h: clamp(raw.h, limits.minH, limits.maxH),
  }
}

export function emptyLayouts(): ModeLayouts {
  return { lg: [], md: [], sm: [] }
}

export function layoutSignature(layouts: ModeLayouts | undefined): string {
  if (!layouts) return ''
  return GRID_BREAKPOINT_KEYS.map((bp) =>
    [...(layouts[bp] ?? [])]
      .sort((a, b) => a.i.localeCompare(b.i))
      .map((item) => `${item.i}:${item.x},${item.y},${item.w},${item.h}`)
      .join('|'),
  ).join('||')
}

export const layoutsEqual = (a: ModeLayouts | undefined, b: ModeLayouts | undefined) => layoutSignature(a) === layoutSignature(b)

/** Fills in a preset position for any visible widget that does not have one saved yet. */
export function materialize(saved: WidgetLayouts, mode: LayoutMode, visibleIds: string[], customIds: string[]): ModeLayouts {
  const allowed = new Set(customIds)
  const result = emptyLayouts()
  for (const bp of GRID_BREAKPOINT_KEYS) {
    const cols = GRID_COLS[bp]
    const kept = (saved[mode]?.[bp] ?? []).flatMap((item) => {
      const placed = normalizePlacement(item, cols, allowed)
      return placed ? [placed] : []
    })
    const byId = new Map(kept.map((item) => [item.i, item]))
    const missing = visibleIds.filter((id) => !byId.has(id))
    const y0 = kept.filter((item) => visibleIds.includes(item.i)).reduce((max, item) => Math.max(max, item.y + item.h), 0)
    const packed = new Map(pack(missing, mode, cols, y0).map((item) => [item.i, item]))
    const visible = visibleIds.map((id) => byId.get(id) ?? packed.get(id)!)
    const hidden = kept.filter((item) => !visibleIds.includes(item.i))
    result[bp] = [...visible, ...hidden]
  }
  return result
}

export function applyIncoming(
  prev: ModeLayouts,
  incoming: Partial<Record<string, readonly { i: string; x: number; y: number; w: number; h: number }[]>>,
  customIds: readonly string[],
): ModeLayouts {
  const allowed = new Set(customIds)
  const next = emptyLayouts()
  for (const bp of GRID_BREAKPOINT_KEYS) {
    const raw = incoming[bp]
    if (!raw) {
      next[bp] = prev[bp] ?? []
      continue
    }
    const cleaned = raw.flatMap((item) => {
      const placed = normalizePlacement(item, GRID_COLS[bp], allowed)
      return placed ? [placed] : []
    })
    const seen = new Set(cleaned.map((item) => item.i))
    const leftovers = (prev[bp] ?? []).filter((item) => !seen.has(item.i) && isAllowed(item.i, allowed))
    next[bp] = [...cleaned, ...leftovers]
  }
  return next
}

export function stripGridId(layouts: WidgetLayouts, gridId: string): WidgetLayouts {
  const next: WidgetLayouts = {}
  for (const mode of ['compact', 'detailed', 'focus'] as const) {
    const block = layouts[mode]
    if (!block) continue
    next[mode] = {
      lg: (block.lg ?? []).filter((item) => item.i !== gridId),
      md: (block.md ?? []).filter((item) => item.i !== gridId),
      sm: (block.sm ?? []).filter((item) => item.i !== gridId),
    }
  }
  return next
}

export function parseStoredCustomWidgets(raw: unknown, warnings: string[]): CustomWidget[] {
  if (!Array.isArray(raw)) return []
  if (raw.length > MAX_CUSTOM_WIDGETS) warnings.push(`Only the first ${MAX_CUSTOM_WIDGETS} custom widgets were imported.`)
  const out: CustomWidget[] = []
  const seen = new Set<string>()
  let dropped = 0
  for (const item of raw.slice(0, MAX_CUSTOM_WIDGETS)) {
    if (!isObject(item)) {
      dropped++
      continue
    }
    let id = typeof item.id === 'string' && SAFE_ID.test(item.id) ? item.id : ''
    if (!id || seen.has(id)) id = crypto.randomUUID()
    seen.add(id)
    out.push({
      id,
      name: cleanWidgetName(item.name),
      html: cleanWidgetCode(item.html),
      css: cleanWidgetCode(item.css),
      js: cleanWidgetCode(item.js),
      enabled: item.enabled !== false,
    })
  }
  if (dropped) warnings.push(`${dropped} custom widget${dropped === 1 ? ' was' : 's were'} skipped because they were invalid.`)
  return out
}

export function parseStoredLayouts(raw: unknown, allowedCustom: Set<string> | null, warnings: string[]): WidgetLayouts {
  if (!isObject(raw)) return {}
  const out: WidgetLayouts = {}
  let dropped = 0
  for (const mode of ['compact', 'detailed', 'focus'] as const) {
    const block = raw[mode]
    if (!isObject(block)) continue
    const layouts = emptyLayouts()
    for (const bp of GRID_BREAKPOINT_KEYS) {
      const items = block[bp]
      if (!Array.isArray(items)) continue
      const seen = new Set<string>()
      for (const item of items.slice(0, 40)) {
        if (!isObject(item)) {
          dropped++
          continue
        }
        const placed = normalizePlacement(item, GRID_COLS[bp], allowedCustom)
        if (!placed || seen.has(placed.i)) {
          dropped++
          continue
        }
        seen.add(placed.i)
        layouts[bp].push(placed)
      }
    }
    out[mode] = layouts
  }
  if (dropped) warnings.push(`${dropped} widget position${dropped === 1 ? ' was' : 's were'} skipped because they were invalid.`)
  return out
}
