import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Archive, ChevronRight, Edit, ExternalLink, MoreHorizontal, Restore, RestoreWindow, Trash2, X } from '@/components/common/icons'
import { captureCurrentWindow, closeTabs, defaultStashName, hasTabsApi, MAX_STASH_GROUPS, MAX_STASH_NAME, restoreTabs } from '@/services/stash'
import { timeAgo } from '@/services/news'
import { hostnameOf } from '@/utils/url'
import { cn } from '@/utils/cn'
import { useAppStore, type StashGroup } from '@/store/useAppStore'
import { Button } from '@/components/common/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/common/dropdown-menu'
import { Input } from '@/components/common/input'
import type { WidgetProps } from './types'

/** Restoring this many tabs at once asks first. */
const CONFIRM_ABOVE = 15

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

function useStashActions() {
  const addStash = useAppStore((s) => s.addStash)
  const stashes = useAppStore((s) => s.stashes)
  const [message, setMessage] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null)
  const [busy, setBusy] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const say = (text: string, tone: 'ok' | 'error' = 'ok') => {
    setMessage({ text, tone })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(null), 5000)
  }

  async function save(name: string, closeAfter: boolean) {
    if (!hasTabsApi()) return say('Saving tabs works in the installed extension.', 'error')
    if (stashes.length >= MAX_STASH_GROUPS) return say(`You have ${MAX_STASH_GROUPS} saved groups. Delete one to save another.`, 'error')
    setBusy(true)
    try {
      const { tabs, tabIds, skipped } = await captureCurrentWindow()
      if (tabs.length === 0) return say(skipped ? 'This window only has browser pages, which can’t be saved.' : 'There are no tabs to save.', 'error')
      const finalName = name.trim() || defaultStashName()
      const id = addStash(finalName, tabs)
      if (!id) return say('Those tabs couldn’t be saved.', 'error')
      if (closeAfter) await closeTabs(tabIds)
      say(`Saved ${plural(tabs.length, 'tab')} as “${finalName.slice(0, MAX_STASH_NAME)}”.${closeAfter ? ' Tabs closed.' : ''}`)
    } catch {
      say('Couldn’t read this window’s tabs. Try again.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function restore(group: StashGroup, newWindow: boolean) {
    try {
      const n = await restoreTabs(group.tabs, { newWindow })
      say(`Opened ${plural(n, 'tab')} from “${group.name}”${newWindow ? ' in a new window' : ''}.`)
    } catch {
      say('Couldn’t open those tabs.', 'error')
    }
  }

  return { save, restore, message, busy }
}

function Message({ message }: { message: { text: string; tone: 'ok' | 'error' } | null }) {
  return (
    <p role={message?.tone === 'error' ? 'alert' : 'status'} className={cn('text-xs', message?.tone === 'error' ? 'text-red-500' : 'text-emerald-500')}>
      {message?.text}
    </p>
  )
}

function GroupRow({ group, onRestore }: { group: StashGroup; onRestore: (g: StashGroup, newWindow: boolean) => void }) {
  const removeStash = useAppStore((s) => s.removeStash)
  const renameStash = useAppStore((s) => s.renameStash)
  const removeStashTab = useAppStore((s) => s.removeStashTab)
  const [open, setOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(group.name)
  const [confirm, setConfirm] = useState<'restore' | 'delete' | null>(null)
  const renameInput = useRef<HTMLInputElement>(null)
  const focusRenameNext = useRef(false)

  useEffect(() => {
    if (!confirm) return
    const id = setTimeout(() => setConfirm(null), 4000)
    return () => clearTimeout(id)
  }, [confirm])

  const needsConfirm = group.tabs.length > CONFIRM_ABOVE
  const doRestore = () => {
    if (needsConfirm && confirm !== 'restore') return setConfirm('restore')
    setConfirm(null)
    onRestore(group, false)
  }

  function submitRename(e: FormEvent) {
    e.preventDefault()
    renameStash(group.id, name)
    setRenaming(false)
  }

  return (
    <li className="rounded-lg border bg-background/30">
      <div className="flex items-center gap-1 pr-1">
        {renaming ? (
          <form onSubmit={submitRename} className="flex flex-1 items-center gap-1 p-1.5">
            <Input ref={renameInput} autoFocus value={name} maxLength={MAX_STASH_NAME} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), setRenaming(false), setName(group.name))} aria-label="Group name" className="h-7" />
            <Button type="submit" size="sm" variant="secondary" className="h-7">Save</Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={`${group.name}, ${plural(group.tabs.length, 'tab')}`}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left outline-none hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight className={cn('h-3 w-3 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} aria-hidden />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{group.name}</span>
              <span className="block text-[11px] text-muted-foreground">{plural(group.tabs.length, 'tab')} · {timeAgo(group.createdAt)}</span>
            </span>
          </button>
        )}

        <Button size="sm" variant={confirm === 'restore' ? 'default' : 'secondary'} onClick={doRestore} className="h-7 shrink-0 px-2.5 text-xs" aria-label={`Restore ${group.name}`}>
          <Restore className="h-3 w-3" /> {confirm === 'restore' ? `Open ${group.tabs.length}?` : 'Restore'}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={`Options for ${group.name}`} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            // Closing the menu hands focus back to its button, which would undo "Rename"'s autofocus.
            onCloseAutoFocus={(e) => {
              if (!focusRenameNext.current) return
              focusRenameNext.current = false
              e.preventDefault()
              renameInput.current?.focus()
              renameInput.current?.select()
            }}
          >
            <DropdownMenuItem onSelect={() => onRestore(group, true)}><RestoreWindow /> Restore in a new window</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { setName(group.name); setRenaming(true); focusRenameNext.current = true }}><Edit /> Rename</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => (confirm === 'delete' ? removeStash(group.id) : setConfirm('delete'))}>
              <Trash2 /> {confirm === 'delete' ? 'Click again to delete' : 'Delete group'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t"
            aria-label={`Tabs in ${group.name}`}
          >
            {group.tabs.map((tab, i) => (
              <li key={`${tab.url}-${i}`} className="group flex items-center gap-2 px-2 py-1 text-xs">
                <a href={tab.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-baseline gap-2 rounded outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="truncate">{tab.title}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{hostnameOf(tab.url)}</span>
                  <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-0 group-hover:opacity-60" aria-hidden />
                </a>
                <button type="button" aria-label={`Remove ${tab.title} from ${group.name}`} onClick={() => removeStashTab(group.id, i)} className="rounded p-0.5 text-muted-foreground opacity-0 outline-none hover:text-red-500 focus-visible:opacity-100 group-hover:opacity-100">
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  )
}

export function TabStashWidget({ mode }: WidgetProps) {
  const stashes = useAppStore((s) => s.stashes)
  const { save, restore, message, busy } = useStashActions()
  const [name, setName] = useState('')
  const [closeAfter, setCloseAfter] = useState(false)
  const available = hasTabsApi()

  if (mode === 'compact') {
    return (
      <div className="flex h-full items-center gap-2 text-sm">
        <Archive className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <Button size="sm" variant="secondary" disabled={busy || !available} onClick={() => void save('', false)} className="h-7 text-xs">Save tabs</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" disabled={stashes.length === 0} className="h-7 text-xs">Restore ({stashes.length})</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
            {stashes.map((g) => (
              <DropdownMenuItem key={g.id} onSelect={() => void restore(g, false)}>{g.name} <span className="text-xs text-muted-foreground">· {g.tabs.length}</span></DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="min-w-0 truncate text-xs"><Message message={message} /></span>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Archive aria-hidden /> Tab stash{stashes.length > 0 && <span className="text-xs font-normal">· {plural(stashes.length, 'group')}</span>}</h3>
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <input type="checkbox" checked={closeAfter} onChange={(e) => setCloseAfter(e.target.checked)} className="h-3 w-3 accent-primary" />
          Close tabs after saving
        </label>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void save(name, closeAfter).then(() => setName(''))
        }}
        className="flex gap-2"
      >
        <Input value={name} maxLength={MAX_STASH_NAME} onChange={(e) => setName(e.target.value)} placeholder="Name this session (optional)" aria-label="Session name" className="h-8" autoComplete="off" />
        <Button type="submit" size="sm" disabled={busy || !available} className="shrink-0">Save tabs</Button>
      </form>

      {/* One line of feedback, shown only when there is something to say, so the card stays compact. */}
      {message ? (
        <Message message={message} />
      ) : !available ? (
        <p className="text-xs text-muted-foreground">Saving and restoring tabs works in the installed extension.</p>
      ) : stashes.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing saved yet. Save this window’s tabs to bring them back later.</p>
      ) : null}

      {stashes.length > 0 && (
        <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto" aria-label="Saved tab groups">
          {stashes.map((g) => (
            <GroupRow key={g.id} group={g} onRestore={(grp, newWindow) => void restore(grp, newWindow)} />
          ))}
        </ul>
      )}
    </div>
  )
}
