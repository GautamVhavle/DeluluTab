import { useEffect, useRef, useState } from 'react'
import { WIDGET_FRAME_SANDBOX, WIDGET_MESSAGE, widgetSandboxUrl } from '@/services/widgetSandbox'
import { useIsDark } from '@/hooks/use-theme'
import type { CustomWidget } from '@/store/useAppStore'

const SANDBOX_URL = widgetSandboxUrl()

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
