import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'

interface Persisted {
  persist: {
    hasHydrated: () => boolean
    onFinishHydration: (fn: () => void) => () => void
  }
}

/** True once a persisted store has been read from chrome.storage (async). */
export function useHydrated(store: Persisted = useAppStore) {
  const [hydrated, setHydrated] = useState(() => store.persist.hasHydrated())

  useEffect(() => {
    setHydrated(store.persist.hasHydrated())
    return store.persist.onFinishHydration(() => setHydrated(true))
  }, [store])

  return hydrated
}
