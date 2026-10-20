import { ArrowLeft, ArrowRight, MoreHorizontal, Pencil, Trash2 } from '@/components/common/icons'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'
import { useAppStore, type Shortcut } from '@/store/useAppStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/common/dropdown-menu'
import { ShortcutIcon } from './ShortcutIcon'

interface Props {
  shortcut: Shortcut
  compact: boolean
  onEdit: (shortcut: Shortcut) => void
}

export function ShortcutTile({ shortcut, compact, onEdit }: Props) {
  const removeShortcut = useAppStore((s) => s.removeShortcut)
  const reorderShortcut = useAppStore((s) => s.reorderShortcut)
  const chord = useAppStore((s) => s.chords.find((c) => c.shortcutId === shortcut.id && c.enabled)?.sequence)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.96 }}
      className="group relative"
    >
      <a
        href={shortcut.url}
        title={compact ? shortcut.title : shortcut.url}
        className={cn(
          'flex flex-col items-center rounded-xl outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring',
          compact ? 'w-12 gap-0 p-1.5' : 'w-[4.75rem] gap-2 p-2',
        )}
      >
        <span
          className={cn(
            'grid place-items-center rounded-xl bg-secondary/80 ring-1 ring-border transition-shadow group-hover:shadow-md',
            compact ? 'h-9 w-9' : 'h-11 w-11',
          )}
        >
          <ShortcutIcon
            icon={shortcut.icon}
            url={shortcut.url}
            className={cn('object-contain', compact ? 'h-5 w-5' : 'h-6 w-6')}
          />
        </span>
        {!compact && <span className="w-full truncate text-center text-xs">{shortcut.title}</span>}
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
            className="absolute right-0 top-0 grid h-5 w-5 place-items-center rounded-full border bg-popover text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onEdit(shortcut)}>
            <Pencil /> Edit
          </DropdownMenuItem>
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
    </motion.div>
  )
}
