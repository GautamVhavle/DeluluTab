import { useRef, useState } from 'react'
import { Export, Import, Restore, Warning, CheckCircle } from '@/components/common/icons'
import { backupFileName, buildBackup, MAX_BACKUP_BYTES, parseBackup, type BackupConnections, type ParseResult } from '@/services/backup'
import { loadIntegration, saveIntegration } from '@/services/integrations'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/common/button'
import { Section } from './SettingsUi'

function download(text: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

type Pending = { fileName: string; result: ParseResult } | null

export function BackupPanel() {
  const importConfig = useAppStore((s) => s.importConfig)
  const restoreDefaults = useAppStore((s) => s.restoreDefaults)

  const [includeNotes, setIncludeNotes] = useState(true)
  const [exported, setExported] = useState('')
  const [pending, setPending] = useState<Pending>(null)
  const [message, setMessage] = useState('')
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [clearNotes, setClearNotes] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  async function exportConfig() {
    const s = useAppStore.getState()
    const [github, spotify] = await Promise.all([loadIntegration('github'), loadIntegration('spotify')])
    const connections: BackupConnections = { githubUsername: github.username, spotifyClientId: spotify.clientId }
    const file = buildBackup(
      { settings: s.settings, folders: s.folders, shortcuts: s.shortcuts, chords: s.chords, widgets: s.widgets, widgetLayouts: s.widgetLayouts, customWidgets: s.customWidgets, notes: s.notes, todos: s.todos, stashes: s.stashes, connections },
      { includeNotes, appVersion: __APP_VERSION__ },
    )
    const name = backupFileName()
    download(JSON.stringify(file, null, 2), name)
    setExported(name)
    setMessage('')
  }

  async function chooseFile(file: File | undefined) {
    if (!file) return
    setMessage('')
    setExported('')
    if (file.size > MAX_BACKUP_BYTES) {
      setPending({ fileName: file.name, result: { ok: false, error: 'That file is too large to be a DeluluTab backup.' } })
    } else {
      setPending({ fileName: file.name, result: parseBackup(await file.text()) })
    }
    if (input.current) input.current.value = ''
  }

  async function applyImport() {
    if (!pending?.result.ok) return
    const { data } = pending.result
    importConfig(data)
    if (data.connections?.githubUsername) await saveIntegration('github', { username: data.connections.githubUsername })
    if (data.connections?.spotifyClientId) await saveIntegration('spotify', { clientId: data.connections.spotifyClientId })
    setPending(null)
    setMessage('Backup imported. Your configuration has been replaced.')
  }

  function restore() {
    restoreDefaults({ clearNotes })
    setConfirmRestore(false)
    setClearNotes(false)
    setMessage('Default configuration restored.')
    setPending(null)
    setExported('')
  }

  const r = pending?.result

  return (
    <div className="grid gap-7">
      <Section title="Export" hint="A JSON file of your setup. Sign-in tokens and uploaded photos stay on this device.">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeNotes} onChange={(e) => setIncludeNotes(e.target.checked)} className="h-4 w-4 accent-primary" />
          Include my notes, tasks and saved tab groups
        </label>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => void exportConfig()}><Export /> Export configuration</Button>
          {exported && <span role="status" className="flex items-center gap-1.5 text-xs text-emerald-500"><CheckCircle /> Saved {exported}</span>}
        </div>
      </Section>

      <Section title="Import" hint="Replaces this setup. Export first if you want a copy.">
        <input ref={input} type="file" accept="application/json,.json" hidden aria-label="Choose a backup file" onChange={(e) => void chooseFile(e.target.files?.[0])} />
        <div>
          <Button variant="secondary" onClick={() => input.current?.click()}><Import /> Choose a backup file…</Button>
        </div>

        {r && !r.ok && (
          <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500">
            <Warning className="mt-0.5 shrink-0" /> <span><strong className="font-medium">{pending?.fileName}</strong>: {r.error}</span>
          </p>
        )}

        {r && r.ok && (
          <div className="grid gap-3 rounded-xl border p-3" aria-label="Import preview">
            <p className="text-sm font-medium">{pending?.fileName}</p>
            <ul className="text-sm text-muted-foreground">
              <li>{r.summary.shortcuts} shortcuts in {r.summary.folders} folders</li>
              <li>{r.summary.chords} chords</li>
              <li>{r.summary.hasNotes ? `Notes and ${r.summary.todos} tasks (these replace yours)` : 'No notes or tasks (yours are kept)'}</li>
              <li>{r.summary.stashes === null ? 'No saved tab groups (yours are kept)' : `${r.summary.stashes} saved tab groups (these replace yours)`}</li>
              <li>{r.summary.customWidgets === null ? 'No custom widgets (yours are kept)' : `${r.summary.customWidgets} custom widgets (these replace yours)`}</li>
              <li>{r.summary.hasLayout ? 'Saved widget positions (these replace yours)' : 'No saved widget positions (yours are kept)'}</li>
              {r.summary.connections > 0 && <li>Widget connections (GitHub username, Spotify Client ID). Spotify asks you to sign in again.</li>}
            </ul>
            {r.warnings.length > 0 && (
              <ul role="status" className="grid gap-1 text-xs text-amber-500">
                {r.warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void applyImport()}>Replace my configuration</Button>
              <Button size="sm" variant="ghost" onClick={() => setPending(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Section>

      <Section title="Restore defaults" hint="Back to a fresh setup. Notes and tasks stay unless you include them.">
        {!confirmRestore ? (
          <div>
            <Button variant="outline" onClick={() => setConfirmRestore(true)}><Restore /> Restore defaults…</Button>
          </div>
        ) : (
          <div role="alertdialog" aria-label="Confirm restore" className="grid gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3">
            <p className="text-sm">This replaces your current configuration. It can't be undone.</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={clearNotes} onChange={(e) => setClearNotes(e.target.checked)} className="h-4 w-4 accent-primary" />
              Also delete my notes, tasks, saved tab groups and custom widgets
            </label>
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={restore} className="bg-red-600 text-white hover:bg-red-600/90">Restore defaults</Button>
              <Button size="sm" variant="ghost" onClick={() => { setConfirmRestore(false); setClearNotes(false) }}>Cancel</Button>
            </div>
          </div>
        )}
      </Section>

      {message && <p role="status" className="flex items-center gap-1.5 text-sm text-emerald-500"><CheckCircle /> {message}</p>}
      <p className="text-xs text-muted-foreground">DeluluTab v{__APP_VERSION__}</p>
    </div>
  )
}
