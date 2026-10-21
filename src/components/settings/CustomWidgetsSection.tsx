import { useState } from 'react'
import { Code, Edit, Trash2 } from '@/components/common/icons'
import { CustomCodeWidget } from '@/components/widgets/CustomCodeWidget'
import { Button } from '@/components/common/button'
import { WIDGET_TEMPLATES } from '@/config/widgetTemplates'
import { MAX_CUSTOM_WIDGETS } from '@/utils/widgetLayout'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/store/useAppStore'
import { Section } from './SettingsUi'
import { Switch } from '@/components/common/switch'

/** The widgets a person made, with a live card, plus a few places to start. */
export function CustomWidgetsSection({ onClose }: { onClose: () => void }) {
  const customWidgets = useAppStore((s) => s.customWidgets)
  const addCustomWidget = useAppStore((s) => s.addCustomWidget)
  const updateCustomWidget = useAppStore((s) => s.updateCustomWidget)
  const removeCustomWidget = useAppStore((s) => s.removeCustomWidget)
  const setCustomEditorId = useAppStore((s) => s.setCustomEditorId)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const atLimit = customWidgets.length >= MAX_CUSTOM_WIDGETS

  function start(templateId: string) {
    if (addCustomWidget(templateId)) onClose()
  }

  return (
    <Section
      title="Your own widgets"
      hint="A card you write yourself. It joins the dashboard and stays in a sandbox, so it cannot see the rest of DeluluTab. Up to 8."
    >
      {customWidgets.length > 0 && (
        <ul className="grid gap-3">
          {customWidgets.map((widget) => (
            <li key={widget.id} className="overflow-hidden rounded-2xl border">
              <div className="h-32 bg-secondary/40">
                <CustomCodeWidget widget={widget} />
              </div>
              <div className="flex items-center gap-2 px-3 py-2">
                <Code className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{widget.name.trim() || 'Custom widget'}</p>
                <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${widget.name || 'custom widget'}`} onClick={() => { setCustomEditorId(widget.id); onClose() }}>
                  <Edit />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={confirmRemove === widget.id ? `Confirm delete ${widget.name || 'custom widget'}` : `Delete ${widget.name || 'custom widget'}`}
                  onClick={() => { if (confirmRemove === widget.id) removeCustomWidget(widget.id); else setConfirmRemove(widget.id) }}
                >
                  <Trash2 />
                </Button>
                <Switch aria-label={`Show ${widget.name || 'custom widget'}`} checked={widget.enabled} onCheckedChange={(enabled) => updateCustomWidget(widget.id, { enabled })} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-3">
        {WIDGET_TEMPLATES.map((template) => (
          <div key={template.id} className={cn('overflow-hidden rounded-2xl border', atLimit && 'opacity-50')}>
            <div className="pointer-events-none h-28 bg-secondary/40" aria-hidden>
              <CustomCodeWidget widget={{ id: `preview-${template.id}`, name: template.name, html: template.html, css: template.css, js: template.js, enabled: true }} />
            </div>
            <button
              type="button"
              disabled={atLimit}
              onClick={() => start(template.id)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring enabled:hover:bg-accent/40"
            >
              <span>
                <span className="block text-sm font-medium">{template.name}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{template.blurb}</span>
              </span>
              <span className="shrink-0 text-xs font-medium text-muted-foreground">Use</span>
            </button>
          </div>
        ))}
      </div>
      {atLimit && <p className="text-xs text-muted-foreground">Eight widgets is the limit. Delete one to start another.</p>}
    </Section>
  )
}
