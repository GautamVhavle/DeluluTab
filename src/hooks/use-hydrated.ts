import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'

/** True once the persisted store has been read from chrome.storage (async). */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(() => useAppStore.persist.hasHydrated())

  useEffect(() => {
    setHydrated(useAppStore.persist.hasHydrated())
    return useAppStore.persist.onFinishHydration(() => setHydrated(true))
  }, [])

  return hydrated
}
