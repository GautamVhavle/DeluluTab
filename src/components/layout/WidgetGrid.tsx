import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout/legacy'
import { Code, Grip, Minus } from '@/components/common/icons'
import { cn } from '@/utils/cn'
import {
  breakpointFor,
  compactVertical,
  constraintsFor,
  customIdFromGrid,
  GRID_BREAKPOINTS,
  GRID_COLS,
  GRID_BREAKPOINT_KEYS,
  gridLabel,
  isBuiltinGridId,
  layoutsEqual,
  materialize,
  normalizePlacement,
  nudgeWidget,
  preferredSize,
  settleResize,
  visibleGridIds,
  type NudgeDirection,
} from '@/utils/widgetLayout'
import { useAppStore, type GridBreakpoint, type LayoutMode, type ModeLayouts, type WidgetPlacement } from '@/store/useAppStore'
import { Button } from '@/components/common/button'
import { WidgetBoundary } from '@/components/common/WidgetBoundary'
import { CustomCodeWidget } from '@/components/widgets/CustomCodeWidget'
import { widgetRegistry } from '@/components/widgets/registry'
import { WidgetGallery } from '@/components/widgets/WidgetGallery'
import { draggingWidget, setDraggingWidget } from '@/components/widgets/widgetDrag'
import { WidgetSkeleton } from '@/components/widgets/WidgetFeedback'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const Grid = WidthProvider(Responsive)

const ROW_HEIGHT: Record<LayoutMode, number> = { detailed: 28, compact: 22, focus: 34 }
const MARGIN: Record<LayoutMode, readonly [number, number]> = {
  detailed: [16, 16],
  compact: [8, 8],
  focus: [18, 18],
}
const WRAPPER: Record<LayoutMode, string> = {
  detailed: 'max-w-6xl px-4 sm:px-6',
  compact: 'max-w-3xl px-3',
  focus: 'max-w-2xl px-6',
}
const CARD: Record<LayoutMode, string> = {
  detailed: 'rounded-2xl border border-white/25 bg-white/55 p-4 shadow-lg shadow-black/10 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] sm:p-5',
  compact: 'rounded-xl border border-white/20 bg-white/55 p-3 shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]',
  focus: 'rounded-2xl border border-transparent bg-transparent p-0 shadow-none',
}
const MODE_LABEL: Record<LayoutMode, string> = { detailed: 'Detailed', compact: 'Compact', focus: 'Focus' }
const DROPPING_ID = '__dropping__'
const ARROWS: Record<string, NudgeDirection> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }

type KeyMove = (id: string, direction: NudgeDirection, resize: boolean) => void

function hideWidget(id: string) {
  const store = useAppStore.getState()
  const customId = customIdFromGrid(id)
  if (customId) store.updateCustomWidget(customId, { enabled: false })
  else if (isBuiltinGridId(id)) store.setWidgetVisible(id, false)
}

interface CardProps {
  id: string
  mode: LayoutMode
  editing: boolean
  label: string
  cardClass: string
  onKeyMove: KeyMove
}

const WidgetCard = memo(function WidgetCard({ id, mode, editing, label, cardClass, onKeyMove }: CardProps) {
  const custom = useAppStore((s) => {
    const customId = customIdFromGrid(id)
    return customId ? s.customWidgets.find((w) => w.id === customId) ?? null : null
  })
  const openEditor = useAppStore((s) => s.setCustomEditorId)
  const Builtin = isBuiltinGridId(id) ? widgetRegistry[id] : null

  const onHandleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const direction = ARROWS[event.key]
    if (!direction) return
    event.preventDefault()
    onKeyMove(id, direction, event.shiftKey)
  }

  return (
    <section aria-label={label} className={cn('widget-card relative flex h-full w-full flex-col overflow-hidden', cardClass, editing && mode === 'focus' && 'border-white/15 bg-white/40 dark:bg-white/[0.06]')}>
      <div className={cn('@container widget-body min-h-0 flex-1', editing && 'pointer-events-none select-none pt-5')}>
        <WidgetBoundary label={label}>
          <Suspense fallback={<WidgetSkeleton label={`Loading ${label}`} />}>
            {Builtin ? <Builtin mode={mode} /> : custom ? <CustomCodeWidget widget={custom} /> : null}
          </Suspense>
        </WidgetBoundary>
      </div>
      {editing && (
        <>
          <button
            type="button"
            className="widget-edit-control absolute left-2 top-2 z-20 grid h-6 w-6 place-items-center rounded-full bg-red-500 text-white shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Hide ${label}`}
            onClick={() => hideWidget(id)}
          >
            <Minus className="h-3 w-3" />
          </button>
          <div
            role="button"
            tabIndex={0}
            className="widget-drag-handle absolute left-1/2 top-2 z-20 flex h-6 w-8 -translate-x-1/2 cursor-grab items-center justify-center rounded-full border bg-background/90 text-muted-foreground shadow-sm active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Move ${label}. Arrow keys move it, Shift with arrow keys resizes it.`}
            onKeyDown={onHandleKey}
          >
            <Grip className="h-3 w-3" />
          </div>
          {custom && (
            <button
              type="button"
              className="widget-edit-control absolute right-2 top-2 z-20 grid h-6 w-6 place-items-center rounded-full border bg-background/90 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Edit ${label}`}
              onClick={() => openEditor(custom.id)}
            >
              <Code className="h-3 w-3" />
            </button>
          )}
        </>
      )}
    </section>
  )
})

const clean = (layout: Layout, cols: number, allowed: Set<string>) =>
  layout.flatMap((item) => {
    if (item.i === DROPPING_ID) return []
    const placed = normalizePlacement(item, cols, allowed)
    return placed ? [placed] : []
  })

export function WidgetGrid() {
  const mode = useAppStore((s) => s.settings.layoutMode)
  const widgets = useAppStore((s) => s.widgets)
  const customWidgets = useAppStore((s) => s.customWidgets)
  const saved = useAppStore((s) => s.widgetLayouts)
  const editing = useAppStore((s) => s.layoutEditing)
  const generation = useAppStore((s) => s.layoutGeneration)
  const setWidgetLayouts = useAppStore((s) => s.setWidgetLayouts)
  const setWidgetVisible = useAppStore((s) => s.setWidgetVisible)
  const updateCustomWidget = useAppStore((s) => s.updateCustomWidget)
  const resetWidgetLayouts = useAppStore((s) => s.resetWidgetLayouts)
  const setLayoutEditing = useAppStore((s) => s.setLayoutEditing)

  const visibleIds = useMemo(() => visibleGridIds(mode, widgets, customWidgets), [mode, widgets, customWidgets])
  const customIds = useMemo(() => customWidgets.map((w) => w.id), [customWidgets])
  const allowed = useMemo(() => new Set(customIds), [customIds])

  const [layouts, setLayouts] = useState<ModeLayouts>(() => materialize(saved, mode, visibleIds, customIds))
  const layoutsRef = useRef(layouts)
  layoutsRef.current = layouts
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const next = materialize(saved, mode, visibleIds, customIds)
    setLayouts((current) => (layoutsEqual(current, next) ? current : next))
  }, [mode, generation, saved, visibleIds, customIds])

  /** The breakpoint on screen right now, read from the grid's real width rather than remembered from an event. */
  const breakpoint = useCallback((): GridBreakpoint => {
    const width = gridRef.current?.querySelector<HTMLElement>('.widget-grid')?.offsetWidth
    return width ? breakpointFor(width) : 'lg'
  }, [])

  /** Saves the visible widgets for one breakpoint. Hidden widgets keep their old spot for when they come back. */
  const commit = useCallback(
    (bp: GridBreakpoint, items: WidgetPlacement[]) => {
      const current = layoutsRef.current
      const ids = new Set(items.map((item) => item.i))
      const next = { ...current, [bp]: [...items, ...(current[bp] ?? []).filter((item) => !ids.has(item.i))] }
      if (layoutsEqual(current, next)) return
      layoutsRef.current = next
      setLayouts(next)
      setWidgetLayouts(mode, next)
    },
    [mode, setWidgetLayouts],
  )

  const visibleAt = useCallback(
    (bp: GridBreakpoint) => {
      const ids = new Set(visibleIds)
      return (layoutsRef.current[bp] ?? []).filter((item) => ids.has(item.i))
    },
    [visibleIds],
  )

  const onDragStop = useCallback(
    (layout: Layout) => {
      if (!useAppStore.getState().layoutEditing) return
      const bp = breakpoint()
      const items = clean(layout, GRID_COLS[bp], allowed)
      if (items.length) commit(bp, compactVertical(items))
    },
    [allowed, breakpoint, commit],
  )

  const onResizeStop = useCallback(
    (layout: Layout, _old: unknown, resized: { i: string; w: number; h: number } | null) => {
      if (!resized || !useAppStore.getState().layoutEditing) return
      const bp = breakpoint()
      const cols = GRID_COLS[bp]
      const settled = settleResize(visibleAt(bp), resized.i, { w: resized.w, h: resized.h }, cols)
      // The grid keeps its own copy until it sees a different layout, so show what it has, then the settled rows.
      commit(bp, compactVertical(clean(layout, cols, allowed)))
      requestAnimationFrame(() => commit(bp, settled))
    },
    [allowed, breakpoint, commit, visibleAt],
  )

  const onKeyMove = useCallback<KeyMove>(
    (id, direction, resize) => {
      const bp = breakpoint()
      const cols = GRID_COLS[bp]
      const items = visibleAt(bp)
      const me = items.find((item) => item.i === id)
      if (!me) return
      if (!resize) return commit(bp, nudgeWidget(items, id, direction, cols))
      const dw = direction === 'right' ? 1 : direction === 'left' ? -1 : 0
      const dh = direction === 'down' ? 1 : direction === 'up' ? -1 : 0
      commit(bp, settleResize(items, id, { w: me.w + dw, h: me.h + dh }, cols))
    },
    [breakpoint, commit, visibleAt],
  )

  const placeDropped = useCallback(
    (id: string, x: number, y: number) => {
      const bp = breakpoint()
      const cols = GRID_COLS[bp]
      const size = preferredSize(id, cols)
      const placed = { i: id, x: Math.min(x, cols - size.w), y, ...size }
      const others = visibleAt(bp)
        .filter((item) => item.i !== id)
        .map((item) => (item.y + item.h > placed.y && item.y < placed.y + placed.h && item.x < placed.x + placed.w && item.x + item.w > placed.x ? { ...item, y: placed.y + placed.h } : item))
      commit(bp, compactVertical([placed, ...others]))
      if (isBuiltinGridId(id)) setWidgetVisible(id, true)
      else {
        const customId = customIdFromGrid(id)
        if (customId) updateCustomWidget(customId, { enabled: true })
      }
    },
    [breakpoint, commit, setWidgetVisible, updateCustomWidget, visibleAt],
  )

  const rglLayouts = useMemo(() => {
    const visible = new Set(visibleIds)
    const out = {} as Record<GridBreakpoint, Layout>
    for (const bp of GRID_BREAKPOINT_KEYS) {
      out[bp] = (layouts[bp] ?? [])
        .filter((item) => visible.has(item.i))
        .map((item) => ({ ...item, ...constraintsFor(item.i, GRID_COLS[bp]) }))
    }
    return out
  }, [layouts, visibleIds])

  const cardClass = CARD[mode]

  return (
    <div ref={gridRef} className={cn('mx-auto w-full', WRAPPER[mode], editing && 'pb-44')}>
      {editing && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/15 bg-card/80 px-3 py-2 text-sm shadow-sm backdrop-blur">
          <p>Drag the handle to move and the corner to resize. Saved for {MODE_LABEL[mode]} only.</p>
          <Button type="button" size="sm" variant="outline" onClick={() => resetWidgetLayouts(mode)}>
            Reset
          </Button>
        </div>
      )}
      {visibleIds.length === 0 ? (
        <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-white/20 p-10 text-center text-sm text-muted-foreground">
          <p>Your dashboard is empty.</p>
          <Button type="button" size="sm" onClick={() => setLayoutEditing(true)}>Add widgets</Button>
        </div>
      ) : (
        <Grid
          // One grid per mode. Switching modes changes the width and the layouts in separate renders, and a
          // shared grid would squeeze the old mode's 12-column layout into the new column count in between.
          key={mode}
          className={cn('widget-grid', editing && 'is-editing')}
          breakpoints={GRID_BREAKPOINTS}
          cols={GRID_COLS}
          layouts={rglLayouts}
          rowHeight={ROW_HEIGHT[mode]}
          margin={MARGIN[mode]}
          containerPadding={[0, 0]}
          compactType="vertical"
          isDraggable={editing}
          isResizable={editing}
          isDroppable={editing}
          isBounded
          draggableHandle=".widget-drag-handle"
          draggableCancel=".widget-edit-control"
          resizeHandles={['se']}
          droppingItem={{ i: DROPPING_ID, x: 0, y: 0, w: 4, h: 4 }}
          onDragStop={onDragStop}
          onResizeStop={onResizeStop}
          onDropDragOver={() => {
            const id = draggingWidget()
            return id ? preferredSize(id, GRID_COLS[breakpoint()]) : false
          }}
          onDrop={(layout, _item, event) => {
            const drag = event as DragEvent
            const id = drag.dataTransfer?.getData('application/x-delulutab-widget') || drag.dataTransfer?.getData('text/plain') || draggingWidget() || ''
            setDraggingWidget(null)
            const dropped = layout.find((item) => item.i === DROPPING_ID)
            if (!dropped || (!isBuiltinGridId(id) && !customIdFromGrid(id))) return
            placeDropped(id, dropped.x, dropped.y)
          }}
          measureBeforeMount
          useCSSTransforms
        >
          {visibleIds.map((id) => (
            <div key={id} className="widget-shell">
              <WidgetCard id={id} mode={mode} editing={editing} label={gridLabel(id, customWidgets)} cardClass={cardClass} onKeyMove={onKeyMove} />
            </div>
          ))}
        </Grid>
      )}
      {editing && <WidgetGallery />}
    </div>
  )
}
