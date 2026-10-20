import type { StateStorage } from 'zustand/middleware'

type Area = 'sync' | 'local'

const hasChromeStorage = () =>
  typeof chrome !== 'undefined' && !!chrome.storage?.sync && !!chrome.storage?.local

/**
 * chrome.storage.onChanged also fires in the tab that did the write. Remembering our recent writes lets
 * listeners ignore those echoes; otherwise an echo of keystroke N can land after keystroke N+1 and roll the state back.
 */
const recentWrites: string[] = []
const trackWrite = (value: string) => {
  recentWrites.push(value)
  if (recentWrites.length > 50) recentWrites.shift()
}
const isOwnEcho = (value: unknown) => typeof value === 'string' && recentWrites.includes(value)

/**
 * Zustand `StateStorage` backed by chrome.storage.<area>.
 * Falls back to localStorage when chrome.storage is unavailable (`npm run dev`).
 */
export function createChromeStorage(area: Area = 'sync'): StateStorage {
  return {
    getItem: async (name) => {
      if (!hasChromeStorage()) return localStorage.getItem(name)
      const result = await chrome.storage[area].get(name)
      const value = result[name]
      return typeof value === 'string' ? value : null
    },
    setItem: async (name, value) => {
      if (!hasChromeStorage()) return localStorage.setItem(name, value)
      trackWrite(value)
      try {
        await chrome.storage[area].set({ [name]: value })
      } catch (err) {
        // chrome.storage.sync caps items at 8KB (100KB total); don't lose data when exceeded.
        if (area === 'sync') {
          console.warn('[DeluluTab] sync storage write failed, saving locally instead', err)
          await chrome.storage.local.set({ [name]: value })
        } else {
          throw err
        }
      }
    },
    removeItem: async (name) => {
      if (!hasChromeStorage()) return localStorage.removeItem(name)
      await chrome.storage[area].remove(name)
    },
  }
}

/**
 * Calls `onChange` when any of `names` is changed from elsewhere (another New Tab, another device).
 * Changes this tab made itself are ignored. Returns an unsubscribe function.
 */
export function subscribeToExternalChanges(names: string | string[], onChange: () => void): () => void {
  const watched = Array.isArray(names) ? names : [names]
  if (!hasChromeStorage()) {
    const handler = (e: StorageEvent) => e.key && watched.includes(e.key) && onChange()
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }
  const handler = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName !== 'sync' && areaName !== 'local') return
    const external = watched.some((n) => n in changes && !isOwnEcho(changes[n].newValue))
    if (external) onChange()
  }
  chrome.storage.onChanged.addListener(handler)
  return () => chrome.storage.onChanged.removeListener(handler)
}

/** Keys a split store writes besides the main one. */
export const splitKeys = (name: string) => [name, `${name}:local`, `${name}:rest`]

/**
 * Persists a zustand store across two areas: the fields named in `localKeys` (big or private data such as
 * notes) go to chrome.storage.local, everything else to chrome.storage.sync.
 *
 * - Sync writes are skipped when nothing in the sync part changed, and debounced when it did, so neither typing
 *   in notes nor dragging a slider can hit sync's write-rate limit (about 120 a minute).
 * - Local writes are debounced and flushed when the page is hidden, so every keystroke is safe without
 *   rewriting the whole blob on each one.
 * - If the sync part ever exceeds sync's 8KB item limit it is kept in local storage instead, and read back from there.
 */
export function createSplitStorage(localKeys: string[], debounceMs = 250, syncDebounceMs = 600): StateStorage {
  let lastSync: string | null = null
  let pendingLocal: { name: string; value: string } | null = null
  let pendingSync: { name: string; value: string } | null = null
  let localTimer: ReturnType<typeof setTimeout> | undefined
  let syncTimer: ReturnType<typeof setTimeout> | undefined

  const writeLocal = async () => {
    clearTimeout(localTimer)
    if (!pendingLocal) return
    const { name, value } = pendingLocal
    pendingLocal = null
    if (!hasChromeStorage()) return
    trackWrite(value)
    try {
      await chrome.storage.local.set({ [`${name}:local`]: value })
    } catch (err) {
      // Runs from a timer or page-exit handler, so nothing could catch this; a failed background save must not throw.
      console.warn('[DeluluTab] saving notes and tasks failed', err)
    }
  }

  const writeSync = async () => {
    clearTimeout(syncTimer)
    if (!pendingSync) return
    const { name, value } = pendingSync
    pendingSync = null
    if (!hasChromeStorage() || value === lastSync) return
    lastSync = value
    trackWrite(value)
    try {
      await chrome.storage.sync.set({ [name]: value })
      await chrome.storage.local.remove(`${name}:rest`)
    } catch (err) {
      console.warn('[DeluluTab] sync storage write failed, keeping settings locally instead', err)
      trackWrite(value)
      try {
        await chrome.storage.local.set({ [`${name}:rest`]: value })
      } catch (fallbackErr) {
        // Both areas refused (e.g. the extension was reloaded under an open tab). Nothing more to try.
        console.warn('[DeluluTab] settings could not be saved', fallbackErr)
      }
    }
  }

  const flush = () => Promise.all([writeLocal(), writeSync()])

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => void flush())
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && void flush())
  }

  const split = (value: string) => {
    const { state, version } = JSON.parse(value)
    const local: Record<string, unknown> = {}
    const rest: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(state ?? {})) (localKeys.includes(k) ? local : rest)[k] = v
    return { rest: JSON.stringify({ state: rest, version }), local: JSON.stringify({ state: local, version }) }
  }

  return {
    getItem: async (name) => {
      if (!hasChromeStorage()) return localStorage.getItem(name)
      const got = await chrome.storage.local.get([`${name}:local`, `${name}:rest`])
      const sync = (await chrome.storage.sync.get(name))[name]
      // `:rest` only exists while the sync part didn't fit in sync; it is the newer copy.
      const rest = [got[`${name}:rest`], sync].find((v): v is string => typeof v === 'string')
      const local = typeof got[`${name}:local`] === 'string' ? (got[`${name}:local`] as string) : null
      if (!rest && !local) return null

      const base = rest ? JSON.parse(rest) : { state: {}, version: JSON.parse(local!).version }
      const extra = local ? JSON.parse(local).state : {}
      lastSync = rest ?? null
      return JSON.stringify({ state: { ...base.state, ...extra }, version: base.version })
    },

    // Writes are trailing-debounced: a slider drag or typing burst becomes one save, well inside sync's
    // write-rate limit (about 120 a minute). Anything pending is flushed when the page is hidden or closed.
    setItem: async (name, value) => {
      if (!hasChromeStorage()) return localStorage.setItem(name, value)
      const parts = split(value)

      pendingLocal = { name, value: parts.local }
      clearTimeout(localTimer)
      localTimer = setTimeout(() => void writeLocal(), debounceMs)

      if (parts.rest !== lastSync) {
        pendingSync = { name, value: parts.rest }
        clearTimeout(syncTimer)
        syncTimer = setTimeout(() => void writeSync(), syncDebounceMs)
      } else {
        pendingSync = null
        clearTimeout(syncTimer)
      }
    },

    removeItem: async (name) => {
      if (!hasChromeStorage()) return localStorage.removeItem(name)
      lastSync = null
      pendingLocal = null
      pendingSync = null
      clearTimeout(localTimer)
      clearTimeout(syncTimer)
      await chrome.storage.sync.remove(name)
      await chrome.storage.local.remove([`${name}:local`, `${name}:rest`])
    },
  }
}
