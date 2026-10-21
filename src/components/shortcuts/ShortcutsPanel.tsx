import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, FolderPlus, Pencil, Plus, Trash2 } from '@/components/common/icons'
import { useAppStore, type Folder, type Shortcut } from '@/store/useAppStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/common/dropdown-menu'
import { AddTile } from './AddTile'
import { FolderTile } from './FolderCard'
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

/**
 * Apps and folders share one icon grid that scrolls inside the card.
 * A folder opens in place, so adding several never stacks bars or grows the widget.
 */
export function ShortcutsPanel({ compact }: { compact: boolean }) {
  const shortcuts = useAppStore((s) => s.shortcuts)
  const folders = useAppStore((s) => s.folders)
  const removeFolder = useAppStore((s) => s.removeFolder)

  const [openId, setOpenId] = useState<string | null>(null)
  const [shortcutDialog, setShortcutDialog] = useState<ShortcutDialog>({ open: false, folderId: null })
  const [folderDialog, setFolderDialog] = useState<FolderDialog>({ open: false })

  const openFolder = folders.find((folder) => folder.id === openId) ?? null

  useEffect(() => {
    if (openId && !folders.some((folder) => folder.id === openId)) setOpenId(null)
  }, [folders, openId])

  useEffect(() => {
    if (!openId) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openId])

  const folderIds = new Set(folders.map((folder) => folder.id))
  const loose = shortcuts.filter((shortcut) => !shortcut.folderId || !folderIds.has(shortcut.folderId))
  const inside = openFolder ? shortcuts.filter((shortcut) => shortcut.folderId === openFolder.id) : []

  const addShortcut = (folderId: string | null) => setShortcutDialog({ open: true, folderId })
  const editShortcut = (shortcut: Shortcut) => setShortcutDialog({ open: true, shortcut, folderId: shortcut.folderId })

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-1 flex h-8 shrink-0 items-center gap-1">
        {openFolder ? (
          <button
            type="button"
            onClick={() => setOpenId(null)}
            className="inline-flex min-w-0 items-center gap-1.5 rounded-full px-1.5 py-1 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{openFolder.title}</span>
          </button>
        ) : (
          <h3 className="px-1.5 text-sm font-medium text-muted-foreground">Quick apps</h3>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Add shortcut or folder"
              className="ml-auto grid h-7 w-7 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => addShortcut(openFolder?.id ?? null)}>
              <Plus /> Add shortcut
            </DropdownMenuItem>
            {!openFolder && (
              <DropdownMenuItem onSelect={() => setFolderDialog({ open: true })}>
                <FolderPlus /> New folder
              </DropdownMenuItem>
            )}
            {openFolder && (
              <>
                <DropdownMenuItem onSelect={() => setFolderDialog({ open: true, folder: openFolder })}>
                  <Pencil /> Rename folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  destructive
                  onSelect={() => {
                    removeFolder(openFolder.id)
                    setOpenId(null)
                  }}
                >
                  <Trash2 /> Delete folder
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait" initial={false}>
          <motion.ul
            key={openFolder?.id ?? 'root'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-[repeat(auto-fill,minmax(4.4rem,1fr))] gap-x-1 gap-y-2"
          >
            {openFolder ? (
              <>
                {inside.map((shortcut) => (
                  <li key={shortcut.id} className="min-w-0">
                    <ShortcutTile shortcut={shortcut} compact={compact} onEdit={editShortcut} />
                  </li>
                ))}
                <li>
                  <AddTile compact={compact} label="Add" onClick={() => addShortcut(openFolder.id)} />
                </li>
              </>
            ) : (
              <>
                {folders.map((folder) => (
                  <li key={folder.id} className="min-w-0">
                    <FolderTile
                      folder={folder}
                      shortcuts={shortcuts.filter((shortcut) => shortcut.folderId === folder.id)}
                      compact={compact}
                      onOpen={() => setOpenId(folder.id)}
                      onAddShortcut={addShortcut}
                      onRenameFolder={(item) => setFolderDialog({ open: true, folder: item })}
                    />
                  </li>
                ))}
                {loose.map((shortcut) => (
                  <li key={shortcut.id} className="min-w-0">
                    <ShortcutTile shortcut={shortcut} compact={compact} onEdit={editShortcut} />
                  </li>
                ))}
                <li>
                  <AddTile compact={compact} label="Add" onClick={() => addShortcut(null)} />
                </li>
              </>
            )}
          </motion.ul>
        </AnimatePresence>
        {openFolder && inside.length === 0 && (
          <p className="px-2 pt-3 text-center text-xs text-muted-foreground">Nothing in {openFolder.title} yet.</p>
        )}
      </div>

      <ShortcutModal
        open={shortcutDialog.open}
        onOpenChange={(open) => setShortcutDialog((dialog) => ({ ...dialog, open }))}
        shortcut={shortcutDialog.shortcut}
        defaultFolderId={shortcutDialog.folderId}
      />
      <FolderModal
        open={folderDialog.open}
        onOpenChange={(open) => setFolderDialog((dialog) => ({ ...dialog, open }))}
        folder={folderDialog.folder}
      />
    </div>
  )
}
