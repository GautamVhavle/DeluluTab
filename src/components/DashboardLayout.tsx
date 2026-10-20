import type { ComponentType } from 'react'
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAppStore, type LayoutMode, type WidgetKey } from '@/store/useAppStore'
import { ClockWidget } from './widgets/ClockWidget'
import { NewsWidget } from './widgets/NewsWidget'
import { QuickAppsWidget } from './widgets/QuickAppsWidget'
import { SearchWidget } from './widgets/SearchWidget'
import { WeatherWidget } from './widgets/WeatherWidget'
import type { WidgetProps } from './widgets/types'

const WIDGETS: Record<WidgetKey, ComponentType<WidgetProps>> = {
  clock: ClockWidget,
  search: SearchWidget,
  weather: WeatherWidget,
  quickApps: QuickAppsWidget,
  news: NewsWidget,
}

interface ModeConfig {
  /** Outer width / padding. */
  wrapper: string
  /** The grid (or flex column) holding the cards. */
  grid: string
  /** Shared look of every card in this mode. */
  card: string
  /** Widgets shown in this mode, in DOM order. Anything else is hidden. */
  order: WidgetKey[]
  /** Per-widget placement classes (grid spans). */
  spans: Partial<Record<WidgetKey, string>>
}

// Class strings are written out in full so Tailwind can see them.
const MODES: Record<LayoutMode, ModeConfig> = {
  // Bento grid: 4 columns × 3 rows on large screens with every widget enabled.
  detailed: {
    wrapper: 'max-w-6xl p-6 sm:p-8',
    grid: 'grid grid-flow-dense grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:auto-rows-[11rem]',
    card: 'min-h-[9rem] rounded-2xl border bg-card/70 p-5 shadow-sm backdrop-blur',
    order: ['clock', 'search', 'weather', 'quickApps', 'news'],
    spans: {
      clock: 'sm:col-span-2 lg:row-span-2',
      search: 'sm:col-span-2',
      weather: 'sm:col-span-2',
      quickApps: 'sm:col-span-2',
      news: 'sm:col-span-2',
    },
  },
  compact: {
    wrapper: 'max-w-3xl p-3',
    grid: 'grid grid-cols-2 gap-2 sm:grid-cols-4',
    card: 'rounded-xl border bg-card/70 p-3 backdrop-blur',
    order: ['clock', 'weather', 'search', 'quickApps'],
    spans: {
      clock: 'col-span-2',
      weather: 'col-span-2',
      search: 'col-span-2 sm:col-span-4',
      quickApps: 'col-span-2 sm:col-span-4',
    },
  },
  focus: {
    wrapper: 'max-w-2xl p-6',
    grid: 'flex flex-col items-center gap-10',
    card: 'w-full border-transparent bg-transparent p-0',
    order: ['clock', 'search'],
    spans: {},
  },
}

const SPRING = { type: 'spring', stiffness: 380, damping: 36, mass: 0.9 } as const

export function DashboardLayout() {
  const mode = useAppStore((s) => s.settings.layoutMode)
  const widgets = useAppStore((s) => s.widgets)
  const config = MODES[mode]
  const visible = config.order.filter((key) => widgets[key])

  return (
    <MotionConfig reducedMotion="user" transition={SPRING}>
      <LayoutGroup>
        <div className="flex flex-1">
          <motion.div layout className={cn('m-auto w-full', config.wrapper)}>
            <motion.div layout className={config.grid}>
              <AnimatePresence mode="popLayout" initial={false}>
                {visible.map((key) => {
                  const Widget = WIDGETS[key]
                  return (
                    <motion.section
                      key={key}
                      layout
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      className={cn(config.card, config.spans[key])}
                    >
                      {/* Content swaps per mode; fade it in so the reflowing box doesn't show distorted text. */}
                      <motion.div
                        key={mode}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.25, delay: 0.08 }}
                        className="h-full"
                      >
                        <Widget mode={mode} />
                      </motion.div>
                    </motion.section>
                  )
                })}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </div>
      </LayoutGroup>
    </MotionConfig>
  )
}
