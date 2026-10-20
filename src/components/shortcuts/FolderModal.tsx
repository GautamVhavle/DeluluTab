import { useState, type FormEvent } from 'react'
import { useAppStore, type Folder } from '@/store/useAppStore'
import { Button } from '@/components/common/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/common/dialog'
import { Input } from '@/components/common/input'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present when renaming; absent when creating. */
  folder?: Folder
}

export function FolderModal({ open, onOpenChange, folder }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <FolderForm folder={folder} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function FolderForm({ folder, onDone }: { folder?: Folder; onDone: () => void }) {
  const addFolder = useAppStore((s) => s.addFolder)
  const updateFolder = useAppStore((s) => s.updateFolder)
  const [title, setTitle] = useState(folder?.title ?? '')

  function submit(e: FormEvent) {
    e.preventDefault()
    const name = title.trim()
    if (!name) return
    if (folder) updateFolder(folder.id, { title: name })
    else addFolder({ title: name, icon: 'folder' })
    onDone()
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{folder ? 'Rename folder' : 'New folder'}</DialogTitle>
        <DialogDescription>Folders group related shortcuts and can be collapsed.</DialogDescription>
      </DialogHeader>
      <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Folder name" aria-label="Folder name" />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={!title.trim()}>{folder ? 'Save' : 'Create folder'}</Button>
      </DialogFooter>
    </form>
  )
}
