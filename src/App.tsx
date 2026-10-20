import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { Gear, ImageIcon, Moon, Sun } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { BackgroundEngine } from '@/components/background/BackgroundEngine'
import { ChordHud } from '@/components/chords/ChordHud'
import { TabHeader } from '@/components/common/TabHeader'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ModeSwitcher } from '@/components/ModeSwitcher'
import { QuickAppsDrawer } from '@/components/quickapps/QuickAppsDrawer'
import { useApplyAppearance } from '@/hooks/use-appearance'
import { useBootAnimation } from '@/hooks/use-boot-animation'
import { useHydrated } from '@/hooks/use-hydrated'
import { useKeyboardChords } from '@/hooks/useKeyboardChords'
import { useApplyTheme, useIsDark } from '@/hooks/use-theme'
import { useAppStore } from '@/store/useAppStore'

// Settings panels are only needed once opened, so they load on demand instead of weighing down every new tab.
const BackgroundSettings = lazy(() => import('@/components/background/BackgroundSettings').then((m) => ({ default: m.BackgroundSettings })))
const SettingsDialog = lazy(() => import('@/components/settings/SettingsDialog').then((m) => ({ default: m.SettingsDialog })))

/** Loads and mounts its children the first time `open` is true, then keeps them mounted so close animations can play. */
function MountOnFirstOpen({ open, children }: { open: boolean; children: ReactNode }) {
  const [wanted, setWanted] = useState(open)
  useEffect(() => {
    if (open) setWanted(true)
  }, [open])
  return wanted ? <Suspense fallback={null}>{children}</Suspense> : null
}

export default function App() {
  useApplyTheme()
  useApplyAppearance()
  const hydrated = useHydrated()
  const rootRef = useRef<HTMLDivElement>(null)
  useBootAnimation(rootRef, hydrated)
  const chordState = useKeyboardChords()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [backgroundOpen, setBackgroundOpen] = useState(false)

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
            <TabHeader />
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} aria-label="Settings">
                <Gear />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setBackgroundOpen(true)} aria-label="Background">
                <ImageIcon />
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

          <MountOnFirstOpen open={settingsOpen}>
            <SettingsDialog
              open={settingsOpen}
              onOpenChange={setSettingsOpen}
              onOpenBackground={() => {
                setSettingsOpen(false)
                setBackgroundOpen(true)
              }}
            />
          </MountOnFirstOpen>
          <MountOnFirstOpen open={backgroundOpen}>
            <BackgroundSettings open={backgroundOpen} onOpenChange={setBackgroundOpen} />
          </MountOnFirstOpen>
          <ModeSwitcher />
          <QuickAppsDrawer />
        </>
      )}
    </div>
  )
}
