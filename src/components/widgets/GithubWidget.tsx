import { useMemo, useState, type FormEvent } from 'react'
import { Branch, Edit, ExternalLink, Flame, Github, RefreshCw, Star } from '@/components/common/icons'
import { useCachedResource } from '@/hooks/useCachedResource'
import { bestDay, buildWeeks, fetchActivity, isGithubUsername, languageColor, streaks, type ContributionDay, type GithubActivity, type GithubRepo } from '@/services/github'
import { timeAgo } from '@/services/news'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import type { WidgetProps } from './types'

const TTL_MS = 30 * 60 * 1000
const WEEKS = 30

const LEVEL_CLASS = ['bg-secondary/70', 'bg-primary/25', 'bg-primary/50', 'bg-primary/75', 'bg-primary']

const dayLabel = (d: ContributionDay) =>
  `${d.count === 0 ? 'No contributions' : `${d.count} contribution${d.count === 1 ? '' : 's'}`} on ${new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`

function Heatmap({ days, weeks }: { days: ContributionDay[]; weeks: number }) {
  const grid = useMemo(() => buildWeeks(days, weeks), [days, weeks])
  const shown = days.slice(-(weeks * 7))
  return (
    <div>
      <div
        role="img"
        aria-label={`Contribution graph: ${shown.reduce((n, d) => n + d.count, 0)} contributions over the last ${grid.length} weeks`}
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${grid.length}, minmax(0, 1fr))` }}
      >
        {grid.map((week, wi) => (
          <div key={wi} className="grid gap-[3px]">
            {week.map((day, di) =>
              day ? <span key={day.date} title={dayLabel(day)} className={cn('aspect-square rounded-[3px]', LEVEL_CLASS[day.level])} /> : <span key={`pad-${di}`} className="aspect-square" />,
            )}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex items-center justify-end gap-1 text-[10px] text-muted-foreground" aria-hidden>
        Less {LEVEL_CLASS.map((c) => <span key={c} className={cn('h-2.5 w-2.5 rounded-[2px]', c)} />)} More
      </div>
    </div>
  )
}

function RepoRow({ repo }: { repo: GithubRepo }) {
  return (
    <li>
      <a href={repo.url} target="_blank" rel="noopener noreferrer" className="group block rounded-lg px-2 py-1 outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex items-center gap-2 text-sm">
          <Branch className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate font-medium">{repo.name}</span>
          {repo.fork && <span className="shrink-0 rounded bg-secondary px-1 text-[10px] text-muted-foreground">fork</span>}
          <ExternalLink className="ml-auto h-2.5 w-2.5 shrink-0 opacity-0 group-hover:opacity-60" aria-hidden />
        </span>
        <span className="flex items-center gap-3 pl-5 text-[11px] text-muted-foreground">
          {repo.language && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: languageColor(repo.language) }} aria-hidden /> {repo.language}
            </span>
          )}
          {repo.stars > 0 && <span className="flex items-center gap-1"><Star className="h-2.5 w-2.5" aria-hidden /> {repo.stars.toLocaleString()}</span>}
          <span>pushed {timeAgo(repo.pushedAt)}</span>
        </span>
      </a>
    </li>
  )
}

function UsernameForm({ initial, onSubmit, onCancel }: { initial: string; onSubmit: (name: string) => void; onCancel?: () => void }) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const name = value.trim().replace(/^@/, '')
    if (!isGithubUsername(name)) return setError('GitHub usernames use letters, numbers and single hyphens.')
    onSubmit(name)
  }

  return (
    <form onSubmit={submit} className="grid gap-2">
      <div className="flex gap-2">
        <Input autoFocus value={value} maxLength={40} onChange={(e) => { setValue(e.target.value); setError('') }} onKeyDown={(e) => e.key === 'Escape' && onCancel && (e.stopPropagation(), onCancel())} placeholder="Your GitHub username" aria-label="GitHub username" autoComplete="off" spellCheck={false} className="h-8" />
        <Button type="submit" size="sm" disabled={!value.trim()}>Show activity</Button>
        {onCancel && <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>}
      </div>
      {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
    </form>
  )
}

function Summary({ activity, compact }: { activity: GithubActivity; compact?: boolean }) {
  const { current } = useMemo(() => streaks(activity.days), [activity.days])
  const best = useMemo(() => bestDay(activity.days), [activity.days])
  const period = activity.source === 'graph' ? 'in the last year' : 'recently'
  return (
    <p className={cn('flex flex-wrap items-center gap-x-3 gap-y-0.5 text-muted-foreground', compact ? 'text-xs' : 'text-xs')}>
      <span><strong className="font-semibold text-foreground">{activity.total.toLocaleString()}</strong> {activity.source === 'graph' ? 'contributions' : 'public events'} {period}</span>
      <span className="flex items-center gap-1"><Flame className={cn('h-3 w-3', current > 0 && 'text-orange-400')} aria-hidden /> {current}-day streak</span>
      {!compact && best && best.count > 0 && <span>Best day: {best.count}</span>}
    </p>
  )
}

export function GithubWidget({ mode }: WidgetProps) {
  const username = useAppStore((s) => s.settings.githubUsername)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const [editing, setEditing] = useState(false)
  const compact = mode === 'compact'

  const { data, error, loading, refresh } = useCachedResource(username ? `github:${username.toLowerCase()}` : null, (signal) => fetchActivity(username, signal), TTL_MS)

  const save = (name: string) => {
    updateSettings({ githubUsername: name })
    setEditing(false)
  }

  if (!username || editing) {
    return (
      <div className="flex h-full flex-col justify-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Github aria-hidden /> GitHub activity</div>
        <UsernameForm initial={username} onSubmit={save} onCancel={username ? () => setEditing(false) : undefined} />
        <p className="text-xs text-muted-foreground">Shows your public contributions and recent repositories. No sign-in or token needed.</p>
      </div>
    )
  }

  const profile = `https://github.com/${encodeURIComponent(username)}`

  if (compact) {
    return (
      <div className="flex h-full items-center gap-3 text-sm">
        <Github className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <a href={profile} target="_blank" rel="noopener noreferrer" className="shrink-0 font-medium hover:underline">@{username}</a>
        <span className="min-w-0 truncate">
          {data ? <Summary activity={data} compact /> : error ? <span role="alert" className="text-xs text-muted-foreground">{error}</span> : <span className="text-xs text-muted-foreground">Loading…</span>}
        </span>
        <button type="button" onClick={() => setEditing(true)} aria-label="Change GitHub username" className="ml-auto rounded p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><Edit className="h-3 w-3" /></button>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <a href={profile} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-2 rounded text-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
          <Github className="shrink-0" aria-hidden /> <span className="truncate">@{username}</span>
        </a>
        <div className="flex items-center gap-1">
          <button type="button" onClick={refresh} aria-label="Refresh GitHub activity" className="rounded-md p-1.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /></button>
          <button type="button" onClick={() => setEditing(true)} aria-label="Change GitHub username" className="rounded-md p-1.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><Edit className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {!data && loading && (
        <div aria-busy className="grid gap-2">
          <div className="h-3 w-2/3 animate-pulse rounded bg-secondary/60" />
          <div className="h-28 animate-pulse rounded-lg bg-secondary/40" />
        </div>
      )}

      {!data && error && (
        <div className="grid gap-2 text-sm">
          <p role="alert" className="text-muted-foreground">{error}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Change username</Button>
            <Button size="sm" variant="ghost" onClick={refresh}>Try again</Button>
          </div>
        </div>
      )}

      {data && (
        <div className="grid min-h-0 flex-1 content-start gap-2.5 overflow-y-auto">
          <Summary activity={data} />
          <Heatmap days={data.days} weeks={WEEKS} />
          {data.source === 'events' && <p className="text-[11px] text-muted-foreground">The full contribution graph is unavailable, so this counts your recent public activity instead.</p>}
          {error && <p role="alert" className="text-[11px] text-amber-500">{error} Showing the last update.</p>}

          <div>
            <h4 className="mb-1 px-2 text-xs font-medium text-muted-foreground">Recently pushed</h4>
            {data.repos.length > 0 ? (
              <ul>
                {[...data.repos.filter((r) => !r.fork), ...data.repos.filter((r) => r.fork)].slice(0, 3).map((r) => <RepoRow key={r.url} repo={r} />)}
              </ul>
            ) : (
              <p className="px-2 text-xs text-muted-foreground">{data.reposError || 'No public repositories yet.'}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
