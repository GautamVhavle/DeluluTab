import { ArrowLeft, ArrowRight, MoreHorizontal, Pencil, Trash2 } from '@/components/common/icons'
import { cn } from '@/utils/cn'
import { appTitle } from '@/utils/url'
import { useAppStore, type Shortcut } from '@/store/useAppStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/common/dropdown-menu'
import { ShortcutIcon } from './ShortcutIcon'
import { ShortcutChord } from './ChordField'

interface Props {
  shortcut: Shortcut
  compact: boolean
  onEdit: (shortcut: Shortcut) => void
}

/** One app on the grid. The favicon is the tile; the name sits under it. */
export function ShortcutTile({ shortcut, compact, onEdit }: Props) {
  const removeShortcut = useAppStore((s) => s.removeShortcut)
  const reorderShortcut = useAppStore((s) => s.reorderShortcut)
  const chord = useAppStore((s) => s.chords.find((c) => c.shortcutId === shortcut.id && c.enabled)?.sequence)
  const name = appTitle(shortcut.title, shortcut.url)

  return (
    <div className="group relative min-w-0">
      <a
        href={shortcut.url}
        title={shortcut.title}
        className="flex w-full min-w-0 flex-col items-center gap-1.5 rounded-2xl p-1.5 outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className={cn(
            'grid place-items-center rounded-2xl bg-black/[0.04] ring-1 ring-black/[0.06] transition-shadow group-hover:shadow-md dark:bg-white/[0.08] dark:ring-white/10',
            compact ? 'h-10 w-10' : 'h-12 w-12',
          )}
        >
          <ShortcutIcon icon={shortcut.icon} url={shortcut.url} className={cn('object-contain', compact ? 'h-6 w-6' : 'h-7 w-7')} />
        </span>
        {!compact && <span className="w-full truncate text-center text-[11px] font-medium leading-tight">{name}</span>}
      </a>
      {chord && !compact && (
        <kbd className="pointer-events-none absolute left-1 top-0 rounded bg-background/90 px-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground ring-1 ring-border">
          {chord}
        </kbd>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={`Options for ${shortcut.title}`}
            className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full border bg-popover text-muted-foreground opacity-0 shadow-sm outline-none transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onEdit(shortcut)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <div className="px-2 py-1.5" onKeyDown={(e) => e.stopPropagation()}>
            <ShortcutChord shortcutId={shortcut.id} />
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => reorderShortcut(shortcut.id, -1)}>
            <ArrowLeft /> Move earlier
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => reorderShortcut(shortcut.id, 1)}>
            <ArrowRight /> Move later
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => removeShortcut(shortcut.id)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
