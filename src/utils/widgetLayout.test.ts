import { describe, expect, it } from 'vitest'
import { WIDGET_CATALOG } from '@/config/widgetCatalog'
import { DEFAULT_WIDGETS } from '@/config/defaults'
import type { LayoutMode, WidgetPlacement } from '@/types'
import {
  breakpointFor,
  compactVertical,
  constraintsFor,
  GRID_BREAKPOINT_KEYS,
  GRID_COLS,
  materialize,
  nudgeWidget,
  settleResize,
  visibleGridIds,
} from './widgetLayout'

const MODES: LayoutMode[] = ['detailed', 'compact', 'focus']

const collide = (a: WidgetPlacement, b: WidgetPlacement) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

function expectSound(items: WidgetPlacement[], cols: number) {
  for (const [index, item] of items.entries()) {
    const limits = constraintsFor(item.i, cols)
    expect(item.x, item.i).toBeGreaterThanOrEqual(0)
    expect(item.x + item.w, item.i).toBeLessThanOrEqual(cols)
    expect(item.w, item.i).toBeGreaterThanOrEqual(limits.minW)
    expect(item.w, item.i).toBeLessThanOrEqual(limits.maxW)
    expect(item.h, item.i).toBeGreaterThanOrEqual(limits.minH)
    expect(item.h, item.i).toBeLessThanOrEqual(limits.maxH)
    for (const other of items.slice(index + 1)) expect(collide(item, other), `${item.i} overlaps ${other.i}`).toBe(false)
  }
}

/** Every row band that holds a widget is covered edge to edge, unless its widgets are already as wide as they may be. */
function expectRowsFilled(items: WidgetPlacement[], cols: number) {
  const bottom = Math.max(...items.map((item) => item.y + item.h))
  for (let y = 0; y < bottom; y++) {
    const row = items.filter((item) => item.y <= y && item.y + item.h > y)
    const covered = row.reduce((sum, item) => sum + item.w, 0)
    if (row.every((item) => item.w === constraintsFor(item.i, cols).maxW)) continue
    expect(covered, `row ${y}`).toBe(cols)
  }
}

describe('widget catalog', () => {
  it('has unique keys and sane size limits', () => {
    expect(new Set(WIDGET_CATALOG.map((w) => w.key)).size).toBe(WIDGET_CATALOG.length)
    for (const { key, spec } of WIDGET_CATALOG) {
      expect(spec.minW, key).toBeLessThanOrEqual(spec.w)
      expect(spec.w, key).toBeLessThanOrEqual(spec.maxW)
      expect(spec.minH, key).toBeLessThanOrEqual(spec.h)
      expect(spec.h, key).toBeLessThanOrEqual(spec.maxH)
    }
  })

  it('shows only the core widgets out of the box', () => {
    expect(Object.entries(DEFAULT_WIDGETS).filter(([, on]) => on).map(([key]) => key).sort()).toEqual(['clock', 'quickApps', 'quotes', 'search', 'weather'])
    expect(WIDGET_CATALOG.filter((w) => !w.optional).map((w) => w.key).sort()).toEqual(['clock', 'quickApps', 'quotes', 'search', 'weather'])
  })

  it('keeps core widgets on the dashboard even if their switch was turned off', () => {
    const ids = visibleGridIds('detailed', { ...DEFAULT_WIDGETS, clock: false, quotes: false, github: true }, [])
    expect(ids).toEqual(expect.arrayContaining(['clock', 'quotes', 'github']))
    expect(ids).not.toContain('pomodoro')
  })
})

describe('default layouts', () => {
  for (const mode of MODES) {
    it(`${mode} is sound at every breakpoint${mode === 'focus' ? ' and centred' : ' and fills every row'}`, () => {
      const ids = visibleGridIds(mode, { ...DEFAULT_WIDGETS, pomodoro: mode === 'focus' }, [])
      const layouts = materialize({}, mode, ids, [])
      for (const bp of GRID_BREAKPOINT_KEYS) {
        const items = layouts[bp]
        const cols = GRID_COLS[bp]
        expect(items.map((item) => item.i).sort()).toEqual([...ids].sort())
        expectSound(items, cols)
        if (mode !== 'focus') expectRowsFilled(items, cols)
        else for (const item of items) expect(Math.abs(item.x - (cols - item.x - item.w)), item.i).toBeLessThanOrEqual(1)
      }
    })
  }

  it('fills the row when extra widgets are added without a designed spot', () => {
    const ids = visibleGridIds('detailed', { ...DEFAULT_WIDGETS, github: true, pomodoro: true, tabStash: true }, [])
    const items = materialize({}, 'detailed', ids, []).lg
    expectSound(items, 12)
    expectRowsFilled(items, 12)
  })

  it('keeps saved positions per mode, so a trip through Focus changes nothing', () => {
    const ids = visibleGridIds('detailed', DEFAULT_WIDGETS, [])
    const custom = materialize({}, 'detailed', ids, [])
    custom.lg = settleResize(custom.lg, 'clock', { w: 6, h: 7 }, 12)
    const saved = { detailed: custom }
    materialize(saved, 'focus', visibleGridIds('focus', DEFAULT_WIDGETS, []), [])
    expect(materialize(saved, 'detailed', ids, []).lg).toEqual(custom.lg)
  })
})

describe('breakpointFor', () => {
  it('matches the grid thresholds', () => {
    expect(breakpointFor(1104)).toBe('lg')
    expect(breakpointFor(1080)).toBe('md')
    expect(breakpointFor(744)).toBe('md')
    expect(breakpointFor(624)).toBe('sm')
  })
})

describe('compactVertical', () => {
  it('lifts widgets into holes and separates overlaps', () => {
    const out = compactVertical([
      { i: 'clock', x: 0, y: 5, w: 6, h: 4 },
      { i: 'weather', x: 0, y: 6, w: 6, h: 4 },
    ])
    expect(out).toEqual([
      { i: 'clock', x: 0, y: 0, w: 6, h: 4 },
      { i: 'weather', x: 0, y: 4, w: 6, h: 4 },
    ])
  })
})

describe('settleResize', () => {
  const base = () => materialize({}, 'detailed', visibleGridIds('detailed', DEFAULT_WIDGETS, []), []).lg

  it('takes width from the neighbour so the row stays full', () => {
    const out = settleResize(base(), 'clock', { w: 8, h: 7 }, 12)
    const clock = out.find((i) => i.i === 'clock')!
    const weather = out.find((i) => i.i === 'weather')!
    expect(clock.w).toBe(8)
    expect(weather).toMatchObject({ x: 8, w: 4 })
    expectSound(out, 12)
    expectRowsFilled(out, 12)
  })

  it('gives width back to the neighbour when shrinking', () => {
    const out = settleResize(base(), 'clock', { w: 6, h: 7 }, 12)
    expect(out.find((i) => i.i === 'weather')).toMatchObject({ x: 6, w: 6 })
    expectRowsFilled(out, 12)
  })

  it('never squeezes a neighbour below its minimum', () => {
    const out = settleResize(base(), 'clock', { w: 12, h: 7 }, 12)
    const weather = out.find((i) => i.i === 'weather')!
    expect(weather.w).toBe(constraintsFor('weather', 12).minW)
    expectSound(out, 12)
    expectRowsFilled(out, 12)
  })

  it('keeps flush neighbours the same height', () => {
    const out = settleResize(base(), 'clock', { w: 7, h: 9 }, 12)
    expect(out.find((i) => i.i === 'weather')!.h).toBe(9)
    expectSound(out, 12)
    expectRowsFilled(out, 12)
  })

  it('clamps to the widget limits', () => {
    const out = settleResize(base(), 'clock', { w: 1, h: 40 }, 12)
    const clock = out.find((i) => i.i === 'clock')!
    expect(clock.w).toBe(constraintsFor('clock', 12).minW)
    expect(clock.h).toBe(constraintsFor('clock', 12).maxH)
    expectSound(out, 12)
  })
})

describe('nudgeWidget', () => {
  const base = () => materialize({}, 'detailed', visibleGridIds('detailed', DEFAULT_WIDGETS, []), []).lg

  it('swaps with the neighbour to the right', () => {
    const out = nudgeWidget(base(), 'clock', 'right', 12)
    expect(out.find((i) => i.i === 'weather')).toMatchObject({ x: 0, y: 0 })
    expect(out.find((i) => i.i === 'clock')).toMatchObject({ x: 5, y: 0 })
    expectSound(out, 12)
    expectRowsFilled(out, 12)
  })

  it('swaps rows with the widget below', () => {
    const out = nudgeWidget(base(), 'search', 'up', 12)
    expect(out.find((i) => i.i === 'search')!.y).toBe(0)
    expectSound(out, 12)
  })
})
