import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'

/** Applies settings.theme to <html>; 'dynamic' follows the OS color scheme. */
export function useApplyTheme() {
  const theme = useAppStore((s) => s.settings.theme)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'dynamic' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    if (theme !== 'dynamic') return
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}
