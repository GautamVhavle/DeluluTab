import { useEffect, useState } from 'react'
import { useHydrated } from '@/hooks/use-hydrated'
import { useAppStore } from '@/store/useAppStore'

/** Applies settings.theme to <html>; 'dynamic' follows the OS color scheme. */
export function useApplyTheme() {
  const theme = useAppStore((s) => s.settings.theme)
  // Until saved settings load, `theme` is just the default. Acting on it would flip the page to dark for a
  // moment (and overwrite the mirror below) for anyone who chose light; public/theme-boot.js covers that gap.
  const hydrated = useHydrated()

  useEffect(() => {
    if (!hydrated) return
    // Mirror the theme into localStorage so public/theme-boot.js can apply it before first paint.
    try {
      localStorage.setItem('delulutab:theme', theme)
    } catch {
      // Storage blocked: the next load just starts dark.
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'dynamic' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    if (theme !== 'dynamic') return
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme, hydrated])
}

/** Whether the page is currently rendering dark (resolves 'dynamic' against the OS). */
export function useIsDark() {
  const theme = useAppStore((s) => s.settings.theme)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemDark(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return theme === 'dark' || (theme === 'dynamic' && systemDark)
}
