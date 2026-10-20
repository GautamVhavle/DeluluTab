import { useRef } from 'react'
import { Moon, Sparkles, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ModeSwitcher } from '@/components/ModeSwitcher'
import { StateDebugPanel } from '@/components/StateDebugPanel'
import { useBootAnimation } from '@/hooks/use-boot-animation'
import { useHydrated } from '@/hooks/use-hydrated'
import { useApplyTheme } from '@/hooks/use-theme'
import { useAppStore } from '@/store/useAppStore'

export default function App() {
  useApplyTheme()
  const hydrated = useHydrated()
  const rootRef = useRef<HTMLDivElement>(null)
  useBootAnimation(rootRef, hydrated)

  const theme = useAppStore((s) => s.settings.theme)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const isDark =
    theme === 'dark' || (theme === 'dynamic' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <div
      ref={rootRef}
      className="flex min-h-full flex-col bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100"
    >
      {/* Wait for persisted state so the saved layout doesn't visibly re-animate on boot. */}
      {hydrated && (
        <>
          <header data-boot="header" className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Sparkles className="h-4 w-4 text-violet-500 dark:text-violet-400" />
              DeluluTab
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })}
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            >
              {isDark ? <Sun /> : <Moon />}
            </Button>
          </header>

          <div data-boot="dashboard" className="flex flex-1 flex-col pb-20">
            <DashboardLayout />
          </div>

          <ModeSwitcher />
          <StateDebugPanel />
        </>
      )}
    </div>
  )
}
