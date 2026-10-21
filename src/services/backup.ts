import { AI_PROVIDERS } from '@/config/aiProviders'
import { AMBIENT_VIDEOS, DEFAULT_AMBIENT } from '@/config/ambientVideos'
import { clampFontScale, isHexColor } from '@/config/appearance'
import { cleanSolidList } from '@/config/solids'
import { FONTS } from '@/config/fonts'
import { cleanGradientColors, GRADIENTS } from '@/config/gradients'
import { SEARCH_ENGINES } from '@/config/searchEngines'
import { isGithubUsername } from '@/services/github'
import { NEWS_CATEGORIES, NEWS_TOPICS, providerById } from '@/services/news'
import { cleanStashName, cleanTabs, MAX_STASH_GROUPS } from '@/services/stash'
import { clampChordWindow, isValidTrigger } from '@/utils/chords'
import { readGreetings } from '@/utils/greetings'
import { MAX_TAB_TITLE } from '@/utils/tabTitle'
import { isValidTimeZone } from '@/utils/timezones'
import { hostnameOf, normalizeUrl } from '@/utils/url'
import { parseStoredCustomWidgets, parseStoredLayouts } from '@/utils/widgetLayout'
import { DEFAULT_SETTINGS, DEFAULT_WIDGETS } from '@/config/defaults'
import type { Chord, CustomWidget, Folder, Settings, Shortcut, StashGroup, Todo, WidgetKey, WidgetLayouts, WidgetsState } from '@/types'

export const BACKUP_APP = 'DeluluTab'
export const BACKUP_FORMAT = 1
export const MAX_BACKUP_BYTES = 5_000_000

const LIMITS = { folders: 100, shortcuts: 500, chords: 500, todos: 500, notes: 100_000 }

export interface BackupData {
  settings: Settings
  folders: Folder[]
  shortcuts: Shortcut[]
  chords: Chord[]
  widgets: WidgetsState
  widgetLayouts?: WidgetLayouts
  customWidgets?: CustomWidget[]
  /** Present only when the backup was made with notes and tasks included. */
  notes?: string
  todos?: Todo[]
  stashes?: StashGroup[]
  /** Which accounts widgets were pointed at. Never tokens: those stay on the device that signed in. */
  connections?: BackupConnections
}

export interface BackupConnections {
  githubUsername?: string
  spotifyClientId?: string
}

export interface BackupFile {
  app: typeof BACKUP_APP
  format: number
  appVersion: string
  exportedAt: string
  data: BackupData
}

export interface BackupSummary {
  shortcuts: number
  folders: number
  chords: number
  hasNotes: boolean
  todos: number
  /** Saved tab groups included in the file, or null if the file has none. */
  stashes: number | null
  /** Custom widgets included in the file, or null if the file has none. */
  customWidgets: number | null
  hasLayout: boolean
  /** Widget connections in the file (GitHub username, Spotify Client ID). */
  connections: number
}

export type ParseResult =
  | { ok: true; data: BackupData; summary: BackupSummary; warnings: string[] }
  | { ok: false; error: string }

/** What goes into a backup: configuration, plus (optionally) notes, tasks and saved tab groups. Uploaded wallpapers stay on the device. */
export function buildBackup(
  state: BackupData,
  options: { includeNotes: boolean; appVersion: string; now?: Date },
): BackupFile {
  const data: BackupData = {
    settings: state.settings,
    folders: state.folders,
    shortcuts: state.shortcuts,
    chords: state.chords,
    widgets: state.widgets,
    widgetLayouts: state.widgetLayouts ?? {},
    customWidgets: state.customWidgets ?? [],
  }
  const connections = parseConnections(state.connections)
  if (Object.keys(connections).length) data.connections = connections
  if (options.includeNotes) {
    data.notes = state.notes ?? ''
    data.todos = state.todos ?? []
    data.stashes = state.stashes ?? []
  }
  return { app: BACKUP_APP, format: BACKUP_FORMAT, appVersion: options.appVersion, exportedAt: (options.now ?? new Date()).toISOString(), data }
}

export const backupFileName = (now: Date = new Date()) => `delulutab-backup-${now.toISOString().slice(0, 10)}.json`

// ------------------------------------------------------------------ parsing (the input is untrusted)

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function parseCustomQuotes(value: unknown): Settings['customQuotes'] {
  if (!Array.isArray(value)) return []
  const quotes: Settings['customQuotes'] = []
  for (const row of value) {
    if (!isObject(row)) continue
    const line = text(row.text, 180).trim()
    const by = text(row.by, 48).trim()
    if (!line) continue
    quotes.push({ text: line, by: by || 'You' })
    if (quotes.length >= 24) break
  }
  return quotes
}

function parseGreetings(value: unknown, warnings: string[]): Settings['greetings'] {
  if (value == null) return null
  const { book, error } = readGreetings(value)
  if (error) {
    warnings.push('Custom greetings were invalid, so the built-in lines were kept.')
    return null
  }
  return book
}

function parseTopics(value: unknown, fallback: Settings['newsTopics']): Settings['newsTopics'] {
  if (!Array.isArray(value)) return fallback
  const topics = value.filter((id): id is Settings['newsTopics'][number] => NEWS_TOPICS.some((topic) => topic.id === id))
  return topics.length ? topics : fallback
}

function parseProviders(value: unknown): Settings['newsProviders'] {
  if (!isObject(value)) return {}
  const out: Settings['newsProviders'] = {}
  for (const topic of NEWS_TOPICS) {
    const id = value[topic.id]
    if (typeof id === 'string' && providerById(id)?.topic === topic.id) out[topic.id] = id
  }
  return out
}
// eslint-disable-next-line no-control-regex
const stripControls = (s: string) => s.replace(/[\u0000-\u001f\u007f]/g, '')
const text = (v: unknown, max: number, fallback = '') => (typeof v === 'string' ? stripControls(v).slice(0, max) : fallback)
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)
const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback
function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback
}

function ambientChoice(value: unknown, fallback: string) {
  if (typeof value === 'string' && /^upload:[0-9a-f-]{36}$/i.test(value)) return value
  return oneOf(value, AMBIENT_VIDEOS.map((video) => video.id), fallback)
}

function httpsLink(value: unknown) {
  const href = text(value, 300)
  return /^https:\/\/\S{1,300}$/i.test(href) ? href : ''
}

/** Older backups called a picture link "daily". Bing and NASA choices fall back to the default background. */
function backgroundChoice(raw: Record<string, unknown>, fallback: Settings['backgroundSource']): Settings['backgroundSource'] {
  if (raw.backgroundSource === 'daily') return httpsLink(raw.imageLink) || httpsLink(raw.dailyUrl) ? 'custom' : fallback
  return oneOf(raw.backgroundSource, ['gradient', 'custom', 'video', 'solid'], fallback)
}

function imageLinkChoice(raw: Record<string, unknown>) {
  const link = httpsLink(raw.imageLink) || httpsLink(raw.dailyUrl)
  if (raw.backgroundSource === 'daily') return link
  return httpsLink(raw.imageLink)
}

const isSpotifyClientId = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{32}$/i.test(v)

function parseConnections(raw: unknown): BackupConnections {
  const r = isObject(raw) ? raw : {}
  const out: BackupConnections = {}
  if (typeof r.githubUsername === 'string' && isGithubUsername(r.githubUsername)) out.githubUsername = r.githubUsername
  if (isSpotifyClientId(r.spotifyClientId)) out.spotifyClientId = r.spotifyClientId
  return out
}

function parseSettings(raw: unknown, warnings: string[]): Settings {
  const r = isObject(raw) ? raw : {}
  const d = DEFAULT_SETTINGS
  let location: Settings['weatherLocation'] = null
  if (isObject(r.weatherLocation)) {
    const w = r.weatherLocation
    if (typeof w.latitude === 'number' && typeof w.longitude === 'number' && Math.abs(w.latitude) <= 90 && Math.abs(w.longitude) <= 180) {
      location = { name: text(w.name, 80, 'Saved place') || 'Saved place', latitude: w.latitude, longitude: w.longitude }
    } else warnings.push('The saved weather location was invalid and was reset to automatic.')
  }
  return {
    theme: oneOf(r.theme, ['dark', 'light', 'dynamic'], d.theme),
    layoutMode: oneOf(r.layoutMode === 'compact' ? 'detailed' : r.layoutMode, ['detailed', 'focus'], d.layoutMode === 'compact' ? 'detailed' : d.layoutMode),
    backgroundSource: backgroundChoice(r, d.backgroundSource),
    gradientPreset: oneOf(r.gradientPreset, GRADIENTS.map((g) => g.id), d.gradientPreset),
    gradientColors: cleanGradientColors(r.gradientColors),
    ambientVideo: ambientChoice(r.ambientVideo, d.ambientVideo ?? DEFAULT_AMBIENT),
    imageLink: imageLinkChoice(r),
    solidColor: isHexColor(r.solidColor) ? r.solidColor.toLowerCase() : d.solidColor,
    solidEffect: oneOf(r.solidEffect, ['still', 'fade', 'breathe'], d.solidEffect),
    solidEffectColor: isHexColor(r.solidEffectColor) ? r.solidEffectColor.toLowerCase() : d.solidEffectColor,
    solidCustom: cleanSolidList(r.solidCustom),
    backgroundRotation: oneOf(r.backgroundRotation, ['off', 'newtab', '1m', '5m', '15m', '1h'], d.backgroundRotation),
    backgroundDim: Math.round(num(r.backgroundDim, 0, 60, d.backgroundDim)),
    backgroundBlur: Math.round(num(r.backgroundBlur, 0, 20, d.backgroundBlur)),
    clockFormat: oneOf(r.clockFormat, ['12h', '24h'], d.clockFormat),
    showSeconds: bool(r.showSeconds, d.showSeconds),
    userName: text(r.userName, 30, d.userName),
    greetings: parseGreetings(r.greetings, warnings),
    appName: text(r.appName, 40, d.appName),
    searchEngine: oneOf(r.searchEngine === 'ecosia' ? 'brave' : r.searchEngine, SEARCH_ENGINES.map((e) => e.id), d.searchEngine),
    commandMode: oneOf(r.commandMode, ['web', 'ai'], d.commandMode),
    temperatureUnit: oneOf(r.temperatureUnit, ['c', 'f'], d.temperatureUnit),
    weatherLocation: location,
    newsCategory: oneOf(r.newsCategory, NEWS_CATEGORIES.map((c) => c.id), d.newsCategory),
    newsTopics: parseTopics(r.newsTopics, d.newsTopics),
    newsProviders: parseProviders(r.newsProviders),
    quoteSource: oneOf(r.quoteSource, ['builtin', 'classics', 'custom', 'zenquotes', 'quotable', 'url'], d.quoteSource),
    customQuotes: parseCustomQuotes(r.customQuotes),
    quoteUrl: /^https:\/\/\S{1,300}$/i.test(text(r.quoteUrl, 300)) ? text(r.quoteUrl, 300) : '',
    aiProvider: oneOf(r.aiProvider, AI_PROVIDERS.map((p) => p.id), d.aiProvider),
    tabTitleMode: oneOf(r.tabTitleMode, ['name', 'time', 'custom'], d.tabTitleMode),
    tabTitleCustom: text(r.tabTitleCustom, MAX_TAB_TITLE, d.tabTitleCustom),
    showTabIcon: bool(r.showTabIcon, d.showTabIcon),
    fontScale: clampFontScale(num(r.fontScale, 0, 1000, d.fontScale)),
    fontFamily: oneOf(r.fontFamily, FONTS.map((f) => f.id), d.fontFamily),
    showLogos: bool(r.showLogos, d.showLogos),
    clockStyle: oneOf(r.clockStyle, ['digital', 'flip', 'analog', 'world'], d.clockStyle),
    clockWeight: oneOf(r.clockWeight === 'regular' ? 'normal' : r.clockWeight, ['lighter', 'light', 'normal', 'bold', 'bolder', 'boldest'], d.clockWeight),
    clockFont: oneOf(r.clockFont, ['sans', 'serif', 'mono'], d.clockFont),
    clockTracking: oneOf(r.clockTracking, ['tight', 'normal', 'wide'], d.clockTracking),
    clockColor: isHexColor(r.clockColor) ? r.clockColor.toLowerCase() : null,
    secondTimezone: isValidTimeZone(r.secondTimezone) ? r.secondTimezone : d.secondTimezone,
    accent: isHexColor(r.accent) ? r.accent.toLowerCase() : null,
    quickAppsTab: oneOf(r.quickAppsTab, ['notes', 'todos', 'calc'], d.quickAppsTab),
    chordTrigger: typeof r.chordTrigger === 'string' && isValidTrigger(r.chordTrigger) ? r.chordTrigger : d.chordTrigger,
    chordWindowMs: clampChordWindow(num(r.chordWindowMs, 0, 100_000, d.chordWindowMs)),
    githubUsername: typeof r.githubUsername === 'string' && isGithubUsername(r.githubUsername.trim()) ? r.githubUsername.trim() : '',
    pomodoroWorkMin: Math.round(num(r.pomodoroWorkMin, 1, 90, d.pomodoroWorkMin)),
    pomodoroBreakMin: Math.round(num(r.pomodoroBreakMin, 1, 30, d.pomodoroBreakMin)),
    ambientVolume: Math.round(num(r.ambientVolume, 0, 100, d.ambientVolume)),
  }
}

const SAFE_ICON = /^[a-z0-9-]{1,30}$/
const IMAGE_URL = /^https?:\/\/\S{1,2000}$/i
const DATA_IMAGE = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]{1,40000}$/

function parseIcon(v: unknown) {
  if (typeof v !== 'string') return ''
  return SAFE_ICON.test(v) || IMAGE_URL.test(v) || DATA_IMAGE.test(v) ? v : ''
}

function cap(items: unknown, limit: number, label: string, warnings: string[]): unknown[] {
  if (!Array.isArray(items)) return []
  if (items.length > limit) warnings.push(`Only the first ${limit} ${label} were imported.`)
  return items.slice(0, limit)
}

function parseLibrary(data: Record<string, unknown>, warnings: string[]) {
  const usedIds = new Set<string>()
  const uniqueId = (v: unknown) => {
    const id = text(v, 64)
    const final = id && !usedIds.has(id) ? id : crypto.randomUUID()
    usedIds.add(final)
    return final
  }

  const folders: Folder[] = []
  const folderIds = new Set<string>()
  for (const raw of cap(data.folders, LIMITS.folders, 'folders', warnings)) {
    if (!isObject(raw)) continue
    const title = text(raw.title, 60).trim()
    if (!title) continue
    const id = uniqueId(raw.id)
    folderIds.add(id)
    folders.push({ id, title, icon: parseIcon(raw.icon) || 'folder', ...(raw.collapsed === true ? { collapsed: true } : {}) })
  }

  const shortcuts: Shortcut[] = []
  const idMap = new Map<string, string>() // id in the file -> id we kept (they differ only when the file repeated an id)
  let skipped = 0
  for (const raw of cap(data.shortcuts, LIMITS.shortcuts, 'shortcuts', warnings)) {
    const url = isObject(raw) ? normalizeUrl(text(raw.url, 2048)) : null
    if (!isObject(raw) || !url) {
      skipped++
      continue
    }
    const id = uniqueId(raw.id)
    if (typeof raw.id === 'string' && !idMap.has(raw.id)) idMap.set(raw.id, id)
    const folderId = typeof raw.folderId === 'string' && folderIds.has(raw.folderId) ? raw.folderId : null
    shortcuts.push({ id, title: text(raw.title, 100).trim() || hostnameOf(url), url, icon: parseIcon(raw.icon), folderId })
  }
  if (skipped) warnings.push(`${skipped} shortcut${skipped === 1 ? ' was' : 's were'} skipped because its address isn't a valid web link.`)

  const chords: Chord[] = []
  const sequences = new Set<string>()
  let droppedChords = 0
  for (const raw of cap(data.chords, LIMITS.chords, 'chords', warnings)) {
    const sequence = isObject(raw) && typeof raw.sequence === 'string' ? raw.sequence.toLowerCase() : ''
    const shortcutId = isObject(raw) && typeof raw.shortcutId === 'string' ? idMap.get(raw.shortcutId) : undefined
    if (!isObject(raw) || !/^[a-z0-9]{1,6}$/.test(sequence) || !shortcutId || sequences.has(sequence)) {
      droppedChords++
      continue
    }
    sequences.add(sequence)
    chords.push({ id: uniqueId(raw.id), sequence, shortcutId, enabled: bool(raw.enabled, true) })
  }
  if (droppedChords) warnings.push(`${droppedChords} chord${droppedChords === 1 ? ' was' : 's were'} skipped (invalid code, duplicate, or its shortcut is missing).`)

  return { folders, shortcuts, chords }
}

function parseWidgets(raw: unknown): WidgetsState {
  const r = isObject(raw) ? raw : {}
  const out = { ...DEFAULT_WIDGETS }
  for (const key of Object.keys(DEFAULT_WIDGETS) as WidgetKey[]) out[key] = bool(r[key], DEFAULT_WIDGETS[key])
  return out
}

function parseStashes(raw: unknown, warnings: string[]): StashGroup[] {
  const groups: StashGroup[] = []
  const ids = new Set<string>()
  for (const item of cap(raw, MAX_STASH_GROUPS, 'saved tab groups', warnings)) {
    if (!isObject(item)) continue
    const tabs = cleanTabs(Array.isArray(item.tabs) ? (item.tabs.filter(isObject) as { url?: unknown; title?: unknown; pinned?: unknown }[]) : [])
    if (tabs.length === 0 && !cleanStashName(item.name)) continue
    let id = text(item.id, 64)
    if (!id || ids.has(id)) id = crypto.randomUUID()
    ids.add(id)
    groups.push({ id, name: cleanStashName(item.name) || 'Saved tabs', createdAt: typeof item.createdAt === 'number' && Number.isFinite(item.createdAt) ? item.createdAt : Date.now(), tabs })
  }
  return groups
}

function parseTodos(raw: unknown, warnings: string[]): Todo[] {
  const todos: Todo[] = []
  for (const item of cap(raw, LIMITS.todos, 'tasks', warnings)) {
    if (!isObject(item)) continue
    const body = text(item.text, 200).trim()
    if (!body) continue
    todos.push({
      id: text(item.id, 64) || crypto.randomUUID(),
      text: body,
      done: bool(item.done, false),
      createdAt: typeof item.createdAt === 'number' && Number.isFinite(item.createdAt) ? item.createdAt : Date.now(),
    })
  }
  return todos
}

/** Validates and cleans a backup file's text. Never throws; anything unusable is dropped or reset to its default. */
export function parseBackup(input: string): ParseResult {
  if (input.length > MAX_BACKUP_BYTES) return { ok: false, error: 'That file is too large to be a DeluluTab backup.' }

  let json: unknown
  try {
    json = JSON.parse(input)
  } catch {
    return { ok: false, error: "That file isn't valid JSON." }
  }
  if (!isObject(json) || json.app !== BACKUP_APP || !isObject(json.data)) {
    return { ok: false, error: "This doesn't look like a DeluluTab backup." }
  }
  if (typeof json.format !== 'number' || json.format > BACKUP_FORMAT) {
    return { ok: false, error: 'This backup was made by a newer version of DeluluTab. Update the extension and try again.' }
  }

  const warnings: string[] = []
  const data = json.data
  const { folders, shortcuts, chords } = parseLibrary(data, warnings)
  const result: BackupData = {
    settings: parseSettings(data.settings, warnings),
    folders,
    shortcuts,
    chords,
    widgets: parseWidgets(data.widgets),
  }
  if (Array.isArray(data.customWidgets)) result.customWidgets = parseStoredCustomWidgets(data.customWidgets, warnings)
  if (isObject(data.widgetLayouts)) {
    const allowed = result.customWidgets ? new Set(result.customWidgets.map((w) => w.id)) : null
    result.widgetLayouts = parseStoredLayouts(data.widgetLayouts, allowed, warnings)
  }
  if (typeof data.notes === 'string') result.notes = data.notes.replace(/\u0000/g, '').slice(0, LIMITS.notes)
  if (Array.isArray(data.todos)) result.todos = parseTodos(data.todos, warnings)
  if (Array.isArray(data.stashes)) result.stashes = parseStashes(data.stashes, warnings)
  const connections = parseConnections(data.connections)
  if (Object.keys(connections).length) result.connections = connections

  return {
    ok: true,
    data: result,
    warnings,
    summary: {
      shortcuts: shortcuts.length,
      folders: folders.length,
      chords: chords.length,
      hasNotes: result.notes !== undefined,
      todos: result.todos?.length ?? 0,
      stashes: result.stashes?.length ?? null,
      customWidgets: result.customWidgets ? result.customWidgets.length : null,
      hasLayout: result.widgetLayouts !== undefined,
      connections: Object.keys(connections).length,
    },
  }
}
