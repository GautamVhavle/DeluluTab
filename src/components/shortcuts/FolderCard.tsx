import { ArrowDown, ArrowUp, Folder as FolderIcon, MoreHorizontal, Pencil, Plus, Trash2 } from '@/components/common/icons'
import { cn } from '@/utils/cn'
import { useAppStore, type Folder, type Shortcut } from '@/store/useAppStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/common/dropdown-menu'
import { ShortcutIcon } from './ShortcutIcon'

interface Props {
  folder: Folder
  shortcuts: Shortcut[]
  compact: boolean
  onOpen: () => void
  onAddShortcut: (folderId: string) => void
  onRenameFolder: (folder: Folder) => void
}

/** A folder is an icon, the same size as an app. The plate shows the first few favicons inside it. */
export function FolderTile({ folder, shortcuts, compact, onOpen, onAddShortcut, onRenameFolder }: Props) {
  const reorderFolder = useAppStore((s) => s.reorderFolder)
  const removeFolder = useAppStore((s) => s.removeFolder)
  const preview = shortcuts.slice(0, 4)

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col items-center gap-1.5 rounded-2xl p-1.5 outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className={cn(
            'grid place-items-center rounded-2xl bg-black/[0.04] ring-1 ring-black/[0.06] transition-shadow group-hover:shadow-md dark:bg-white/[0.08] dark:ring-white/10',
            compact ? 'h-10 w-10' : 'h-12 w-12',
            preview.length > 1 && 'grid-cols-2 gap-0.5 p-1.5',
          )}
        >
          {preview.length === 0 && <FolderIcon className="h-4 w-4 text-violet-500" />}
          {preview.length === 1 && (
            <ShortcutIcon icon={preview[0].icon} url={preview[0].url} className={cn('object-contain', compact ? 'h-6 w-6' : 'h-7 w-7')} />
          )}
          {preview.length > 1 &&
            preview.map((shortcut) => (
              <ShortcutIcon key={shortcut.id} icon={shortcut.icon} url={shortcut.url} className="h-3.5 w-3.5 object-contain" />
            ))}
        </span>
        {!compact && <span className="w-full truncate text-center text-[11px] font-medium leading-tight">{folder.title}</span>}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={`Options for folder ${folder.title}`}
            className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full border bg-popover text-muted-foreground opacity-0 shadow-sm outline-none transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onAddShortcut(folder.id)}>
            <Plus /> Add shortcut here
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onRenameFolder(folder)}>
            <Pencil /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => reorderFolder(folder.id, -1)}>
            <ArrowUp /> Move earlier
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => reorderFolder(folder.id, 1)}>
            <ArrowDown /> Move later
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => removeFolder(folder.id)}>
            <Trash2 /> Delete folder, keep apps
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
