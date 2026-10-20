import { useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Calculator, CheckSquare, NotebookPen, PanelRightOpen, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore, type QuickAppsTab } from '@/store/useAppStore'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { CalcApp } from './CalcApp'
import { NotesApp } from './NotesApp'
import { TodoApp } from './TodoApp'

const TABS: { id: QuickAppsTab; label: string; Icon: LucideIcon }[] = [
  { id: 'notes', label: 'Notes', Icon: NotebookPen },
  { id: 'todos', label: 'Tasks', Icon: CheckSquare },
  { id: 'calc', label: 'Calculator', Icon: Calculator },
]

const PANELS: Record<QuickAppsTab, () => React.JSX.Element> = {
  notes: NotesApp,
  todos: TodoApp,
  calc: CalcApp,
}

/** Floating button + side drawer holding the mini tools. Named "Mini tools" in the UI to keep it distinct from the Quick apps shortcut widget. */
export function QuickAppsDrawer() {
  const [open, setOpen] = useState(false)
  const tab = useAppStore((s) => s.settings.quickAppsTab)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const openTasks = useAppStore((s) => s.todos.filter((t) => !t.done).length)
  const content = useRef<HTMLDivElement>(null)

  const focusPrimaryField = () => content.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()

  const selectTab = (id: QuickAppsTab, focusField: boolean) => {
    updateSettings({ quickAppsTab: id })
    // Wait for the new panel to mount before moving focus into it.
    if (focusField) requestAnimationFrame(focusPrimaryField)
  }

  const onTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((t) => t.id === tab)
    const target =
      e.key === 'ArrowRight' ? TABS[(index + 1) % TABS.length]
      : e.key === 'ArrowLeft' ? TABS[(index - 1 + TABS.length) % TABS.length]
      : e.key === 'Home' ? TABS[0]
      : e.key === 'End' ? TABS[TABS.length - 1]
      : null
    if (!target) return
    e.preventDefault()
    selectTab(target.id, false)
    const list = e.currentTarget
    requestAnimationFrame(() => list.querySelector<HTMLElement>(`#qa-tab-${target.id}`)?.focus())
  }

  const Panel = PANELS[tab]

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="trigger"
            onClick={() => setOpen(true)}
            aria-label="Open mini tools"
            title="Notes, tasks and calculator"
            initial={{ opacity: 0, scale: 0.8, x: 12 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 12 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            className="fixed bottom-4 right-4 z-40 grid h-11 w-11 place-items-center rounded-full border bg-card/80 text-foreground shadow-lg outline-none backdrop-blur-md transition-colors hover:bg-card focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PanelRightOpen className="h-5 w-5" />
            {openTasks > 0 && (
              <span aria-label={`${openTasks} open tasks`} className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {openTasks > 99 ? '99+' : openTasks}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          ref={content}
          className="max-w-md"
          aria-describedby="mini-tools-desc"
          // Notes shouldn't vanish because you clicked the page; close with the X, Esc, or the trigger.
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            focusPrimaryField()
          }}
        >
          <SheetHeader>
            <SheetTitle>Mini tools</SheetTitle>
            <SheetDescription id="mini-tools-desc" className="sr-only">Quick notes, a task list and a calculator.</SheetDescription>
          </SheetHeader>

          <div role="tablist" aria-label="Mini tools" onKeyDown={onTabKeyDown} className="relative grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
            {TABS.map(({ id, label, Icon }) => {
              const active = id === tab
              return (
                <button
                  key={id}
                  id={`qa-tab-${id}`}
                  role="tab"
                  aria-selected={active}
                  aria-controls="qa-panel"
                  tabIndex={active ? 0 : -1}
                  onClick={() => selectTab(id, true)}
                  className={cn(
                    'relative flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                    active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {active && <motion.span layoutId="qa-tab-pill" className="absolute inset-0 rounded-lg bg-background shadow-sm" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                  <Icon className="relative h-4 w-4" />
                  <span className="relative">{label}</span>
                </button>
              )
            })}
          </div>

          <div id="qa-panel" role="tabpanel" aria-labelledby={`qa-tab-${tab}`} className="min-h-0 flex-1">
            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="h-full">
              <Panel />
            </motion.div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
