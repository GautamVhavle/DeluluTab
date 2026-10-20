import { LayoutGrid, Focus, Rows3, type IconType } from '@/components/common/icons'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'
import { useAppStore, type LayoutMode } from '@/store/useAppStore'

const MODES: { value: LayoutMode; label: string; Icon: IconType }[] = [
  { value: 'compact', label: 'Compact', Icon: Rows3 },
  { value: 'detailed', label: 'Detailed', Icon: LayoutGrid },
  { value: 'focus', label: 'Focus', Icon: Focus },
]

/** Floating pill for switching layout modes live. */
export function ModeSwitcher() {
  const mode = useAppStore((s) => s.settings.layoutMode)
  const updateSettings = useAppStore((s) => s.updateSettings)

  return (
    // Full-width, non-interactive rail so the pill can be centered without a CSS transform (GSAP animates this wrapper).
    <div data-boot="switcher" className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center">
      <div
        role="radiogroup"
        aria-label="Layout mode"
        className="pointer-events-auto flex gap-1 rounded-full border bg-card/80 p-1 shadow-lg backdrop-blur"
      >
        {MODES.map(({ value, label, Icon }) => {
          const active = value === mode
          return (
            <button
              key={value}
              role="radio"
              aria-checked={active}
              onClick={() => updateSettings({ layoutMode: value })}
              className={cn(
                'relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {active && (
                <motion.span
                  layoutId="mode-pill"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <Icon className="relative h-3.5 w-3.5" />
              <span className="relative">{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
