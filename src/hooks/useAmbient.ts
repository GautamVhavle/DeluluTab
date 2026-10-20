import { useEffect, useSyncExternalStore } from 'react'
import { AmbientPlayer, type AmbientKind } from '@/lib/ambient'
import { useAppStore } from '@/store/useAppStore'

/**
 * One player for the whole page. Switching layouts remounts widgets; a module-level player means the sound
 * carries on instead of cutting out. (It does stop if this tab navigates away: a page can't play audio once it's gone.)
 */
const player = new AmbientPlayer()
let current: AmbientKind | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function toggleAmbient(kind: AmbientKind, volume: number) {
  player.setVolume(volume)
  if (current === kind) {
    player.stop()
    current = null
  } else {
    player.play(kind)
    current = kind
  }
  emit()
}

export function stopAmbient() {
  player.stop()
  current = null
  emit()
}

export function useAmbient() {
  const volume = useAppStore((s) => s.settings.ambientVolume)
  const kind = useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => current,
  )
  useEffect(() => player.setVolume(volume / 100), [volume])
  return { kind, toggle: (k: AmbientKind) => toggleAmbient(k, volume / 100) }
}
