export const GITHUB_USER = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i

/** GitHub usernames: 1-39 letters, digits or single hyphens, not starting or ending with one. */
export const isGithubUsername = (name: string) => GITHUB_USER.test(name)

export interface ContributionDay {
  /** YYYY-MM-DD */
  date: string
  count: number
  /** 0 (none) to 4 (most), as GitHub's graph shades it. */
  level: 0 | 1 | 2 | 3 | 4
}

export interface GithubRepo {
  name: string
  url: string
  language: string | null
  stars: number
  pushedAt: number
  fork: boolean
  description: string | null
}

export interface GithubProfile {
  name: string
  location: string
  avatar: string
}

export interface GithubActivity {
  username: string
  profile: GithubProfile
  days: ContributionDay[]
  /** Contributions in the period shown (the last year, or about 90 days for the events fallback). */
  total: number
  /** 'graph' is GitHub's real contribution graph; 'events' is a rougher count of recent public events. */
  source: 'graph' | 'events'
  repos: GithubRepo[]
  /** Set when the repository list couldn't be loaded but the graph could. */
  reposError: string
}

const EMPTY_PROFILE: GithubProfile = { name: '', location: '', avatar: '' }

export class GithubError extends Error {
  constructor(message: string, readonly kind: 'not-found' | 'rate-limit' | 'network' | 'other') {
    super(message)
  }
}

async function getJson(url: string, signal?: AbortSignal, headers?: Record<string, string>) {
  let res: Response
  try {
    res = await fetch(url, { signal, headers })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new GithubError("Can't reach GitHub. Check your connection.", 'network')
  }
  if (res.status === 404) throw new GithubError('No GitHub user with that name.', 'not-found')
  if (res.status === 403 || res.status === 429) {
    throw new GithubError("GitHub's hourly limit for anonymous requests was reached (60 an hour). Try again later.", 'rate-limit')
  }
  if (!res.ok) throw new GithubError(`GitHub returned an error (${res.status}).`, 'other')
  return res.json()
}

const level = (n: unknown): ContributionDay['level'] => (n === 1 || n === 2 || n === 3 || n === 4 ? n : 0)

async function fetchGraph(username: string, signal?: AbortSignal): Promise<{ days: ContributionDay[]; total: number }> {
  const d = await getJson(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(username)}?y=last`, signal)
  if (!Array.isArray(d?.contributions)) throw new GithubError('GitHub activity is unavailable right now.', 'other')
  const days: ContributionDay[] = d.contributions
    .filter((c: any) => typeof c?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.date))
    .map((c: any) => ({ date: c.date, count: Math.max(0, Number(c.count) || 0), level: level(c.level) }))
  const total = typeof d.total?.lastYear === 'number' ? d.total.lastYear : days.reduce((n, x) => n + x.count, 0)
  return { days, total }
}

const localDate = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Fallback when the graph service is down: counts public events per day (about the last 90 days). Rougher than the real graph. */
async function fetchFromEvents(username: string, signal?: AbortSignal, today = Date.now()): Promise<{ days: ContributionDay[]; total: number }> {
  const events = await getJson(`https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=100`, signal)
  const perDay = new Map<string, number>()
  for (const e of Array.isArray(events) ? events : []) {
    if (typeof e?.created_at !== 'string') continue
    const day = localDate(Date.parse(e.created_at))
    perDay.set(day, (perDay.get(day) ?? 0) + 1)
  }
  const max = Math.max(1, ...perDay.values())
  const days: ContributionDay[] = []
  for (let i = 90; i >= 0; i--) {
    const date = localDate(today - i * 86_400_000)
    const count = perDay.get(date) ?? 0
    days.push({ date, count, level: count === 0 ? 0 : (Math.min(4, Math.ceil((count / max) * 4)) as ContributionDay['level']) })
  }
  return { days, total: days.reduce((n, d) => n + d.count, 0) }
}

export async function fetchRepos(username: string, signal?: AbortSignal): Promise<GithubRepo[]> {
  const list = await getJson(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=pushed&per_page=12&type=owner`, signal, { Accept: 'application/vnd.github+json' })
  return (Array.isArray(list) ? list : [])
    .filter((r: any) => typeof r?.name === 'string' && typeof r?.html_url === 'string' && /^https:\/\/github\.com\//.test(r.html_url))
    .map((r: any) => ({
      name: r.name,
      url: r.html_url,
      language: typeof r.language === 'string' ? r.language : null,
      stars: Number(r.stargazers_count) || 0,
      pushedAt: Date.parse(r.pushed_at) || 0,
      fork: r.fork === true,
      description: typeof r.description === 'string' ? r.description : null,
    }))
}

async function fetchProfile(username: string, signal?: AbortSignal): Promise<GithubProfile> {
  try {
    const user = await getJson(`https://api.github.com/users/${encodeURIComponent(username)}`, signal)
    const avatar = typeof user?.avatar_url === 'string' && user.avatar_url.startsWith('https://') ? user.avatar_url : ''
    return {
      name: typeof user?.name === 'string' ? user.name.trim() : '',
      location: typeof user?.location === 'string' ? user.location.trim() : '',
      avatar,
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    if (err instanceof GithubError && err.kind === 'not-found') throw err
    return EMPTY_PROFILE
  }
}

export async function fetchActivity(username: string, signal?: AbortSignal): Promise<GithubActivity> {
  const profileP = fetchProfile(username, signal)
  profileP.catch(() => {})
  const reposP = fetchRepos(username, signal).then(
    (repos) => ({ repos, error: '' }),
    (err) => {
      if ((err as Error).name === 'AbortError') throw err
      if (err instanceof GithubError && err.kind === 'not-found') throw err
      return { repos: [] as GithubRepo[], error: err instanceof Error ? err.message : 'Repositories could not be loaded.' }
    },
  )
  // If we bail out below (unknown user, abort), this promise is abandoned; without a handler its rejection
  // would surface as an unhandled promise rejection. The awaited path further down still sees the real result.
  reposP.catch(() => {})
  let graph: { days: ContributionDay[]; total: number }
  let source: GithubActivity['source'] = 'graph'
  try {
    graph = await fetchGraph(username, signal)
  } catch (err) {
    if ((err as Error).name === 'AbortError' || (err instanceof GithubError && err.kind === 'not-found')) throw err
    // The graph service is a community project; if it is down, show what GitHub itself exposes.
    graph = await fetchFromEvents(username, signal)
    source = 'events'
  }
  const [{ repos, error }, profile] = await Promise.all([reposP, profileP])
  return { username, profile, days: graph.days, total: graph.total, source, repos, reposError: error }
}

// ------------------------------------------------------------------ presentation helpers

/** Columns of 7 days (Sunday to Saturday), ending with the week of the last day, newest week last. `null` pads the ends. */
export function buildWeeks(days: ContributionDay[], weeks: number): (ContributionDay | null)[][] {
  if (days.length === 0) return []
  const lastDow = new Date(`${days[days.length - 1].date}T12:00:00`).getDay()
  const grid: (ContributionDay | null)[][] = []
  const byDate = days.slice(-(weeks * 7))
  const firstDow = new Date(`${byDate[0].date}T12:00:00`).getDay()
  const flat: (ContributionDay | null)[] = [...Array(firstDow).fill(null), ...byDate, ...Array(6 - lastDow).fill(null)]
  for (let i = 0; i < flat.length; i += 7) grid.push(flat.slice(i, i + 7))
  return grid.slice(-weeks)
}

/** Current streak (counting back from today, or from yesterday if today has nothing yet) and the longest in the range. */
export function streaks(days: ContributionDay[]): { current: number; longest: number } {
  let longest = 0
  let run = 0
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0
    longest = Math.max(longest, run)
  }
  let i = days.length - 1
  if (i >= 0 && days[i].count === 0) i--
  let current = 0
  while (i >= 0 && days[i].count > 0) {
    current++
    i--
  }
  return { current, longest }
}

export const bestDay = (days: ContributionDay[]) => days.reduce<ContributionDay | null>((best, d) => (d.count > (best?.count ?? 0) ? d : best), null)

/** Colors for the handful of languages people recognise; everything else gets a neutral dot. */
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572a5', Go: '#00add8', Rust: '#dea584', Java: '#b07219',
  'C++': '#f34b7d', C: '#808080', 'C#': '#178600', Ruby: '#701516', PHP: '#4f5d95', Swift: '#f05138', Kotlin: '#a97bff',
  HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051', Vue: '#41b883', Svelte: '#ff3e00', Dart: '#00b4ab', Lua: '#000080',
}
export const languageColor = (language: string | null) => (language && LANGUAGE_COLORS[language]) || '#8b949e'
