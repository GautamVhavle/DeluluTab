import { useRef, useState } from 'react'
import { ImageIcon, Keyboard, Moon, SlidersHorizontal, Sparkles, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BackgroundEngine } from '@/components/background/BackgroundEngine'
import { BackgroundSettings } from '@/components/background/BackgroundSettings'
import { ChordHud } from '@/components/chords/ChordHud'
import { ChordManager } from '@/components/chords/ChordManager'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ModeSwitcher } from '@/components/ModeSwitcher'
import { WidgetSettings } from '@/components/settings/WidgetSettings'
import { useBootAnimation } from '@/hooks/use-boot-animation'
import { useHydrated } from '@/hooks/use-hydrated'
import { useKeyboardChords } from '@/hooks/useKeyboardChords'
import { useApplyTheme, useIsDark } from '@/hooks/use-theme'
import { useAppStore } from '@/store/useAppStore'

export default function App() {
  useApplyTheme()
  const hydrated = useHydrated()
  const rootRef = useRef<HTMLDivElement>(null)
  useBootAnimation(rootRef, hydrated)
  const chordState = useKeyboardChords()
  const [chordsOpen, setChordsOpen] = useState(false)
  const [backgroundOpen, setBackgroundOpen] = useState(false)
  const [widgetsOpen, setWidgetsOpen] = useState(false)

  const updateSettings = useAppStore((s) => s.updateSettings)
  const isDark = useIsDark()

  return (
    <div
      ref={rootRef}
      className="flex min-h-full flex-col text-slate-900 transition-colors dark:text-slate-100"
    >
      {/* Wait for persisted state so the saved layout doesn't visibly re-animate on boot. */}
      <ChordHud state={chordState} />
      {hydrated && (
        <>
          <BackgroundEngine />
          <header data-boot="header" className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Sparkles className="h-4 w-4 text-violet-500 dark:text-violet-400" />
              DeluluTab
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setWidgetsOpen(true)} aria-label="Widgets">
                <SlidersHorizontal />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setBackgroundOpen(true)} aria-label="Background">
                <ImageIcon />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setChordsOpen(true)} aria-label="Keyboard chords">
                <Keyboard />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })}
                aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              >
                {isDark ? <Sun /> : <Moon />}
              </Button>
            </div>
          </header>

          <div data-boot="dashboard" className="flex flex-1 flex-col pb-20">
            <DashboardLayout />
          </div>

          <WidgetSettings open={widgetsOpen} onOpenChange={setWidgetsOpen} />
          <BackgroundSettings open={backgroundOpen} onOpenChange={setBackgroundOpen} />
          <ChordManager open={chordsOpen} onOpenChange={setChordsOpen} />
          <ModeSwitcher />
        </>
      )}
    </div>
  )
}
