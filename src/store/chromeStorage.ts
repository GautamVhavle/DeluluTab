import type { StateStorage } from 'zustand/middleware'

type Area = 'sync' | 'local'

const hasChromeStorage = () =>
  typeof chrome !== 'undefined' && !!chrome.storage?.sync && !!chrome.storage?.local

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
 * Calls `onChange` when `name` is changed from elsewhere (another New Tab, another device).
 * Returns an unsubscribe function.
 */
export function subscribeToExternalChanges(name: string, onChange: () => void): () => void {
  if (!hasChromeStorage()) {
    const handler = (e: StorageEvent) => e.key === name && onChange()
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }
  const handler = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if ((areaName === 'sync' || areaName === 'local') && name in changes) onChange()
  }
  chrome.storage.onChanged.addListener(handler)
  return () => chrome.storage.onChanged.removeListener(handler)
}
