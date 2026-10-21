import { memo, Suspense, useMemo } from 'react'
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout/legacy'
import { cn } from '@/utils/cn'
import {
  constraintsFor,
  customIdFromGrid,
  GRID_BREAKPOINTS,
  GRID_COLS,
  GRID_BREAKPOINT_KEYS,
  gridLabel,
  isBuiltinGridId,
  materialize,
  visibleGridIds,
} from '@/utils/widgetLayout'
import { useAppStore, type GridBreakpoint, type LayoutMode } from '@/store/useAppStore'
import { Edit } from '@/components/common/icons'
import { WidgetBoundary } from '@/components/common/WidgetBoundary'
import { CustomCodeWidget } from '@/components/widgets/CustomCodeWidget'
import { widgetRegistry } from '@/components/widgets/registry'
import { WidgetSkeleton } from '@/components/widgets/WidgetFeedback'
import 'react-grid-layout/css/styles.css'

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
  detailed: 'rounded-2xl border border-black/10 bg-white/85 p-4 shadow-sm shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/75 sm:p-5',
  compact: 'rounded-3xl border border-black/5 bg-white/80 p-4 shadow-[0_24px_50px_-28px_rgba(0,0,0,0.55)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/75',
  focus: 'rounded-2xl border border-transparent bg-transparent p-0 shadow-none',
}

interface CardProps {
  id: string
  mode: LayoutMode
  label: string
  cardClass: string
}

const WidgetCard = memo(function WidgetCard({ id, mode, label, cardClass }: CardProps) {
  const custom = useAppStore((s) => {
    const customId = customIdFromGrid(id)
    return customId ? s.customWidgets.find((w) => w.id === customId) ?? null : null
  })
  const Builtin = isBuiltinGridId(id) ? widgetRegistry[id] : null
  const edit = useAppStore((s) => s.setCustomEditorId)

  return (
    <section aria-label={label} className={cn('widget-card relative flex h-full w-full flex-col overflow-hidden', cardClass, mode === 'focus' && 'border-transparent')}>
      {custom && (
        <button
          type="button"
          aria-label={`Edit ${label}`}
          onClick={() => edit(custom.id)}
          className="absolute right-2 top-2 z-10 rounded-full border border-black/10 bg-white/85 p-1.5 text-slate-700 shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-white/15 dark:bg-slate-950/80 dark:text-slate-100 dark:hover:bg-slate-950"
        >
          <Edit className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="@container widget-body min-h-0 flex-1">
        <WidgetBoundary label={label}>
          <Suspense fallback={<WidgetSkeleton label={`Loading ${label}`} />}>
            {Builtin ? <Builtin mode={mode} /> : custom ? <CustomCodeWidget widget={custom} /> : null}
          </Suspense>
        </WidgetBoundary>
      </div>
    </section>
  )
})

export function WidgetGrid() {
  const mode = useAppStore((s) => s.settings.layoutMode)
  const widgets = useAppStore((s) => s.widgets)
  const customWidgets = useAppStore((s) => s.customWidgets)

  const visibleIds = useMemo(() => visibleGridIds(mode, widgets, customWidgets), [mode, widgets, customWidgets])
  const customIds = useMemo(() => customWidgets.map((w) => w.id), [customWidgets])
  // Positions come from the locked design, never from a drag. Hiding a widget repacks what is left.
  const layouts = useMemo(() => materialize({}, mode, visibleIds, customIds), [mode, visibleIds, customIds])

  const rglLayouts = useMemo(() => {
    const visible = new Set(visibleIds)
    const out = {} as Record<GridBreakpoint, Layout>
    for (const bp of GRID_BREAKPOINT_KEYS) {
      out[bp] = (layouts[bp] ?? [])
        .filter((item) => visible.has(item.i))
        .map((item) => ({ ...item, ...constraintsFor(item.i, GRID_COLS[bp]), static: true }))
    }
    return out
  }, [layouts, visibleIds])

  const cardClass = CARD[mode]
  const searchCard = mode === 'focus'
    ? 'rounded-2xl border border-transparent bg-transparent p-1.5 shadow-none'
    : 'rounded-2xl border border-black/10 bg-white p-4 shadow-sm shadow-black/5 dark:border-white/10 dark:bg-slate-950 sm:p-5'

  return (
    <div className={cn('mx-auto w-full', WRAPPER[mode])}>
      <Grid
        key={mode}
        className="widget-grid"
        breakpoints={GRID_BREAKPOINTS}
        cols={GRID_COLS}
        layouts={rglLayouts}
        rowHeight={ROW_HEIGHT[mode]}
        margin={MARGIN[mode]}
        containerPadding={[0, 0]}
        compactType="vertical"
        isDraggable={false}
        isResizable={false}
        resizeHandles={[]}
        measureBeforeMount
        useCSSTransforms
      >
        {visibleIds.map((id) => (
          <div key={id} className="widget-shell">
            <WidgetCard id={id} mode={mode} label={gridLabel(id, customWidgets)} cardClass={id === 'search' ? searchCard : cardClass} />
          </div>
        ))}
      </Grid>
    </div>
  )
}
