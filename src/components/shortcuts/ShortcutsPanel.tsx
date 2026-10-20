import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FolderPlus, Plus } from '@/lib/icons'
import { useAppStore, type Folder, type Shortcut } from '@/store/useAppStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AddTile } from './AddTile'
import { FolderCard } from './FolderCard'
import { FolderModal } from './FolderModal'
import { ShortcutModal } from './ShortcutModal'
import { ShortcutTile } from './ShortcutTile'

interface ShortcutDialog {
  open: boolean
  shortcut?: Shortcut
  folderId: string | null
}
interface FolderDialog {
  open: boolean
  folder?: Folder
}

/** Shortcut grid with collapsible folders, plus the add/edit dialogs. */
export function ShortcutsPanel({ compact }: { compact: boolean }) {
  const shortcuts = useAppStore((s) => s.shortcuts)
  const folders = useAppStore((s) => s.folders)

  const [shortcutDialog, setShortcutDialog] = useState<ShortcutDialog>({ open: false, folderId: null })
  const [folderDialog, setFolderDialog] = useState<FolderDialog>({ open: false })

  const folderIds = new Set(folders.map((f) => f.id))
  // A shortcut pointing at a missing folder is shown at the top level rather than lost.
  const loose = shortcuts.filter((s) => !s.folderId || !folderIds.has(s.folderId))

  const addShortcut = (folderId: string | null) => setShortcutDialog({ open: true, folderId })
  const editShortcut = (shortcut: Shortcut) => setShortcutDialog({ open: true, shortcut, folderId: shortcut.folderId })
  const renameFolder = (folder: Folder) => setFolderDialog({ open: true, folder })

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between">
        {!compact && <h3 className="text-sm font-medium text-muted-foreground">Quick apps</h3>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Add shortcut or folder"
              className="ml-auto grid h-7 w-7 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => addShortcut(null)}>
              <Plus /> Add shortcut
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setFolderDialog({ open: true })}>
              <FolderPlus /> New folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <motion.div layout className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        <AnimatePresence mode="popLayout" initial={false}>
          {folders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              shortcuts={shortcuts.filter((s) => s.folderId === folder.id)}
              compact={compact}
              onEditShortcut={editShortcut}
              onAddShortcut={addShortcut}
              onRenameFolder={renameFolder}
            />
          ))}
        </AnimatePresence>

        <motion.div layout className="flex flex-wrap gap-1">
          <AnimatePresence mode="popLayout" initial={false}>
            {loose.map((s) => (
              <ShortcutTile key={s.id} shortcut={s} compact={compact} onEdit={editShortcut} />
            ))}
          </AnimatePresence>
          <AddTile compact={compact} label="Add" onClick={() => addShortcut(null)} />
        </motion.div>
      </motion.div>

      <ShortcutModal
        open={shortcutDialog.open}
        onOpenChange={(open) => setShortcutDialog((d) => ({ ...d, open }))}
        shortcut={shortcutDialog.shortcut}
        defaultFolderId={shortcutDialog.folderId}
      />
      <FolderModal
        open={folderDialog.open}
        onOpenChange={(open) => setFolderDialog((d) => ({ ...d, open }))}
        folder={folderDialog.folder}
      />
    </div>
  )
}
