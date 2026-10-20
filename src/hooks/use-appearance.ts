import { useLayoutEffect } from 'react'
import { applyAppearance } from '@/lib/appearance'
import { useHydrated } from '@/hooks/use-hydrated'
import { useAppStore } from '@/store/useAppStore'

/**
 * Applies font scale and accent color. A layout effect, so the first painted frame already has the right size
 * (a passive effect would paint at 100% first and visibly shift).
 */
export function useApplyAppearance() {
  const fontScale = useAppStore((s) => s.settings.fontScale)
  const accent = useAppStore((s) => s.settings.accent)
  const hydrated = useHydrated()

  useLayoutEffect(() => {
    if (!hydrated) return
    applyAppearance(document.documentElement, { fontScale, accent })
  }, [fontScale, accent, hydrated])
}
