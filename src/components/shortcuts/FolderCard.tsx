import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowUp, ChevronRight, Folder as FolderIcon, FolderOpen, MoreHorizontal, Pencil, Plus, Trash2 } from '@/components/common/icons'
import { useAppStore, type Folder, type Shortcut } from '@/store/useAppStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/common/dropdown-menu'
import { ShortcutTile } from './ShortcutTile'
import { AddTile } from './AddTile'

interface Props {
  folder: Folder
  shortcuts: Shortcut[]
  compact: boolean
  onEditShortcut: (shortcut: Shortcut) => void
  onAddShortcut: (folderId: string) => void
  onRenameFolder: (folder: Folder) => void
}

export function FolderCard({ folder, shortcuts, compact, onEditShortcut, onAddShortcut, onRenameFolder }: Props) {
  const toggle = useAppStore((s) => s.toggleFolderCollapsed)
  const reorderFolder = useAppStore((s) => s.reorderFolder)
  const removeFolder = useAppStore((s) => s.removeFolder)
  const collapsed = !!folder.collapsed

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="w-full overflow-hidden rounded-xl border bg-background/40"
    >
      <div className="flex items-center pr-1">
        <button
          onClick={() => toggle(folder.id)}
          aria-expanded={!collapsed}
          className="flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <motion.span animate={{ rotate: collapsed ? 0 : 90 }} className="text-muted-foreground">
            <ChevronRight className="h-4 w-4" />
          </motion.span>
          {collapsed ? <FolderIcon className="h-4 w-4 text-violet-400" /> : <FolderOpen className="h-4 w-4 text-violet-400" />}
          <span className="truncate">{folder.title}</span>
          <span className="rounded-full bg-secondary px-1.5 text-[10px] text-muted-foreground">{shortcuts.length}</span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label={`Options for folder ${folder.title}`}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MoreHorizontal className="h-4 w-4" />
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
              <ArrowUp /> Move up
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => reorderFolder(folder.id, 1)}>
              <ArrowDown /> Move down
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => removeFolder(folder.id)}>
              <Trash2 /> Delete folder (keeps shortcuts)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1 p-2 pt-0">
              <AnimatePresence mode="popLayout" initial={false}>
                {shortcuts.map((s) => (
                  <ShortcutTile key={s.id} shortcut={s} compact={compact} onEdit={onEditShortcut} />
                ))}
              </AnimatePresence>
              <AddTile compact={compact} label="Add" onClick={() => onAddShortcut(folder.id)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
