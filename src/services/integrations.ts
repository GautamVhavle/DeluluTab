/**
 * Values a widget needs from the person using it (a username, an access token).
 * They live in chrome.storage.local — never in sync — and the dev server uses localStorage.
 * Widgets read this. Nothing else should persist a credential.
 */
import { extensionStoragePort } from '@/services/storage/StorageAdapter'

const KEY = 'delulutab:integrations'
const port = extensionStoragePort()

export type IntegrationValues = Record<string, string>
type Bag = Record<string, IntegrationValues>

const listeners = new Set<() => void>()

function cleanValue(value: unknown) {
  return typeof value === 'string' ? value.replace(/\u0000/g, '').trim().slice(0, 4_000) : ''
}

function cleanBag(raw: unknown): Bag {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  const out: Bag = {}
  for (const [id, fields] of Object.entries(raw)) {
    if (!/^[a-z0-9-]{1,40}$/i.test(id) || typeof fields !== 'object' || fields === null || Array.isArray(fields)) continue
    const next: IntegrationValues = {}
    for (const [field, value] of Object.entries(fields)) {
      if (!/^[a-z0-9-]{1,40}$/i.test(field)) continue
      const clean = cleanValue(value)
      if (clean) next[field] = clean
    }
    if (Object.keys(next).length) out[id] = next
  }
  return out
}

async function read(): Promise<Bag> {
  if (!port) {
    try {
      return cleanBag(JSON.parse(localStorage.getItem(KEY) || '{}'))
    } catch {
      return {}
    }
  }
  const result = await port.local.get(KEY)
  return cleanBag(result[KEY])
}

async function write(bag: Bag) {
  if (!port) localStorage.setItem(KEY, JSON.stringify(bag))
  else await port.local.set({ [KEY]: bag })
  listeners.forEach((listener) => listener())
}

export async function loadIntegration(id: string): Promise<IntegrationValues> {
  const bag = await read()
  return bag[id] ?? {}
}

/** Merges `patch` into this widget's values. An empty string removes that field. */
export async function saveIntegration(id: string, patch: IntegrationValues): Promise<IntegrationValues> {
  const bag = await read()
  const next = { ...(bag[id] ?? {}) }
  for (const [field, value] of Object.entries(patch)) {
    const clean = cleanValue(value)
    if (clean) next[field] = clean
    else delete next[field]
  }
  if (Object.keys(next).length) bag[id] = next
  else delete bag[id]
  await write(bag)
  return next
}

export function subscribeIntegrations(listener: () => void) {
  listeners.add(listener)
  const unsubscribePort = port
    ? port.subscribe((changes, area) => {
        if (area === 'local' && KEY in changes) listener()
      })
    : () => {}
  return () => {
    listeners.delete(listener)
    unsubscribePort()
  }
}
