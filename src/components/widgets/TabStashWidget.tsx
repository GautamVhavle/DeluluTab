import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Archive, ArrowLeft, ChevronRight, Edit, ExternalLink, MoreHorizontal, Pencil, Plus, Restore, RestoreWindow, Trash2, X } from '@/components/common/icons'
import { captureCurrentWindow, closeTabs, defaultStashName, hasTabsApi, MAX_STASH_GROUPS, MAX_STASH_NAME, MAX_TABS_PER_GROUP, restoreTabs, stashTabFromInput } from '@/services/stash'
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
    if (!hasTabsApi()) {
      say('Saving open tabs works in the installed extension. You can still add links by hand.', 'error')
      return null
    }
    if (stashes.length >= MAX_STASH_GROUPS) {
      say(`You have ${MAX_STASH_GROUPS} saved groups. Delete one to save another.`, 'error')
      return null
    }
    setBusy(true)
    try {
      const { tabs, tabIds, skipped } = await captureCurrentWindow()
      if (tabs.length === 0) {
        say(skipped ? 'This window only has browser pages, which can’t be saved.' : 'There are no tabs to save.', 'error')
        return null
      }
      const finalName = name.trim() || defaultStashName()
      const id = addStash(finalName, tabs)
      if (!id) {
        say('Those tabs couldn’t be saved.', 'error')
        return null
      }
      if (closeAfter) await closeTabs(tabIds)
      say(`Saved ${plural(tabs.length, 'tab')} as “${finalName.slice(0, MAX_STASH_NAME)}”.${closeAfter ? ' Tabs closed.' : ''}`)
      return id
    } catch {
      say('Couldn’t read this window’s tabs. Try again.', 'error')
      return null
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

function OpenList({ group, onBack, onRestore }: { group: StashGroup; onBack: () => void; onRestore: (g: StashGroup, newWindow: boolean) => void }) {
  const renameStash = useAppStore((s) => s.renameStash)
  const removeStash = useAppStore((s) => s.removeStash)
  const addStashTab = useAppStore((s) => s.addStashTab)
  const updateStashTab = useAppStore((s) => s.updateStashTab)
  const removeStashTab = useAppStore((s) => s.removeStashTab)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(group.name)
  const [confirm, setConfirm] = useState<'restore' | 'delete' | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftUrl, setDraftUrl] = useState('')
  const [link, setLink] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [linkError, setLinkError] = useState('')
  const renameInput = useRef<HTMLInputElement>(null)
  const focusRenameNext = useRef(false)

  useEffect(() => setName(group.name), [group.name])
  useEffect(() => {
    if (!confirm) return
    const id = setTimeout(() => setConfirm(null), 4000)
    return () => clearTimeout(id)
  }, [confirm])

  const needsConfirm = group.tabs.length > CONFIRM_ABOVE
  const doRestore = () => {
    if (group.tabs.length === 0) return setLinkError('Add a link before restoring this list.')
    if (needsConfirm && confirm !== 'restore') return setConfirm('restore')
    setConfirm(null)
    onRestore(group, false)
  }

  function submitRename(e: FormEvent) {
    e.preventDefault()
    renameStash(group.id, name)
    setRenaming(false)
  }

  function beginEdit(index: number) {
    const tab = group.tabs[index]
    if (!tab) return
    setEditing(index)
    setDraftTitle(tab.title)
    setDraftUrl(tab.url)
    setLinkError('')
  }

  function write(index: number | null, url: string, title: string) {
    const tab = stashTabFromInput(url, title)
    if (!tab) return setLinkError('Use a web address, like github.com.')
    if (group.tabs.some((item, i) => i !== index && item.url === tab.url)) return setLinkError('That link is already in this list.')
    if (index === null) {
      if (group.tabs.length >= MAX_TABS_PER_GROUP) return setLinkError(`A list can hold ${MAX_TABS_PER_GROUP} links.`)
      addStashTab(group.id, tab)
      setLink('')
      setLinkTitle('')
    } else {
      updateStashTab(group.id, index, tab)
      setEditing(null)
    }
    setLinkError('')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-1">
        <button type="button" onClick={onBack} aria-label="Back to lists" className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        {renaming ? (
          <form onSubmit={submitRename} className="flex min-w-0 flex-1 items-center gap-1">
            <Input ref={renameInput} autoFocus value={name} maxLength={MAX_STASH_NAME} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), setRenaming(false), setName(group.name))} aria-label="List name" className="h-7" />
            <Button type="submit" size="sm" variant="secondary" className="h-7">Save</Button>
          </form>
        ) : (
          <p className="min-w-0 flex-1 truncate text-sm font-medium">{group.name}</p>
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
              <Trash2 /> {confirm === 'delete' ? 'Click again to delete' : 'Delete list'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); write(null, link, linkTitle) }}
        className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_auto] gap-1.5"
      >
        <Input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Name" aria-label="Link name" className="h-8" autoComplete="off" />
        <Input value={link} onChange={(e) => { setLink(e.target.value); setLinkError('') }} placeholder="github.com" aria-label="Link address" className="h-8" inputMode="url" autoComplete="off" spellCheck={false} />
        <Button type="submit" size="sm" className="h-8 shrink-0 px-2.5" aria-label="Add link"><Plus className="h-3 w-3" /> Add</Button>
      </form>
      {linkError && <p role="alert" className="text-xs text-red-500">{linkError}</p>}

      {group.tabs.length === 0 ? (
        <p className="text-xs text-muted-foreground">No links yet. Add one above, then restore opens them together.</p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto" aria-label={`Links in ${group.name}`}>
          {group.tabs.map((tab, index) => (
            <li key={`${tab.url}-${index}`} className="rounded-lg border bg-background/40 px-2 py-1.5">
              {editing === index ? (
                <form onSubmit={(e) => { e.preventDefault(); write(index, draftUrl, draftTitle) }} className="grid gap-1.5">
                  <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} aria-label={`Name for link ${index + 1}`} className="h-7" />
                  <Input value={draftUrl} onChange={(e) => setDraftUrl(e.target.value)} aria-label={`Address for link ${index + 1}`} className="h-7" inputMode="url" spellCheck={false} />
                  <div className="flex justify-end gap-1">
                    <Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => setEditing(null)}>Cancel</Button>
                    <Button type="submit" size="sm" variant="secondary" className="h-7">Save</Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center gap-1.5">
                  <a href={tab.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 rounded outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                      <span className="truncate">{tab.title}</span>
                      <ExternalLink className="h-2.5 w-2.5 shrink-0 text-muted-foreground" aria-hidden />
                    </span>
                    <span className="block truncate text-[10px] text-muted-foreground">{hostnameOf(tab.url)}</span>
                  </a>
                  <button type="button" aria-label={`Edit ${tab.title}`} onClick={() => beginEdit(index)} className="grid h-6 w-6 shrink-0 place-items-center rounded text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button type="button" aria-label={`Remove ${tab.title}`} onClick={() => removeStashTab(group.id, index)} className="grid h-6 w-6 shrink-0 place-items-center rounded text-muted-foreground outline-none hover:bg-accent hover:text-red-500 focus-visible:ring-2 focus-visible:ring-ring">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function TabStashWidget({ mode }: WidgetProps) {
  const stashes = useAppStore((s) => s.stashes)
  const createStash = useAppStore((s) => s.createStash)
  const { save, restore, message, busy } = useStashActions()
  const [name, setName] = useState('')
  const [closeAfter, setCloseAfter] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const available = hasTabsApi()
  const open = stashes.find((group) => group.id === openId) ?? null

  useEffect(() => {
    if (openId && !open) setOpenId(null)
  }, [openId, open])

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

  function startList(e: FormEvent) {
    e.preventDefault()
    if (stashes.length >= MAX_STASH_GROUPS) return
    const id = createStash(name)
    if (!id) return
    setName('')
    setOpenId(id)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {open ? (
        <OpenList group={open} onBack={() => setOpenId(null)} onRestore={(grp, newWindow) => void restore(grp, newWindow)} />
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Archive aria-hidden /> Tab stash{stashes.length > 0 && <span className="text-xs font-normal">· {plural(stashes.length, 'list')}</span>}</h3>
            {available && (
              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <input type="checkbox" checked={closeAfter} onChange={(e) => setCloseAfter(e.target.checked)} className="h-3 w-3 accent-primary" />
                Close tabs after saving
              </label>
            )}
          </div>

          <form onSubmit={startList} className="flex gap-2">
            <Input value={name} maxLength={MAX_STASH_NAME} onChange={(e) => setName(e.target.value)} placeholder="Name this list" aria-label="List name" className="h-8" autoComplete="off" />
            <Button type="submit" size="sm" disabled={stashes.length >= MAX_STASH_GROUPS} className="shrink-0">New list</Button>
          </form>
          {available && (
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void save(name, closeAfter).then((id) => { if (id) { setName(''); setOpenId(id) } })}>
              Save open tabs
            </Button>
          )}

          {message ? (
            <Message message={message} />
          ) : stashes.length === 0 ? (
            <p className="text-xs text-muted-foreground">Start a list, then add the links you want to open together.{available ? ' Or save the tabs in this window.' : ''}</p>
          ) : null}

          {stashes.length > 0 && (
            <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto" aria-label="Saved tab lists">
              {stashes.map((group) => (
                <li key={group.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(group.id)}
                    className="flex w-full items-center gap-2 rounded-lg border bg-background/30 px-2 py-1.5 text-left outline-none hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{group.name}</span>
                      <span className="block text-[11px] text-muted-foreground">{plural(group.tabs.length, 'link')} · {timeAgo(group.createdAt)}</span>
                    </span>
                    <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {open && message ? <Message message={message} /> : null}
    </div>
  )
}
