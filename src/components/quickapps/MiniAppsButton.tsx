import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { onIdle } from '@/utils/idle'
import { useAppStore } from '@/store/useAppStore'

const QuickAppsDrawer = lazy(() => import('./QuickAppsDrawer').then((m) => ({ default: m.QuickAppsDrawer })))

/** The corner button is tiny. The launchpad itself loads the first time it is opened. */
export function MiniAppsButton() {
  const [open, setOpen] = useState(false)
  const [live, setLive] = useState(false)
  const openTasks = useAppStore((s) => s.todos.filter((todo) => !todo.done).length)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => onIdle(() => void import('./QuickAppsDrawer'), 1800), [])
  useEffect(() => {
    if (open) setLive(true)
  }, [open])

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open mini apps"
          title="Mini apps"
          className="fixed bottom-4 right-4 z-40 grid h-11 w-11 place-items-center rounded-2xl border bg-card/80 text-foreground shadow-lg outline-none backdrop-blur-md transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
        >
          <LayoutGlyph />
          {openTasks > 0 && (
            <span aria-label={`${openTasks} open tasks`} className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {openTasks > 99 ? '99+' : openTasks}
            </span>
          )}
        </button>
      )}
      {live && (
        <Suspense fallback={open ? <div className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm" /> : null}>
          <QuickAppsDrawer open={open} onClose={close} />
        </Suspense>
      )}
    </>
  )
}

function LayoutGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <g fill="currentColor">
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </g>
    </svg>
  )
}
