/**
 * Geometry for the dashboard grid. Positions are grid units (x, y, w, h), saved per layout mode.
 * Pixel size comes from the grid component, so a saved layout stays valid when the window resizes.
 */
import { WIDGET_CATALOG, catalogByKey } from '@/config/widgetCatalog'
import { WIDGET_TEMPLATES } from '@/config/widgetTemplates'
import type { CustomWidget, GridBreakpoint, LayoutMode, ModeLayouts, WidgetKey, WidgetLayouts, WidgetPlacement, WidgetsState } from '@/types'

export const MAX_CUSTOM_WIDGETS = 8
export const MAX_WIDGET_CODE = 24_000
export const MAX_WIDGET_NAME = 40

export const GRID_BREAKPOINTS: Record<GridBreakpoint, number> = { lg: 1080, md: 720, sm: 0 }
export const GRID_COLS: Record<GridBreakpoint, number> = { lg: 12, md: 8, sm: 4 }
export const GRID_BREAKPOINT_KEYS: GridBreakpoint[] = ['lg', 'md', 'sm']

const SAFE_ID = /^[A-Za-z0-9-]{8,64}$/

export const BUILTIN_WIDGETS: { key: WidgetKey; label: string; hint: string }[] = WIDGET_CATALOG.map(({ key, label, hint }) => ({ key, label, hint }))

const CUSTOM_SPEC = { w: 4, h: 4, minW: 2, minH: 3, maxW: 12, maxH: 16 }
const FOCUS_KEYS: WidgetKey[] = WIDGET_CATALOG.filter((w) => w.focus).map((w) => w.key)

type Box = Pick<WidgetPlacement, 'x' | 'y' | 'w' | 'h'>

/**
 * Hand-set home positions. Detailed is a bento, Compact is a calm column, Focus is a centered stack.
 * Widgets without an entry (and any widget added later) land underneath, at their catalog size.
 */
const HOME: Record<LayoutMode, Record<GridBreakpoint, Partial<Record<WidgetKey, Box>>>> = {
  detailed: {
    lg: {
      clock: { x: 0, y: 0, w: 7, h: 6 },
      weather: { x: 7, y: 0, w: 5, h: 6 },
      search: { x: 0, y: 6, w: 12, h: 3 },
      quickApps: { x: 0, y: 9, w: 7, h: 5 },
      quotes: { x: 7, y: 9, w: 5, h: 5 },
    },
    md: {
      clock: { x: 0, y: 0, w: 5, h: 6 },
      weather: { x: 5, y: 0, w: 3, h: 6 },
      search: { x: 0, y: 6, w: 8, h: 3 },
      quickApps: { x: 0, y: 9, w: 8, h: 5 },
      quotes: { x: 0, y: 14, w: 8, h: 8 },
    },
    sm: {
      clock: { x: 0, y: 0, w: 4, h: 6 },
      weather: { x: 0, y: 6, w: 4, h: 6 },
      search: { x: 0, y: 12, w: 4, h: 3 },
      quickApps: { x: 0, y: 15, w: 4, h: 6 },
      quotes: { x: 0, y: 21, w: 4, h: 8 },
    },
  },
  compact: {
    lg: {
      clock: { x: 0, y: 0, w: 8, h: 6 },
      weather: { x: 8, y: 0, w: 4, h: 6 },
      search: { x: 0, y: 6, w: 12, h: 3 },
      quickApps: { x: 0, y: 9, w: 6, h: 5 },
      quotes: { x: 6, y: 9, w: 6, h: 5 },
    },
    md: {
      clock: { x: 0, y: 0, w: 5, h: 8 },
      weather: { x: 5, y: 0, w: 3, h: 8 },
      search: { x: 0, y: 8, w: 8, h: 3 },
      quickApps: { x: 0, y: 11, w: 8, h: 4 },
      quotes: { x: 0, y: 15, w: 8, h: 4 },
    },
    sm: {
      clock: { x: 0, y: 0, w: 4, h: 6 },
      weather: { x: 0, y: 6, w: 4, h: 5 },
      search: { x: 0, y: 11, w: 4, h: 3 },
      quickApps: { x: 0, y: 14, w: 4, h: 5 },
      quotes: { x: 0, y: 19, w: 4, h: 6 },
    },
  },
  focus: {
    lg: {
      clock: { x: 2, y: 0, w: 8, h: 6 },
      search: { x: 2, y: 6, w: 8, h: 3 },
      pomodoro: { x: 3, y: 9, w: 6, h: 7 },
    },
    md: {
      clock: { x: 1, y: 0, w: 6, h: 6 },
      search: { x: 0, y: 6, w: 8, h: 3 },
      pomodoro: { x: 1, y: 9, w: 6, h: 7 },
    },
    sm: {
      clock: { x: 0, y: 0, w: 4, h: 7 },
      search: { x: 0, y: 7, w: 4, h: 3 },
      pomodoro: { x: 0, y: 10, w: 4, h: 8 },
    },
  },
}

const lineTemplate = WIDGET_TEMPLATES[0]
export const CUSTOM_WIDGET_STARTER = { html: lineTemplate.html, css: lineTemplate.css, js: lineTemplate.js }

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
  // Core widgets cannot be turned off. Optional ones appear only while their switch is on.
  // News is the full-width rail under the grid, not a cell in it.
  const builtin = keys.filter((key) => key !== 'news' && (!catalogByKey(key).optional || widgets[key]))
  if (mode === 'focus') return builtin
  return [...builtin, ...custom.filter((w) => w.enabled).map((w) => customGridId(w.id))]
}

function specFor(id: string) {
  return isBuiltinGridId(id) ? catalogByKey(id).spec : CUSTOM_SPEC
}

/** The size a newly dropped widget should open at, already inside its min and max. */
export function preferredSize(id: string, cols: number) {
  const spec = specFor(id)
  const limits = constraintsFor(id, cols)
  return {
    w: clamp(spec.w, limits.minW, limits.maxW),
    h: clamp(spec.h, limits.minH, limits.maxH),
  }
}

export function constraintsFor(id: string, cols: number) {
  const spec = specFor(id)
  return {
    minW: Math.min(spec.minW, cols),
    minH: spec.minH,
    maxW: Math.min(spec.maxW, cols),
    maxH: spec.maxH,
  }
}

function spanFor(id: string, cols: number, mode: LayoutMode) {
  const spec = specFor(id)
  const limits = constraintsFor(id, cols)
  let w: number
  let h: number
  if (mode === 'focus') {
    if (id === 'clock') { w = Math.min(cols, 8); h = 6 }
    else if (id === 'search') { w = Math.min(cols, Math.max(6, cols - 2)); h = 3 }
    else if (id === 'pomodoro') { w = Math.min(cols, 6); h = 7 }
    else { w = cols; h = spec.h }
  } else {
    const scaled = Math.round(spec.w * (cols / 12))
    w = Math.min(cols, Math.max(Math.min(spec.minW, cols), scaled))
    h = mode === 'compact' ? Math.max(limits.minH, spec.h - 1) : spec.h
  }
  return { w: clamp(w, limits.minW, limits.maxW), h: clamp(h, limits.minH, limits.maxH) }
}

function overlaps(a: Box, b: Box) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function designFor(id: string, mode: LayoutMode, bp: GridBreakpoint, cols: number): WidgetPlacement | null {
  if (!isBuiltinGridId(id)) return null
  const box = HOME[mode][bp][id]
  if (!box) return null
  const limits = constraintsFor(id, cols)
  const w = clamp(box.w, limits.minW, limits.maxW)
  const h = clamp(box.h, limits.minH, limits.maxH)
  return { i: id, x: clamp(box.x, 0, Math.max(0, cols - w)), y: Math.max(0, box.y), w, h }
}

function pack(ids: string[], mode: LayoutMode, cols: number, y0: number): WidgetPlacement[] {
  if (mode === 'focus') {
    let y = y0
    return ids.map((id) => {
      const { w, h } = spanFor(id, cols, mode)
      const item = { i: id, x: Math.max(0, Math.floor((cols - w) / 2)), y, w, h }
      y += h
      return item
    })
  }
  const rows: WidgetPlacement[][] = []
  let row: WidgetPlacement[] = []
  let x = 0
  let y = y0
  const closeRow = () => {
    if (!row.length) return
    rows.push(row)
    y += Math.max(...row.map((item) => item.h))
    row = []
    x = 0
  }
  for (const id of ids) {
    const { w, h } = spanFor(id, cols, mode)
    if (x > 0 && x + w > cols) closeRow()
    row.push({ i: id, x, y, w, h })
    x += w
    if (x >= cols) closeRow()
  }
  closeRow()
  // A row that stops short of the edge looks unfinished: hand the spare columns to its widgets, and match heights.
  for (const items of rows) {
    let spare = cols - items.reduce((sum, item) => sum + item.w, 0)
    for (let k = items.length - 1; k >= 0 && spare > 0; k--) {
      const grow = Math.min(spare, constraintsFor(items[k].i, cols).maxW - items[k].w)
      if (grow <= 0) continue
      items[k].w += grow
      for (let j = k + 1; j < items.length; j++) items[j].x += grow
      spare -= grow
    }
    const tallest = Math.max(...items.map((item) => item.h))
    for (const item of items) item.h = Math.min(constraintsFor(item.i, cols).maxH, tallest)
  }
  return rows.flat()
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
  const w = clamp(raw.w, limits.minW, limits.maxW)
  const h = clamp(raw.h, limits.minH, limits.maxH)
  return {
    i: raw.i,
    x: clamp(raw.x, 0, Math.max(0, cols - w)),
    y: clamp(raw.y, 0, 200),
    w,
    h,
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
    const placed: WidgetPlacement[] = []
    const missing: string[] = []
    for (const id of visibleIds) {
      const savedItem = byId.get(id)
      if (savedItem) {
        placed.push(savedItem)
        continue
      }
      const designed = designFor(id, mode, bp, cols)
      if (designed && !placed.some((item) => overlaps(item, designed))) placed.push(designed)
      else missing.push(id)
    }
    const y0 = placed.reduce((max, item) => Math.max(max, item.y + item.h), 0)
    const packed = new Map(pack(missing, mode, cols, y0).map((item) => [item.i, item]))
    const visible = visibleIds.map((id) => placed.find((item) => item.i === id) ?? packed.get(id)!)
    const hidden = kept.filter((item) => !visibleIds.includes(item.i))
    result[bp] = [...compactVertical(visible), ...hidden]
  }
  return result
}

/** Which breakpoint the grid uses at this width. Mirrors react-grid-layout: the largest one the width exceeds. */
export function breakpointFor(width: number): GridBreakpoint {
  if (width > GRID_BREAKPOINTS.lg) return 'lg'
  if (width > GRID_BREAKPOINTS.md) return 'md'
  return 'sm'
}

/**
 * Gravity, the same rule the grid applies on screen: each widget, top to bottom, rises until it touches
 * another, and drops below anything it overlaps. The result has no overlaps and no floating holes.
 */
export function compactVertical(items: WidgetPlacement[]): WidgetPlacement[] {
  const order = [...items].sort((a, b) => a.y - b.y || a.x - b.x)
  const placed: WidgetPlacement[] = []
  for (const item of order) {
    const at = (y: number) => ({ ...item, y })
    let y = Math.max(0, item.y)
    while (placed.some((other) => overlaps(other, at(y)))) y++
    while (y > 0 && !placed.some((other) => overlaps(other, at(y - 1)))) y--
    placed.push(at(y))
  }
  const byId = new Map(placed.map((item) => [item.i, item]))
  return items.map((item) => byId.get(item.i)!)
}

const within = (inner: Box, outer: Box) => inner.y >= outer.y && inner.y + inner.h <= outer.y + outer.h

/**
 * Applies a corner drag to widget `id` without leaving the row ragged. Extra width comes from empty
 * columns first, then from neighbours in the same row (never below their minimum); width given back goes
 * to the neighbour it touches. Neighbours that were flush with the widget follow its new height.
 * Everything stays inside each widget's min and max.
 */
export function settleResize(items: WidgetPlacement[], id: string, size: { w: number; h: number }, cols: number): WidgetPlacement[] {
  const before = items.find((item) => item.i === id)
  if (!before) return items
  const next = new Map(items.map((item) => [item.i, { ...item }]))
  const me = next.get(id)!
  const limits = constraintsFor(id, cols)
  const wantW = clamp(size.w, limits.minW, limits.maxW)
  const wantH = clamp(size.h, limits.minH, limits.maxH)
  const minW = (item: WidgetPlacement) => constraintsFor(item.i, cols).minW
  const maxW = (item: WidgetPlacement) => constraintsFor(item.i, cols).maxW

  const sharesRow = (other: WidgetPlacement) => other.i !== id && other.y < before.y + before.h && other.y + other.h > before.y
  const right = items.filter((o) => sharesRow(o) && o.x >= before.x + before.w).sort((a, b) => a.x - b.x).map((o) => next.get(o.i)!)
  const left = items.filter((o) => sharesRow(o) && o.x + o.w <= before.x).sort((a, b) => b.x - a.x).map((o) => next.get(o.i)!)

  let delta = wantW - before.w
  if (delta > 0) {
    const gapRight = (right[0]?.x ?? cols) - (before.x + before.w)
    let take = Math.min(delta, gapRight)
    me.w += take
    delta -= take
    for (let k = 0; k < right.length && delta > 0; k++) {
      if (!within(right[k], before)) break
      take = Math.min(delta, right[k].w - minW(right[k]))
      if (take <= 0) continue
      for (let j = 0; j <= k; j++) right[j].x += take
      right[k].w -= take
      me.w += take
      delta -= take
    }
    const gapLeft = before.x - (left[0] ? left[0].x + left[0].w : 0)
    take = Math.min(delta, gapLeft)
    me.x -= take
    me.w += take
    delta -= take
    for (let k = 0; k < left.length && delta > 0; k++) {
      if (!within(left[k], before)) break
      take = Math.min(delta, left[k].w - minW(left[k]))
      if (take <= 0) continue
      for (let j = 0; j < k; j++) left[j].x -= take
      left[k].w -= take
      me.x -= take
      me.w += take
      delta -= take
    }
  } else if (delta < 0) {
    let spare = -delta
    me.w = wantW
    const touchingRight = right[0] && right[0].x === before.x + before.w && within(right[0], before) ? right[0] : null
    if (touchingRight) {
      const grow = Math.min(spare, maxW(touchingRight) - touchingRight.w)
      touchingRight.x -= grow
      touchingRight.w += grow
      spare -= grow
    }
    const touchingLeft = left[0] && left[0].x + left[0].w === before.x && within(left[0], before) ? left[0] : null
    if (touchingLeft && spare > 0) {
      const grow = Math.min(spare, maxW(touchingLeft) - touchingLeft.w)
      touchingLeft.w += grow
      me.x += grow
    }
  }

  if (wantH !== before.h) {
    for (const other of [...left, ...right]) {
      if (other.y !== before.y || other.h !== before.h) continue
      const bounds = constraintsFor(other.i, cols)
      other.h = clamp(wantH, bounds.minH, bounds.maxH)
    }
    me.h = wantH
  }

  return compactVertical(items.map((item) => next.get(item.i)!))
}

export type NudgeDirection = 'left' | 'right' | 'up' | 'down'

/** Keyboard move: trades places with the touching neighbour in that direction, or steps one cell into empty space. */
export function nudgeWidget(items: WidgetPlacement[], id: string, direction: NudgeDirection, cols: number): WidgetPlacement[] {
  const before = items.find((item) => item.i === id)
  if (!before) return items
  const next = new Map(items.map((item) => [item.i, { ...item }]))
  const me = next.get(id)!
  const columnsMeet = (o: Box) => o.x < before.x + before.w && o.x + o.w > before.x
  const rowsMeet = (o: Box) => o.y < before.y + before.h && o.y + o.h > before.y
  const others = items.filter((item) => item.i !== id)

  if (direction === 'up') {
    const above = others.filter((o) => columnsMeet(o) && o.y + o.h <= before.y).sort((a, b) => b.y + b.h - (a.y + a.h))[0]
    if (!above) return items
    const other = next.get(above.i)!
    me.y = above.y
    other.y = above.y + before.h
  } else if (direction === 'down') {
    const below = others.filter((o) => columnsMeet(o) && o.y >= before.y + before.h).sort((a, b) => a.y - b.y)[0]
    if (!below) return items
    const other = next.get(below.i)!
    other.y = before.y
    me.y = before.y + below.h
  } else {
    const step = direction === 'right' ? 1 : -1
    const neighbour = others
      .filter((o) => rowsMeet(o) && (step > 0 ? o.x === before.x + before.w : o.x + o.w === before.x))
      .sort((a, b) => a.y - b.y)[0]
    if (neighbour) {
      const other = next.get(neighbour.i)!
      if (step > 0) {
        other.x = before.x
        me.x = before.x + neighbour.w
      } else {
        me.x = neighbour.x
        other.x = neighbour.x + before.w
      }
      other.y = me.y = Math.min(before.y, neighbour.y)
    } else {
      const x = clamp(before.x + step, 0, cols - before.w)
      if (x === before.x) return items
      me.x = x
    }
  }
  return compactVertical(items.map((item) => next.get(item.i)!))
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
