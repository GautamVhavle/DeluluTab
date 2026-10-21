import { Plus } from '@/components/common/icons'
import { cn } from '@/utils/cn'

/** The last cell on the grid. Same size as an app, so adding one never changes the layout. */
export function AddTile({ compact, label, onClick }: { compact: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label} shortcut`}
      className="flex flex-col items-center gap-1.5 rounded-2xl p-1.5 text-muted-foreground outline-none transition-transform hover:-translate-y-0.5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className={cn(
          'grid place-items-center rounded-2xl border border-dashed border-black/15 dark:border-white/20',
          compact ? 'h-10 w-10' : 'h-12 w-12',
        )}
      >
        <Plus className="h-4 w-4" />
      </span>
      {!compact && <span className="text-[11px] font-medium leading-tight">{label}</span>}
    </button>
  )
}
