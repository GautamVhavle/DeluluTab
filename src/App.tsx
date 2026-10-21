import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { Gear, ImageIcon, Moon, Sun } from '@/components/common/icons'
import { Button } from '@/components/common/button'
import { BackgroundEngine } from '@/components/background/BackgroundEngine'
import { TabHeader } from '@/components/common/TabHeader'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ModeSwitcher } from '@/components/layout/ModeSwitcher'
import { MiniAppsButton } from '@/components/quickapps/MiniAppsButton'
import { useApplyAppearance } from '@/hooks/use-appearance'
import { useApplyFont } from '@/hooks/use-font'
import { useHydrated } from '@/hooks/use-hydrated'
import { useKeyboardChords } from '@/hooks/useKeyboardChords'
import type { ChordEngineState } from '@/utils/chords'
import { useApplyTheme, useIsDark } from '@/hooks/use-theme'
import { useAppStore } from '@/store/useAppStore'
import { onIdle } from '@/utils/idle'

// Nothing below the first screen is in the opening bundle. Each of these loads when it is actually needed.
const BackgroundSettings = lazy(() => import('@/components/background/BackgroundSettings').then((m) => ({ default: m.BackgroundSettings })))
const SettingsDialog = lazy(() => import('@/components/settings/SettingsDialog').then((m) => ({ default: m.SettingsDialog })))
const NewsRail = lazy(() => import('@/components/widgets/NewsRail').then((m) => ({ default: m.NewsRail })))
const ChordHud = lazy(() => import('@/components/chords/ChordHud').then((m) => ({ default: m.ChordHud })))
const CustomWidgetEditor = lazy(() => import('@/components/widgets/CustomWidgetEditor').then((m) => ({ default: m.CustomWidgetEditor })))

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
  useApplyFont()
  const hydrated = useHydrated()
  const chordState = useKeyboardChords()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [backgroundOpen, setBackgroundOpen] = useState(false)

  const updateSettings = useAppStore((s) => s.updateSettings)
  const isDark = useIsDark()
  const focusLayout = useAppStore((s) => s.settings.layoutMode) === 'focus'
  const editingWidget = useAppStore((s) => s.customEditorId !== null)

  return (
    <div className="flex min-h-full flex-col text-slate-900 transition-colors dark:text-slate-100">
      <ChordLayer state={chordState} />
      {hydrated && (
        <>
          <BackgroundEngine />
          <header data-boot="header" className="wallpaper-ink flex items-center justify-between px-6 py-4">
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

          <div data-boot="dashboard" className="flex flex-1 flex-col pb-6">
            <DashboardLayout />
          </div>
          {!focusLayout && <DeferredNews />}

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
          <a
            href="https://gautamvhavle.xyz/"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-16 left-4 z-40 rounded-full border border-white/20 bg-white/40 px-3 py-1.5 text-xs text-muted-foreground shadow-lg backdrop-blur-xl transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-white/10 dark:bg-white/10"
          >
            made with ❤️ by <span className="font-bold text-foreground">Gautam Vhavle</span>
          </a>
          <ModeSwitcher />
          <MiniAppsButton />
          {editingWidget && (
            <Suspense fallback={null}>
              <CustomWidgetEditor />
            </Suspense>
          )}
        </>
      )}
    </div>
  )
}

/** News sits below the dashboard, so its code and the feed wait until the tab has painted. */
function DeferredNews() {
  const [show, setShow] = useState(false)
  useEffect(() => onIdle(() => setShow(true), 700), [])
  if (!show) return null
  return (
    <Suspense fallback={null}>
      <div className="pb-20">
        <NewsRail />
      </div>
    </Suspense>
  )
}

/** The chord display is only fetched once a chord starts, and warmed up while the browser is idle. */
function ChordLayer({ state }: { state: ChordEngineState }) {
  const [seen, setSeen] = useState(false)
  useEffect(() => onIdle(() => void import('@/components/chords/ChordHud'), 1600), [])
  useEffect(() => {
    if (state.status !== 'idle') setSeen(true)
  }, [state.status])
  if (!seen) return null
  return (
    <Suspense fallback={null}>
      <ChordHud state={state} />
    </Suspense>
  )
}
