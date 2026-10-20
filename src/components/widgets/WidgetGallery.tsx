import type { DragEvent, ReactNode } from 'react'
import { WIDGET_CATALOG } from '@/config/widgetCatalog'
import { Check, Code, Plus } from '@/components/common/icons'
import { cn } from '@/utils/cn'
import { customGridId } from '@/utils/widgetLayout'
import { useAppStore } from '@/store/useAppStore'
import { setDraggingWidget } from './widgetDrag'
import { WIDGET_ICONS } from './widgetIcons'

function startDrag(e: DragEvent, id: string) {
  e.dataTransfer.setData('application/x-delulutab-widget', id)
  e.dataTransfer.setData('text/plain', id)
  e.dataTransfer.effectAllowed = 'copy'
  setDraggingWidget(id)
}

function GalleryCard({
  id,
  icon,
  title,
  body,
  note,
  added,
  onAdd,
}: {
  id: string
  icon: ReactNode
  title: string
  body: string
  note?: string
  added: boolean
  onAdd: () => void
}) {
  return (
    <li className="w-56 shrink-0 snap-start">
      <article
        aria-label={title}
        draggable={!added}
        onDragStart={(e) => !added && startDrag(e, id)}
        onDragEnd={() => setDraggingWidget(null)}
        className={cn(
          'group flex h-full flex-col gap-1.5 rounded-xl border border-white/10 bg-background/70 p-3 transition-colors',
          added ? 'opacity-55' : 'cursor-grab hover:border-primary/50 hover:bg-background/90 active:cursor-grabbing',
        )}
      >
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">{icon}</span>
          <h3 className="min-w-0 flex-1 truncate text-sm font-medium">{title}</h3>
          <button
            type="button"
            disabled={added}
            onClick={onAdd}
            aria-label={added ? `${title} is on the dashboard` : `Add ${title}`}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground outline-none transition-transform hover:scale-110 disabled:bg-secondary disabled:text-muted-foreground disabled:hover:scale-100 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {added ? <Check className="h-3 w-3" aria-hidden /> : <Plus className="h-3 w-3" aria-hidden />}
          </button>
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">{body}</p>
        {note && <p className="mt-auto line-clamp-2 text-[11px] leading-snug text-muted-foreground/80">{note}</p>}
      </article>
    </li>
  )
}

/**
 * The tray that opens in edit mode. Hidden widgets live here until they are dragged onto the grid
 * or added with the button. A new catalog entry shows up here on its own.
 */
export function WidgetGallery() {
  const widgets = useAppStore((s) => s.widgets)
  const customWidgets = useAppStore((s) => s.customWidgets)
  const setWidgetVisible = useAppStore((s) => s.setWidgetVisible)
  const updateCustomWidget = useAppStore((s) => s.updateCustomWidget)
  const mode = useAppStore((s) => s.settings.layoutMode)

  const entries = [...WIDGET_CATALOG].sort((a, b) => Number(widgets[a.key]) - Number(widgets[b.key]))
  const available = entries.filter((entry) => !widgets[entry.key]).length + customWidgets.filter((w) => !w.enabled).length

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-30 px-3 sm:px-6">
      <section
        aria-label="Add a widget"
        className="pointer-events-auto mx-auto max-w-6xl rounded-2xl border border-white/15 bg-card/85 p-3 shadow-2xl backdrop-blur-xl"
      >
        <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
          <h2 className="text-sm font-medium">
            Widgets <span className="font-normal text-muted-foreground">· {available ? `${available} to add` : 'all on the dashboard'}</span>
          </h2>
          <p className="hidden text-xs text-muted-foreground sm:block">Drag a card onto the dashboard or press +. The red minus takes a widget off.</p>
        </div>
        <ul className="flex snap-x gap-2 overflow-x-auto pb-1 [mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)]">
          {entries.map((entry) => {
            const Icon = WIDGET_ICONS[entry.key]
            const note = mode === 'focus' && !entry.focus ? 'Shows in Detailed and Compact.' : entry.localSetup
            return (
              <GalleryCard
                key={entry.key}
                id={entry.key}
                icon={<Icon className="h-3.5 w-3.5" aria-hidden />}
                title={entry.label}
                body={entry.gallery}
                note={note}
                added={widgets[entry.key]}
                onAdd={() => setWidgetVisible(entry.key, true)}
              />
            )
          })}
          {customWidgets.filter((widget) => !widget.enabled).map((widget) => (
            <GalleryCard
              key={widget.id}
              id={customGridId(widget.id)}
              icon={<Code className="h-3.5 w-3.5" aria-hidden />}
              title={widget.name || 'Custom widget'}
              body="Your sandboxed HTML widget."
              added={false}
              onAdd={() => updateCustomWidget(widget.id, { enabled: true })}
            />
          ))}
          <li aria-hidden className="w-6 shrink-0" />
        </ul>
      </section>
    </div>
  )
}
