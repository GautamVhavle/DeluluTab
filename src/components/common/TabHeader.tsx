import { useEffect } from 'react'
import { useHydrated } from '@/hooks/use-hydrated'
import { APP_NAME, BLANK_FAVICON, msUntilNextMinute, tabTitle } from '@/lib/tabTitle'
import { useAppStore } from '@/store/useAppStore'
import { Logo } from './Logo'

const FAVICON_ID = 'app-favicon'

/** Keeps document.title and the tab icon in step with the user's choices. */
function useDocumentMeta() {
  const mode = useAppStore((s) => s.settings.tabTitleMode)
  const custom = useAppStore((s) => s.settings.tabTitleCustom)
  const format = useAppStore((s) => s.settings.clockFormat)
  const showIcon = useAppStore((s) => s.settings.showTabIcon)
  const hydrated = useHydrated()

  useEffect(() => {
    if (!hydrated) return
    const apply = () => {
      document.title = tabTitle({ mode, custom, format, now: new Date() })
    }
    apply()
    if (mode !== 'time') return

    // "10:42 AM - DeluluTab": change only when the minute does, and catch up when the tab becomes visible again.
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      timer = setTimeout(() => {
        apply()
        schedule()
      }, msUntilNextMinute())
    }
    schedule()
    const onVisible = () => !document.hidden && apply()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [hydrated, mode, custom, format])

  useEffect(() => {
    if (!hydrated) return
    const current = document.getElementById(FAVICON_ID) as HTMLLinkElement | null
    const original = current?.dataset.original ?? current?.getAttribute('href') ?? './logo.svg'
    // Browsers only refresh a tab icon reliably when the <link> element is replaced, not when its href changes.
    const next = document.createElement('link')
    next.id = FAVICON_ID
    next.rel = 'icon'
    next.type = 'image/svg+xml'
    next.dataset.original = original
    next.href = showIcon ? original : BLANK_FAVICON
    if (current) current.replaceWith(next)
    else document.head.appendChild(next)
  }, [hydrated, showIcon])
}

/** The brand mark in the page header. Mounting it also takes over the browser tab's title and icon. */
export function TabHeader() {
  useDocumentMeta()
  return (
    <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
      <Logo className="h-6 w-6 shrink-0 drop-shadow-sm" />
      {APP_NAME}
    </div>
  )
}
