/**
 * The only door to persistent key/value storage. Callers depend on this port, not on `chrome.storage`,
 * so the extension build and `npm run dev` (which has no extension APIs) share the same store code.
 */
export interface StorageChange {
  newValue?: unknown
}

export interface StorageAreaPort {
  get(keys: string | string[]): Promise<Record<string, unknown>>
  set(items: Record<string, unknown>): Promise<void>
  remove(keys: string | string[]): Promise<void>
}

export interface StoragePort {
  readonly sync: StorageAreaPort
  readonly local: StorageAreaPort
  subscribe(listener: (changes: Record<string, StorageChange>, areaName: string) => void): () => void
}

/** Chrome extension storage, or null when the page is not running as an extension. */
export function extensionStoragePort(): StoragePort | null {
  if (typeof chrome === 'undefined' || !chrome.storage?.sync || !chrome.storage?.local) return null
  const area = (name: 'sync' | 'local'): StorageAreaPort => ({
    get: (keys) => chrome.storage[name].get(keys),
    set: (items) => chrome.storage[name].set(items),
    remove: (keys) => chrome.storage[name].remove(keys),
  })
  return {
    sync: area('sync'),
    local: area('local'),
    subscribe(listener) {
      const handler = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => listener(changes, areaName)
      chrome.storage.onChanged.addListener(handler)
      return () => chrome.storage.onChanged.removeListener(handler)
    },
  }
}
