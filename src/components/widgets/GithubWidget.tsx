import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Edit, ExternalLink, Flame, Github, MapPin, RefreshCw } from '@/components/common/icons'
import { WidgetSkeleton } from '@/components/widgets/WidgetFeedback'
import { useCachedResource } from '@/hooks/useCachedResource'
import { useIntegration } from '@/hooks/useIntegration'
import { bestDay, buildWeeks, fetchActivity, isGithubUsername, languageColor, streaks, type ContributionDay, type GithubActivity, type GithubProfile, type GithubRepo } from '@/services/github'
import { timeAgo } from '@/services/news'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import type { WidgetProps } from './types'

const TTL_MS = 30 * 60 * 1000
const WEEKS = 30

const LEVEL_CLASS = ['bg-foreground/[0.08]', 'bg-primary/30', 'bg-primary/55', 'bg-primary/80', 'bg-primary']

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
        className="grid w-full gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${grid.length}, minmax(0, 1fr))` }}
      >
        {grid.map((week, wi) => (
          <div key={wi} className="grid gap-[2px]">
            {week.map((day, di) =>
              day ? <span key={day.date} title={dayLabel(day)} className={cn('h-1.5 w-full rounded-[2px]', LEVEL_CLASS[day.level])} /> : <span key={`pad-${di}`} className="h-1.5" />,
            )}
          </div>
        ))}
      </div>
      <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground" aria-hidden>
        Less {LEVEL_CLASS.map((c) => <span key={c} className={cn('h-1.5 w-1.5 rounded-[2px]', c)} />)} More
      </div>
    </div>
  )
}

function RepoRow({ repo }: { repo: GithubRepo }) {
  return (
    <li>
      <a href={repo.url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 rounded-md px-1 py-0.5 text-xs outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: languageColor(repo.language) }} aria-hidden />
        <span className="truncate font-medium">{repo.name}</span>
        {repo.fork && <span className="shrink-0 text-[10px] text-muted-foreground">fork</span>}
        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{timeAgo(repo.pushedAt)}</span>
        <ExternalLink className="h-2.5 w-2.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-70" aria-hidden />
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
        <Input autoFocus={Boolean(onCancel)} value={value} maxLength={40} onChange={(e) => { setValue(e.target.value); setError('') }} onKeyDown={(e) => e.key === 'Escape' && onCancel && (e.stopPropagation(), onCancel())} placeholder="Your GitHub username" aria-label="GitHub username" autoComplete="off" spellCheck={false} className="h-8" />
        <Button type="submit" size="sm" disabled={!value.trim()}>Show activity</Button>
        {onCancel && <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>}
      </div>
      {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
    </form>
  )
}

const blankProfile: GithubProfile = { name: '', location: '', avatar: '' }

function ProfileMark({ profile, className }: { profile: GithubProfile; className: string }) {
  if (!profile.avatar) return <Github className={className} aria-hidden />
  return <img src={profile.avatar} alt="" className={cn(className, 'rounded-full object-cover')} />
}

function Summary({ activity, compact }: { activity: GithubActivity; compact?: boolean }) {
  const { current } = useMemo(() => streaks(activity.days), [activity.days])
  const best = useMemo(() => bestDay(activity.days), [activity.days])
  const period = activity.source === 'graph' ? 'in the last year' : 'recently'
  return (
    <p className="flex items-center gap-x-3 overflow-hidden text-xs text-muted-foreground">
      <span className="truncate"><strong className="font-semibold text-foreground">{activity.total.toLocaleString()}</strong> {activity.source === 'graph' ? 'contributions' : 'public events'} {period}</span>
      <span className="flex shrink-0 items-center gap-1"><Flame className={cn('h-3 w-3', current > 0 && 'text-orange-400')} aria-hidden /> {current}-day streak</span>
      {!compact && best && best.count > 0 && <span className="shrink-0">Best day: {best.count}</span>}
    </p>
  )
}

export function GithubWidget({ mode }: WidgetProps) {
  const { values, ready, save } = useIntegration('github')
  const synced = useAppStore((s) => s.settings.githubUsername)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const username = values.username || (!ready ? '' : synced)
  const [editing, setEditing] = useState(false)
  const compact = mode === 'compact'

  useEffect(() => {
    if (!ready || values.username || !synced) return
    void save({ username: synced }).then(() => updateSettings({ githubUsername: '' }))
  }, [ready, values.username, synced, save, updateSettings])

  const { data, error, loading, refresh } = useCachedResource(username ? `github:${username.toLowerCase()}` : null, (signal) => fetchActivity(username, signal), TTL_MS)

  const saveName = (name: string) => {
    void save({ username: name })
    if (synced) updateSettings({ githubUsername: '' })
    setEditing(false)
  }

  if (!ready) return <WidgetSkeleton label="Loading GitHub" />

  if (!username || editing) {
    return (
      <div className="flex h-full flex-col justify-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Github aria-hidden /> GitHub activity</div>
        <UsernameForm initial={username} onSubmit={saveName} onCancel={username ? () => setEditing(false) : undefined} />
        <p className="text-xs text-muted-foreground">Your username stays on this device and is not synced. Only that name is sent, to load your public graph. No token.</p>
      </div>
    )
  }

  const profileUrl = `https://github.com/${encodeURIComponent(username)}`
  const profile = data?.profile ?? blankProfile
  const displayName = profile.name || `@${username}`

  if (compact) {
    return (
      <div className="flex h-full items-center gap-3 text-sm">
        <ProfileMark profile={profile} className="h-5 w-5 shrink-0 text-muted-foreground" />
        <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 font-medium hover:underline">{displayName}</a>
        {profile.location && <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" aria-hidden /> {profile.location}</span>}
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
        <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-2 rounded outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
          <ProfileMark profile={profile} className="h-7 w-7 shrink-0 text-muted-foreground" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{displayName}</span>
            {(profile.name || profile.location) && (
              <span className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                {profile.name && <span>@{username}</span>}
                {profile.location && <span className="inline-flex items-center gap-1">{profile.name && <span aria-hidden>·</span>} <MapPin className="h-2.5 w-2.5" aria-hidden /> {profile.location}</span>}
              </span>
            )}
          </span>
        </a>
        <div className="flex items-center gap-1">
          <button type="button" onClick={refresh} aria-label="Refresh GitHub activity" className="rounded-md p-1.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /></button>
          <button type="button" onClick={() => setEditing(true)} aria-label="Change GitHub username" className="rounded-md p-1.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><Edit className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {!data && loading && (
        <WidgetSkeleton label="Loading GitHub activity">
          <div className="h-3 w-1/2 animate-pulse rounded-full bg-foreground/10" />
          <div className="grid flex-1 grid-cols-12 gap-1">
            {Array.from({ length: 12 * 7 }, (_, i) => <span key={i} className="aspect-square animate-pulse rounded-[3px] bg-foreground/10" />)}
          </div>
        </WidgetSkeleton>
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
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          <Summary activity={data} />
          <Heatmap days={data.days} weeks={WEEKS} />
          {data.source === 'events' && <p className="truncate text-[11px] text-muted-foreground">Showing recent public activity.</p>}
          {error && <p role="alert" className="truncate text-[11px] text-amber-500">{error} Showing the last update.</p>}

          <div className="min-h-0">
            <h4 className="mb-0.5 px-1 text-[11px] font-medium text-muted-foreground">Recent pushes</h4>
            {data.repos.length > 0 ? (
              <ul>
                {[...data.repos.filter((r) => !r.fork), ...data.repos.filter((r) => r.fork)].slice(0, 3).map((r) => <RepoRow key={r.url} repo={r} />)}
              </ul>
            ) : (
              <p className="px-1 text-xs text-muted-foreground">{data.reposError || 'No public repositories yet.'}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
