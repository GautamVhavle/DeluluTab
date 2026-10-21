import type { StashTab } from '@/types'
import { normalizeUrl } from '@/utils/url'

export const MAX_STASH_GROUPS = 50
export const MAX_TABS_PER_GROUP = 200
export const MAX_STASH_NAME = 60

/** Only normal web pages are stashed: internal pages (chrome://, the extension's own pages) can't be reopened reliably. */
export function isStashableUrl(url: unknown): url is string {
  if (typeof url !== 'string' || url.length > 2048) return false
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

const clean = (s: unknown, max: number) => (typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '')

/** Keeps stashable tabs, drops repeats of the same URL, trims titles, caps the count. */
export function cleanTabs(input: { url?: unknown; title?: unknown; pinned?: unknown }[]): StashTab[] {
  const seen = new Set<string>()
  const out: StashTab[] = []
  for (const t of input) {
    if (!isStashableUrl(t?.url) || seen.has(t.url)) continue
    seen.add(t.url)
    out.push({ url: t.url, title: clean(t.title, 200) || new URL(t.url).hostname, ...(t.pinned === true ? { pinned: true } : {}) })
    if (out.length >= MAX_TABS_PER_GROUP) break
  }
  return out
}

export const cleanStashName = (name: unknown) => clean(name, MAX_STASH_NAME)

/** One link a person typed. Accepts "github.com" as well as a full address. */
export function stashTabFromInput(url: string, title: string): StashTab | null {
  const normalized = normalizeUrl(url)
  if (!normalized) return null
  const [tab] = cleanTabs([{ url: normalized, title }])
  return tab ?? null
}

export const defaultStashName = (now = new Date()) =>
  `Session ${now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`

export const hasTabsApi = () => typeof chrome !== 'undefined' && !!chrome.tabs?.query

export interface CapturedWindow {
  tabs: StashTab[]
  /** Ids of every stashable tab, so the caller can close them after saving. */
  tabIds: number[]
  /** Tabs in this window that were skipped (internal pages, this page). */
  skipped: number
}

/** Reads the tabs of the window this page is in. Needs the `tabs` permission to see URLs and titles. */
export async function captureCurrentWindow(): Promise<CapturedWindow> {
  const all = await chrome.tabs.query({ currentWindow: true })
  const stashable = all.filter((t) => isStashableUrl(t.url))
  return {
    tabs: cleanTabs(stashable.map((t) => ({ url: t.url, title: t.title, pinned: t.pinned }))),
    tabIds: stashable.map((t) => t.id).filter((id): id is number => typeof id === 'number'),
    skipped: all.length - stashable.length,
  }
}

export async function closeTabs(ids: number[]) {
  if (ids.length) await chrome.tabs.remove(ids)
}

/**
 * Reopens a group. In this window, tabs open in order with the first one focused (so you land on the session);
 * or all at once in a new window. Outside the extension (npm run dev) it falls back to window.open.
 */
export async function restoreTabs(tabs: StashTab[], options: { newWindow?: boolean } = {}) {
  const urls = tabs.map((t) => t.url).filter(isStashableUrl)
  if (urls.length === 0) return 0
  if (typeof chrome === 'undefined' || !chrome.tabs?.create) {
    for (const url of urls) window.open(url, '_blank', 'noopener,noreferrer')
    return urls.length
  }
  if (options.newWindow) {
    await chrome.windows.create({ url: urls, focused: true })
  } else {
    // Invoked together, in order: Chrome creates them in call order, and they all load in parallel.
    await Promise.all(tabs.filter((t) => isStashableUrl(t.url)).map((t, i) => chrome.tabs.create({ url: t.url, active: i === 0, pinned: t.pinned === true })))
  }
  return urls.length
}
