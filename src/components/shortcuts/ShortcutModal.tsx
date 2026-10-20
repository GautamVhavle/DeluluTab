import { useState, type FormEvent } from 'react'
import { cn } from '@/lib/utils'
import { hostnameOf, normalizeUrl } from '@/lib/url'
import { useAppStore, type Shortcut } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ICONS, ICON_NAMES, ShortcutIcon, isImageUrl } from './ShortcutIcon'

type IconMode = 'auto' | 'preset' | 'custom'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present when editing; absent when adding. */
  shortcut?: Shortcut
  /** Pre-selected folder when adding. */
  defaultFolderId?: string | null
}

export function ShortcutModal({ open, onOpenChange, shortcut, defaultFolderId = null }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Content unmounts when closed, so the form re-initializes on every open. */}
      <DialogContent>
        <ShortcutForm shortcut={shortcut} defaultFolderId={defaultFolderId} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function ShortcutForm({
  shortcut,
  defaultFolderId,
  onDone,
}: {
  shortcut?: Shortcut
  defaultFolderId: string | null
  onDone: () => void
}) {
  const folders = useAppStore((s) => s.folders)
  const addShortcut = useAppStore((s) => s.addShortcut)
  const updateShortcut = useAppStore((s) => s.updateShortcut)

  const initialIcon = shortcut?.icon ?? ''
  const [title, setTitle] = useState(shortcut?.title ?? '')
  const [url, setUrl] = useState(shortcut?.url ?? '')
  const [folderId, setFolderId] = useState<string>(shortcut ? (shortcut.folderId ?? '') : (defaultFolderId ?? ''))
  const [iconMode, setIconMode] = useState<IconMode>(
    initialIcon in ICONS ? 'preset' : isImageUrl(initialIcon) ? 'custom' : 'auto',
  )
  const [preset, setPreset] = useState(initialIcon in ICONS ? initialIcon : 'globe')
  const [customIcon, setCustomIcon] = useState(isImageUrl(initialIcon) ? initialIcon : '')
  const [error, setError] = useState('')

  const normalized = normalizeUrl(url)
  const previewIcon = iconMode === 'auto' ? '' : iconMode === 'preset' ? preset : customIcon.trim()

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!normalized) return setError('Enter a valid web address, e.g. github.com')
    if (iconMode === 'custom' && !isImageUrl(customIcon.trim())) return setError('Icon image must be an http(s) URL')

    const data = {
      title: title.trim() || hostnameOf(normalized),
      url: normalized,
      icon: previewIcon,
      folderId: folderId || null,
    }
    if (shortcut) updateShortcut(shortcut.id, data)
    else addShortcut(data)
    onDone()
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{shortcut ? 'Edit shortcut' : 'Add shortcut'}</DialogTitle>
        <DialogDescription>Saved instantly and synced across your Chrome devices.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-1.5">
        <label htmlFor="sc-url" className="text-sm font-medium">Address</label>
        <Input
          id="sc-url"
          autoFocus
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError('') }}
          placeholder="github.com"
          inputMode="url"
          autoComplete="off"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="sc-title" className="text-sm font-medium">Name</label>
        <Input
          id="sc-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={normalized ? hostnameOf(normalized) : 'Defaults to the site name'}
          autoComplete="off"
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Icon</span>
          <div role="radiogroup" aria-label="Icon source" className="flex gap-1 rounded-lg bg-secondary p-0.5">
            {([['auto', 'Favicon'], ['preset', 'Icon'], ['custom', 'Image URL']] as const).map(([value, label]) => (
              <button
                type="button"
                key={value}
                role="radio"
                aria-checked={iconMode === value}
                onClick={() => setIconMode(value)}
                className={cn(
                  'rounded-md px-2 py-1 text-xs transition-colors',
                  iconMode === value ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-secondary/80 ring-1 ring-border">
            <ShortcutIcon icon={previewIcon} url={normalized ?? 'https://example.com'} className="h-6 w-6 object-contain" />
          </span>
          {iconMode === 'auto' && (
            <p className="text-xs text-muted-foreground">The site's own favicon is fetched automatically.</p>
          )}
          {iconMode === 'custom' && (
            <Input
              value={customIcon}
              onChange={(e) => { setCustomIcon(e.target.value); setError('') }}
              placeholder="https://…/icon.png"
              aria-label="Icon image URL"
            />
          )}
          {iconMode === 'preset' && (
            <div className="flex flex-wrap gap-1">
              {ICON_NAMES.map((name) => {
                const Icon = ICONS[name]
                return (
                  <button
                    type="button"
                    key={name}
                    title={name}
                    aria-label={name}
                    aria-pressed={preset === name}
                    onClick={() => setPreset(name)}
                    className={cn(
                      'grid h-8 w-8 place-items-center rounded-md border transition-colors hover:bg-accent',
                      preset === name && 'border-primary bg-primary/15 text-primary-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="sc-folder" className="text-sm font-medium">Folder</label>
        <select
          id="sc-folder"
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">No folder</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>{f.title}</option>
          ))}
        </select>
      </div>

      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit">{shortcut ? 'Save' : 'Add shortcut'}</Button>
      </DialogFooter>
    </form>
  )
}
