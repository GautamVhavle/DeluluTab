import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { ShortcutIcon } from './ShortcutIcon'
import type { WidgetProps } from './types'

export function QuickAppsWidget({ mode }: WidgetProps) {
  const shortcuts = useAppStore((s) => s.shortcuts)
  const compact = mode === 'compact'

  return (
    <div className="flex h-full flex-col gap-3">
      {!compact && <h3 className="text-sm font-medium text-muted-foreground">Quick apps</h3>}
      <ul className={cn('flex flex-wrap', compact ? 'gap-1' : 'gap-3')}>
        {shortcuts.map((s) => (
          <li key={s.id}>
            <a
              href={s.url}
              title={s.title}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-lg text-xs transition-colors hover:bg-accent',
                compact ? 'p-2' : 'w-16 p-2',
              )}
            >
              <ShortcutIcon name={s.icon} className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
              {!compact && <span className="w-full truncate text-center">{s.title}</span>}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
