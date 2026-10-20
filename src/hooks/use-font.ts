import { useEffect, useState } from 'react'
import { useHydrated } from '@/hooks/use-hydrated'
import { applyFont, loadFont } from '@/lib/fonts'
import { useAppStore } from '@/store/useAppStore'

/** How long to wait for a font before showing the page anyway (it is bundled, so this is a safety net). */
const FONT_TIMEOUT_MS = 2000

/**
 * Loads the chosen font and applies it to the whole page through the --font-sans variable. Returns false until the
 * first font is ready, so the page can wait for it and appear already set in the right typeface. When the user
 * switches fonts later, the old one stays on screen until the new one is loaded, then swaps in one step.
 */
export function useApplyFont(): boolean {
  const fontId = useAppStore((s) => s.settings.fontFamily)
  const hydrated = useHydrated()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!hydrated) return
    let cancelled = false
    const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), FONT_TIMEOUT_MS))
    void Promise.race([loadFont(fontId), timeout]).then(() => {
      if (cancelled) return
      // Even if loading failed, the stack falls back to system fonts, so applying it is always safe.
      applyFont(fontId)
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [fontId, hydrated])

  return ready
}
