import { useEffect, useState } from 'react'
import { ArrowLeft, Trash2 } from '@/components/common/icons'
import { Button } from '@/components/common/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/common/dialog'
import { Input } from '@/components/common/input'
import { MAX_WIDGET_CODE, MAX_WIDGET_NAME } from '@/utils/widgetLayout'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/store/useAppStore'
import { CustomCodeWidget } from './CustomCodeWidget'

const TABS = [
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'js', label: 'JS' },
] as const

type CodeTab = (typeof TABS)[number]['id']

const PREVIEW = 'min-h-0 flex-1 overflow-hidden rounded-2xl border border-black/10 bg-white/85 shadow-sm dark:border-white/10 dark:bg-slate-950/75'

/** Editor for the custom widget currently selected in the store. Loaded only while one is open. */
export function CustomWidgetEditor() {
  const id = useAppStore((s) => s.customEditorId)
  const widget = useAppStore((s) => s.customWidgets.find((item) => item.id === id) ?? null)
  const update = useAppStore((s) => s.updateCustomWidget)
  const remove = useAppStore((s) => s.removeCustomWidget)
  const close = useAppStore((s) => s.setCustomEditorId)
  const [tab, setTab] = useState<CodeTab>('html')
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    setTab('html')
    setConfirming(false)
  }, [id])

  return (
    <Dialog open={widget !== null} onOpenChange={(open) => { if (!open) close(null) }}>
      <DialogContent className="flex h-[min(44rem,92vh)] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b px-4 py-3 pr-12">
          <Button type="button" variant="ghost" size="sm" onClick={() => close(null)}>
            <ArrowLeft /> Back
          </Button>
          <DialogTitle className="sr-only">Custom widget</DialogTitle>
          {widget && (
            <Input
              aria-label="Widget name"
              value={widget.name}
              maxLength={MAX_WIDGET_NAME}
              onChange={(e) => update(widget.id, { name: e.target.value })}
              className="h-9 max-w-xs border-transparent bg-transparent px-2 text-base font-semibold shadow-none focus-visible:border-input"
            />
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto text-muted-foreground hover:text-destructive"
            onClick={() => { if (widget && confirming) remove(widget.id); else setConfirming(true) }}
          >
            <Trash2 /> {confirming ? 'Confirm delete' : 'Delete'}
          </Button>
        </div>
        <DialogDescription className="sr-only">
          HTML, CSS and JavaScript run in a sandbox. They cannot read your notes, tabs, or the rest of DeluluTab.
        </DialogDescription>
        {widget && (
          <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)] lg:overflow-hidden">
            <div className="flex min-h-0 flex-col border-b lg:border-b-0 lg:border-r">
              <div role="tablist" aria-label="Code language" className="flex gap-1 px-4 pt-3">
                {TABS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === item.id}
                    onClick={() => setTab(item.id)}
                    className={cn(
                      'rounded-md px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      tab === item.id ? 'bg-primary text-primary-foreground' : 'bg-secondary/70 text-muted-foreground',
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <textarea
                aria-label={`${tab.toUpperCase()} code`}
                value={widget[tab]}
                maxLength={MAX_WIDGET_CODE}
                spellCheck={false}
                onChange={(e) => update(widget.id, { [tab]: e.target.value })}
                className="mx-4 mb-2 mt-3 min-h-40 flex-1 resize-none rounded-xl border bg-background/70 p-3 font-mono text-[13px] leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <p className="px-4 pb-3 text-right text-[11px] text-muted-foreground">{widget[tab].length.toLocaleString()} / {MAX_WIDGET_CODE.toLocaleString()}</p>
            </div>
            <div className="flex min-h-48 flex-col gap-2 bg-secondary/30 p-4">
              <p className="text-xs font-medium text-muted-foreground">On your new tab</p>
              <div className={PREVIEW}>
                <CustomCodeWidget widget={widget} />
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                This is the card people see. External script tags are ignored. HTTPS links can open in a new tab.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
