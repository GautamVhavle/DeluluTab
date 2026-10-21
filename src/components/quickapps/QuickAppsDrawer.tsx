import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Calculator, CheckSquare, Code, Hourglass, NotebookPen, Plus, Stopwatch, Trash2, type IconType } from '@/components/common/icons'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { WIDGET_FRAME_SANDBOX, WIDGET_MESSAGE, widgetSandboxUrl } from '@/services/widgetSandbox'
import { cn } from '@/utils/cn'
import { useIsDark } from '@/hooks/use-theme'
import { useAppStore } from '@/store/useAppStore'

const SANDBOX_URL = widgetSandboxUrl()

type BuiltinId = 'notes' | 'todos' | 'calc' | 'timer' | 'stopwatch'

const BUILTIN: { id: BuiltinId; label: string; hint: string; Icon: IconType; tint: string }[] = [
  { id: 'notes', label: 'Notes', hint: 'A page for whatever you’re thinking', Icon: NotebookPen, tint: 'bg-amber-400 text-amber-950' },
  { id: 'todos', label: 'Tasks', hint: 'A short list', Icon: CheckSquare, tint: 'bg-emerald-500 text-white' },
  { id: 'calc', label: 'Calculator', hint: 'Math and unit conversion', Icon: Calculator, tint: 'bg-orange-500 text-white' },
  { id: 'timer', label: 'Timer', hint: 'Count down a few minutes', Icon: Hourglass, tint: 'bg-sky-500 text-white' },
  { id: 'stopwatch', label: 'Stopwatch', hint: 'Start, lap, reset', Icon: Stopwatch, tint: 'bg-violet-500 text-white' },
]

const PANELS: Record<BuiltinId, React.LazyExoticComponent<() => React.JSX.Element>> = {
  notes: lazy(() => import('./NotesApp').then((m) => ({ default: m.NotesApp }))),
  todos: lazy(() => import('./TodoApp').then((m) => ({ default: m.TodoApp }))),
  calc: lazy(() => import('./CalcApp').then((m) => ({ default: m.CalcApp }))),
  timer: lazy(() => import('./TimerApp').then((m) => ({ default: m.TimerApp }))),
  stopwatch: lazy(() => import('./StopwatchApp').then((m) => ({ default: m.StopwatchApp }))),
}

const isBuiltin = (id: string): id is BuiltinId => id in PANELS

/** Launchpad of mini apps. Built-in tools, plus HTML apps the user writes. */
export function QuickAppsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [active, setActive] = useState<string | null>(null)
  const miniApps = useAppStore((s) => s.miniApps)

  const close = () => {
    setActive(null)
    onClose()
  }

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-950/55 px-4 py-10 backdrop-blur-xl sm:py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          >
            <motion.div
              role="dialog"
              aria-label="Mini apps"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl"
            >
              {active === null && (
                <Launchpad
                  apps={miniApps}
                  onOpen={setActive}
                  onClose={close}
                />
              )}
              {active === 'new' && <AppEditor onBack={() => setActive(null)} onSaved={(id) => setActive(`app:${id}`)} />}
              {active?.startsWith('edit:') && (
                <AppEditor id={active.slice(5)} onBack={() => setActive(null)} onSaved={(id) => setActive(`app:${id}`)} />
              )}
              {active && isBuiltin(active) && <AppStage title={BUILTIN.find((app) => app.id === active)!.label} onBack={() => setActive(null)}>{(() => { const Panel = PANELS[active]; return <Suspense fallback={<div aria-busy className="h-64 animate-pulse rounded-2xl bg-white/10" />}><Panel /></Suspense> })()}</AppStage>}
              {active?.startsWith('app:') && <CustomStage id={active.slice(4)} onBack={() => setActive(null)} onEdit={() => setActive(`edit:${active.slice(4)}`)} />}
            </motion.div>
          </motion.div>
        )}
    </AnimatePresence>
  )
}

function Launchpad({ apps, onOpen, onClose }: { apps: { id: string; name: string }[]; onOpen: (id: string) => void; onClose: () => void }) {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between text-white">
        <h2 className="text-lg font-semibold tracking-tight">Mini apps</h2>
        <button type="button" onClick={onClose} className="rounded-full bg-white/15 px-3 py-1 text-sm outline-none hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white">Close</button>
      </div>
      <ul className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-5">
        {BUILTIN.map((app) => (
          <li key={app.id}>
            <LaunchIcon label={app.label} tint={app.tint} onClick={() => onOpen(app.id)}>
              <app.Icon className="h-7 w-7" />
            </LaunchIcon>
          </li>
        ))}
        {apps.map((app) => (
          <li key={app.id} className="relative">
            <LaunchIcon label={app.name} tint="bg-white text-slate-900" onClick={() => onOpen(`app:${app.id}`)}>
              <span className="text-xl font-semibold">{app.name.trim().slice(0, 1).toUpperCase() || 'A'}</span>
            </LaunchIcon>
            <button
              type="button"
              aria-label={`Edit ${app.name}`}
              onClick={() => onOpen(`edit:${app.id}`)}
              className="absolute right-2 top-0 grid h-6 w-6 place-items-center rounded-full bg-black/50 text-[10px] text-white"
            >
              <Code className="h-3 w-3" />
            </button>
          </li>
        ))}
        <li>
          <LaunchIcon label="New" tint="bg-white/10 text-white ring-1 ring-white/30" onClick={() => onOpen('new')}>
            <Plus className="h-7 w-7" />
          </LaunchIcon>
        </li>
      </ul>
    </div>
  )
}

function LaunchIcon({ label, tint, onClick, children }: { label: string; tint: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="group flex w-full flex-col items-center gap-2 outline-none">
      <span className={cn('grid h-16 w-16 place-items-center rounded-[1.35rem] shadow-lg transition duration-200 group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-white', tint)}>
        {children}
      </span>
      <span className="w-full truncate text-center text-xs font-medium text-white">{label}</span>
    </button>
  )
}

function AppStage({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return (
    <div className="flex h-[min(36rem,75vh)] flex-col overflow-hidden rounded-3xl border border-white/15 bg-background shadow-2xl">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowLeft className="h-3.5 w-3.5" /> Apps
        </button>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </div>
  )
}

function CustomStage({ id, onBack, onEdit }: { id: string; onBack: () => void; onEdit: () => void }) {
  const app = useAppStore((s) => s.miniApps.find((item) => item.id === id))
  if (!app) return <AppStage title="Mini app" onBack={onBack}><p className="text-sm text-muted-foreground">That app is gone.</p></AppStage>
  return (
    <AppStage title={app.name} onBack={onBack}>
      <div className="mb-3 flex justify-end">
        <Button type="button" size="sm" variant="secondary" onClick={onEdit}><Code /> Edit HTML</Button>
      </div>
      <div className="h-[calc(100%-2.5rem)] min-h-64 overflow-hidden rounded-2xl border">
        <HtmlFrame title={app.name} html={app.html} />
      </div>
    </AppStage>
  )
}

function AppEditor({ id, onBack, onSaved }: { id?: string; onBack: () => void; onSaved: (id: string) => void }) {
  const existing = useAppStore((s) => s.miniApps.find((item) => item.id === id))
  const add = useAppStore((s) => s.addMiniApp)
  const update = useAppStore((s) => s.updateMiniApp)
  const remove = useAppStore((s) => s.removeMiniApp)
  const [name, setName] = useState(existing?.name ?? '')
  const [html, setHtml] = useState(existing?.html ?? '<h1 style="font-family:sans-serif">Hello</h1>\n<p>Write HTML here.</p>')

  return (
    <AppStage title={id ? 'Edit mini app' : 'New mini app'} onBack={onBack}>
      <div className="grid gap-3">
        <Input aria-label="App name" value={name} maxLength={40} placeholder="Name" onChange={(e) => setName(e.target.value)} />
        <textarea
          aria-label="App HTML"
          value={html}
          maxLength={20000}
          spellCheck={false}
          onChange={(e) => setHtml(e.target.value)}
          className="min-h-36 w-full resize-y rounded-xl border bg-background p-3 font-mono text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div className="h-40 overflow-hidden rounded-2xl border">
          <HtmlFrame title="Preview" html={html} />
        </div>
        <div className="flex justify-between gap-2">
          {id ? (
            <Button type="button" variant="destructive" size="sm" onClick={() => { remove(id); onBack() }}>
              <Trash2 /> Delete
            </Button>
          ) : <span />}
          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (id) {
                update(id, { name, html })
                onSaved(id)
              } else {
                const created = add({ name, html })
                if (created) onSaved(created)
              }
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </AppStage>
  )
}

function HtmlFrame({ title, html }: { title: string; html: string }) {
  const dark = useIsDark()
  const frame = useRef<HTMLIFrameElement>(null)
  const theme = dark ? 'dark' : 'light'

  const publish = () => {
    frame.current?.contentWindow?.postMessage({ type: WIDGET_MESSAGE.render, html, css: '', js: '', theme }, '*')
  }

  useEffect(() => {
    publish()
    // The sandbox applies the document when it loads, and again when the HTML changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, theme])

  return (
    <iframe
      ref={frame}
      title={title}
      sandbox={WIDGET_FRAME_SANDBOX}
      src={SANDBOX_URL}
      referrerPolicy="no-referrer"
      onLoad={publish}
      className="h-full w-full border-0 bg-transparent"
    />
  )
}

