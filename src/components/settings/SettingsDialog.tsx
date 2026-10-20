import { useState, type KeyboardEvent } from 'react'
import type { IconType } from 'react-icons'
import { Export, Info, Keyboard, Palette, Widgets } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ChordsPanel } from '@/components/chords/ChordsPanel'
import { AppearancePanel } from './AppearancePanel'
import { BackupPanel } from './BackupPanel'
import { GeneralPanel } from './GeneralPanel'
import { WidgetsPanel } from './WidgetsPanel'

export type SettingsTab = 'general' | 'appearance' | 'widgets' | 'chords' | 'backup'

const TABS: { id: SettingsTab; label: string; title: string; Icon: IconType }[] = [
  { id: 'general', label: 'General', title: 'General & metadata', Icon: Info },
  { id: 'appearance', label: 'Appearance', title: 'Appearance & layout', Icon: Palette },
  { id: 'widgets', label: 'Widgets', title: 'Widgets', Icon: Widgets },
  { id: 'chords', label: 'Chords', title: 'Chords & shortcuts', Icon: Keyboard },
  { id: 'backup', label: 'Backup & reset', title: 'Backup & reset', Icon: Export },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Closes this dialog and opens the live background panel (which needs the page visible behind it). */
  onOpenBackground: () => void
}

/** Settings in one place. The backdrop is only lightly dimmed so appearance changes stay visible as you make them. */
export function SettingsDialog({ open, onOpenChange, onOpenBackground }: Props) {
  const [tab, setTab] = useState<SettingsTab>('general')
  const current = TABS.find((t) => t.id === tab)!

  const onTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((t) => t.id === tab)
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    if (!step && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const next = e.key === 'Home' ? TABS[0] : e.key === 'End' ? TABS[TABS.length - 1] : TABS[(index + step + TABS.length) % TABS.length]
    setTab(next.id)
    const list = e.currentTarget
    requestAnimationFrame(() => list.querySelector<HTMLElement>(`#settings-tab-${next.id}`)?.focus())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby="settings-desc"
        overlayClassName="bg-black/25 backdrop-blur-none"
        className="flex h-[min(44rem,90vh)] max-w-4xl flex-col gap-0 overflow-hidden border-white/15 bg-background/80 p-0 shadow-2xl backdrop-blur-2xl sm:flex-row"
      >
        <DialogDescription id="settings-desc" className="sr-only">Change how DeluluTab looks and behaves.</DialogDescription>

        <nav className="flex shrink-0 flex-col gap-3 border-b bg-secondary/30 p-3 sm:w-56 sm:border-b-0 sm:border-r sm:p-4">
          <DialogTitle className="px-2 pt-1 text-base sm:pt-0">Settings</DialogTitle>
          <div
            role="tablist"
            aria-label="Settings sections"
            aria-orientation="vertical"
            onKeyDown={onTabKeyDown}
            className="flex gap-1 overflow-x-auto sm:flex-col sm:overflow-visible"
          >
            {TABS.map(({ id, label, Icon }) => {
              const active = id === tab
              return (
                <button
                  key={id}
                  id={`settings-tab-${id}`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls="settings-panel"
                  tabIndex={active ? 0 : -1}
                  onClick={() => setTab(id)}
                  className={cn(
                    'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                    active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {label}
                </button>
              )
            })}
          </div>
        </nav>

        <div id="settings-panel" role="tabpanel" aria-labelledby={`settings-tab-${tab}`} className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
          <h2 className="mb-6 text-lg font-semibold tracking-tight">{current.title}</h2>
          {tab === 'general' && <GeneralPanel />}
          {tab === 'appearance' && <AppearancePanel onOpenBackground={onOpenBackground} />}
          {tab === 'widgets' && <WidgetsPanel onClose={() => onOpenChange(false)} />}
          {tab === 'chords' && <ChordsPanel />}
          {tab === 'backup' && <BackupPanel />}
        </div>
      </DialogContent>
    </Dialog>
  )
}
