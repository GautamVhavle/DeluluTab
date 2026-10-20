import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout/legacy'
import { Code, Grip, Minus } from '@/components/common/icons'
import { cn } from '@/utils/cn'
import {
  applyIncoming,
  constraintsFor,
  customIdFromGrid,
  GRID_BREAKPOINTS,
  GRID_COLS,
  GRID_BREAKPOINT_KEYS,
  gridLabel,
  isBuiltinGridId,
  layoutsEqual,
  materialize,
  visibleGridIds,
} from '@/utils/widgetLayout'
import { useAppStore, type GridBreakpoint, type LayoutMode, type ModeLayouts } from '@/store/useAppStore'
import { Button } from '@/components/common/button'
import { CustomCodeWidget } from '@/components/widgets/CustomCodeWidget'
import { widgetRegistry } from '@/components/widgets/registry'
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
  detailed: 'rounded-2xl border bg-card/75 p-4 shadow-sm backdrop-blur sm:p-5',
  compact: 'rounded-xl border bg-card/75 p-3 shadow-sm backdrop-blur',
  focus: 'rounded-2xl border border-transparent bg-transparent p-0 shadow-none',
}
const MODE_LABEL: Record<LayoutMode, string> = { detailed: 'Detailed', compact: 'Compact', focus: 'Focus' }

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
}

const WidgetCard = memo(function WidgetCard({ id, mode, editing, label, cardClass }: CardProps) {
  const custom = useAppStore((s) => {
    const customId = customIdFromGrid(id)
    return customId ? s.customWidgets.find((w) => w.id === customId) ?? null : null
  })
  const openEditor = useAppStore((s) => s.setCustomEditorId)
  const Builtin = isBuiltinGridId(id) ? widgetRegistry[id] : null

  return (
    <section aria-label={label} className={cn('widget-card relative h-full overflow-hidden', cardClass, editing && mode === 'focus' && 'border-border/70 bg-card/50')}>
      <div className={cn('h-full min-h-0', editing && 'pointer-events-none select-none pt-5')}>
        <Suspense fallback={null}>
          {Builtin ? <Builtin mode={mode} /> : custom ? <CustomCodeWidget widget={custom} /> : null}
        </Suspense>
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
            aria-label={`Move ${label}`}
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

export function WidgetGrid() {
  const mode = useAppStore((s) => s.settings.layoutMode)
  const widgets = useAppStore((s) => s.widgets)
  const customWidgets = useAppStore((s) => s.customWidgets)
  const saved = useAppStore((s) => s.widgetLayouts)
  const editing = useAppStore((s) => s.layoutEditing)
  const generation = useAppStore((s) => s.layoutGeneration)
  const setWidgetLayouts = useAppStore((s) => s.setWidgetLayouts)
  const resetWidgetLayouts = useAppStore((s) => s.resetWidgetLayouts)

  const visibleIds = useMemo(() => visibleGridIds(mode, widgets, customWidgets), [mode, widgets, customWidgets])
  const visibleKey = visibleIds.join('\n')
  const customIds = useMemo(() => customWidgets.map((w) => w.id), [customWidgets])
  const customKey = customIds.join('\n')

  const [layouts, setLayouts] = useState<ModeLayouts>(() => materialize(saved, mode, visibleIds, customIds))
  const layoutsRef = useRef(layouts)
  layoutsRef.current = layouts

  useEffect(() => {
    const next = materialize(useAppStore.getState().widgetLayouts, mode, visibleIds, customIds)
    setLayouts((current) => (layoutsEqual(current, next) ? current : next))
  }, [mode, visibleKey, customKey, generation, saved, visibleIds, customIds])

  const commit = useCallback(
    (layout: Layout, all: Partial<Record<string, Layout>>) => {
      if (layout.length === 0 && visibleIds.length > 0) return
      const next = applyIncoming(layoutsRef.current, all, customIds)
      if (layoutsEqual(layoutsRef.current, next)) return
      layoutsRef.current = next
      setLayouts(next)
      setWidgetLayouts(mode, next)
    },
    [customIds, mode, setWidgetLayouts, visibleIds.length],
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
    <div className={cn('mx-auto w-full', WRAPPER[mode])}>
      {editing && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card/80 px-3 py-2 text-sm shadow-sm backdrop-blur">
          <p>Drag the handle to move a widget. Drag the corner to resize. Saved for {MODE_LABEL[mode]}.</p>
          <Button type="button" size="sm" variant="outline" onClick={() => resetWidgetLayouts(mode)}>
            Reset
          </Button>
        </div>
      )}
      {visibleIds.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Every widget is hidden. Turn one on in Settings.
        </div>
      ) : (
        <Grid
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
          isBounded
          draggableHandle=".widget-drag-handle"
          draggableCancel=".widget-edit-control"
          resizeHandles={['se']}
          onLayoutChange={commit}
          measureBeforeMount
          useCSSTransforms
        >
          {visibleIds.map((id) => (
            <div key={id} className="widget-shell">
              <WidgetCard id={id} mode={mode} editing={editing} label={gridLabel(id, customWidgets)} cardClass={cardClass} />
            </div>
          ))}
        </Grid>
      )}
    </div>
  )
}
