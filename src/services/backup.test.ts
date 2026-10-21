import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, DEFAULT_WIDGETS } from '@/config/defaults'
import { buildBackup, parseBackup, type BackupData } from './backup'

const CLIENT_ID = '0123456789abcdef0123456789abcdef'

const state = (extra: Partial<BackupData> = {}): BackupData => ({
  settings: DEFAULT_SETTINGS,
  folders: [],
  shortcuts: [],
  chords: [],
  widgets: DEFAULT_WIDGETS,
  ...extra,
})

describe('backup connections', () => {
  it('round-trips the GitHub username and Spotify Client ID', () => {
    const file = buildBackup(state({ connections: { githubUsername: 'octocat', spotifyClientId: CLIENT_ID } }), { includeNotes: false, appVersion: 'test' })
    const parsed = parseBackup(JSON.stringify(file))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.data.connections).toEqual({ githubUsername: 'octocat', spotifyClientId: CLIENT_ID })
    expect(parsed.summary.connections).toBe(2)
  })

  it('never writes tokens, even if handed some', () => {
    const sneaky = { githubUsername: 'octocat', spotifyClientId: CLIENT_ID, accessToken: 'secret-access', refreshToken: 'secret-refresh' }
    const file = buildBackup(state({ connections: sneaky as BackupData['connections'] }), { includeNotes: true, appVersion: 'test' })
    const text = JSON.stringify(file)
    expect(text).not.toContain('secret-access')
    expect(text).not.toContain('secret-refresh')
  })

  it('drops connection values that are not valid', () => {
    const file = buildBackup(state(), { includeNotes: false, appVersion: 'test' })
    const tampered = { ...file, data: { ...file.data, connections: { githubUsername: '-bad name-', spotifyClientId: 'nope', refreshToken: 'x' } } }
    const parsed = parseBackup(JSON.stringify(tampered))
    expect(parsed.ok && parsed.data.connections).toBeFalsy()
  })

  it('keeps a live background choice and drops an unknown one', () => {
    const file = buildBackup(state({ settings: { ...DEFAULT_SETTINGS, backgroundSource: 'video', ambientVideo: 'open-water' } }), { includeNotes: false, appVersion: 'test' })
    const parsed = parseBackup(JSON.stringify(file))
    expect(parsed.ok && parsed.data.settings.backgroundSource).toBe('video')
    expect(parsed.ok && parsed.data.settings.ambientVideo).toBe('open-water')
    const bad = { ...file, data: { ...file.data, settings: { ...file.data.settings, ambientVideo: 'not-a-scene' } } }
    const again = parseBackup(JSON.stringify(bad))
    expect(again.ok && again.data.settings.ambientVideo).toBe('night-earth')
  })

  it('keeps a custom gradient palette and drops a bad stop', () => {
    const file = buildBackup(state({ settings: { ...DEFAULT_SETTINGS, gradientColors: ['#eaf4fc', '#1e50a2'] } }), { includeNotes: false, appVersion: 'test' })
    const parsed = parseBackup(JSON.stringify(file))
    expect(parsed.ok && parsed.data.settings.gradientColors).toEqual(['#eaf4fc', '#1e50a2'])
    const bad = { ...file, data: { ...file.data, settings: { ...file.data.settings, gradientColors: ['#eaf4fc', 'nope', '#ffffff'] } } }
    const again = parseBackup(JSON.stringify(bad))
    expect(again.ok && again.data.settings.gradientColors).toEqual(['#eaf4fc', '#ffffff'])
  })

  it('turns an old picture link into an upload and drops Bing', () => {
    const file = buildBackup(state(), { includeNotes: false, appVersion: 'test' })
    const linked = {
      ...file,
      data: { ...file.data, settings: { ...file.data.settings, backgroundSource: 'daily', dailyProvider: 'link', dailyUrl: 'https://example.com/photo.jpg' } },
    }
    const parsed = parseBackup(JSON.stringify(linked))
    expect(parsed.ok && parsed.data.settings.backgroundSource).toBe('custom')
    expect(parsed.ok && parsed.data.settings.imageLink).toBe('https://example.com/photo.jpg')
    const bing = {
      ...file,
      data: { ...file.data, settings: { ...file.data.settings, backgroundSource: 'daily', dailyProvider: 'bing', bingImage: 'abc' } },
    }
    const again = parseBackup(JSON.stringify(bing))
    expect(again.ok && again.data.settings.backgroundSource).toBe('video')
    expect(again.ok && again.data.settings.imageLink).toBe('')
  })

  it('keeps the search mode setting', () => {
    const file = buildBackup(state({ settings: { ...DEFAULT_SETTINGS, commandMode: 'ai' } }), { includeNotes: false, appVersion: 'test' })
    const parsed = parseBackup(JSON.stringify(file))
    expect(parsed.ok && parsed.data.settings.commandMode).toBe('ai')
  })
})
