import { useEffect, useRef, useState } from 'react'
import { Trash2 } from '@/lib/icons'
import { MAX_WIDGET_CODE, MAX_WIDGET_NAME } from '@/lib/widgetLayout'
import { WIDGET_FRAME_SANDBOX, WIDGET_MESSAGE, widgetSandboxUrl } from '@/lib/widgetSandbox'
import { cn } from '@/lib/utils'
import { useIsDark } from '@/hooks/use-theme'
import { useAppStore, type CustomWidget } from '@/store/useAppStore'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

const SANDBOX_URL = widgetSandboxUrl()
const TABS = [
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'js', label: 'JS' },
] as const

type CodeTab = (typeof TABS)[number]['id']

/**
 * Renders one custom widget in a sandboxed iframe. The frame cannot read DeluluTab state, chrome APIs,
 * or this page. Only the widget's own HTML, CSS and JS are posted in.
 */
export function CustomCodeWidget({ widget }: { widget: CustomWidget }) {
  const dark = useIsDark()
  const theme = dark ? 'dark' : 'light'
  const frame = useRef<HTMLIFrameElement>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const payload = `${theme}\0${widget.html}\0${widget.css}\0${widget.js}`
  const skip = useRef(true)

  useEffect(() => {
    if (skip.current) {
      skip.current = false
      return
    }
    const timer = window.setTimeout(() => setRevision((n) => n + 1), 280)
    return () => window.clearTimeout(timer)
  }, [payload])

  useEffect(() => setError(''), [revision])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return
      const data = event.data as { type?: string; message?: string } | null
      if (!data || data.type !== WIDGET_MESSAGE.error || typeof data.message !== 'string') return
      setError(data.message.slice(0, 300))
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  if (!widget.html.trim() && !widget.css.trim() && !widget.js.trim()) {
    return <div className="grid h-full place-items-center text-sm text-muted-foreground">Empty widget</div>
  }

  const publish = () => {
    frame.current?.contentWindow?.postMessage(
      { type: WIDGET_MESSAGE.render, html: widget.html, css: widget.css, js: widget.js, theme },
      '*',
    )
  }

  return (
    <div className="relative h-full min-h-0">
      <iframe
        key={revision}
        ref={frame}
        title={widget.name || 'Custom widget'}
        sandbox={WIDGET_FRAME_SANDBOX}
        src={SANDBOX_URL}
        referrerPolicy="no-referrer"
        onLoad={publish}
        className="h-full w-full border-0 bg-transparent"
      />
      {error && (
        <p className="pointer-events-none absolute inset-x-2 bottom-2 truncate rounded bg-red-500/90 px-2 py-1 text-[11px] text-white" role="status">
          {error}
        </p>
      )}
    </div>
  )
}

/** Editor for the custom widget currently selected in the store. Mounted once, from the app shell. */
export function CustomWidgetEditor() {
  const id = useAppStore((s) => s.customEditorId)
  const widget = useAppStore((s) => s.customWidgets.find((w) => w.id === id) ?? null)
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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogTitle>Custom widget</DialogTitle>
        <DialogDescription>
          HTML, CSS and JavaScript run in a sandbox. They cannot read your notes, tabs, or the rest of DeluluTab. HTTPS embeds are allowed. External script tags are ignored.
        </DialogDescription>
        {widget && (
          <div className="grid gap-3">
            <Input
              aria-label="Widget name"
              value={widget.name}
              maxLength={MAX_WIDGET_NAME}
              onChange={(e) => update(widget.id, { name: e.target.value })}
            />
            <div role="tablist" aria-label="Code language" className="flex gap-1">
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
              className="min-h-40 w-full resize-y rounded-lg border bg-background/70 p-3 font-mono text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <p className="text-right text-[11px] text-muted-foreground">{widget[tab].length.toLocaleString()} / {MAX_WIDGET_CODE.toLocaleString()}</p>
            <div className="h-44 overflow-hidden rounded-xl border bg-card/40">
              <CustomCodeWidget widget={widget} />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => { if (confirming) remove(widget.id); else setConfirming(true) }}
              >
                <Trash2 /> {confirming ? 'Confirm delete' : 'Delete widget'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
