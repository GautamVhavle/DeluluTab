import { useEffect, useState } from 'react'
import { Moon, Search, Sparkles, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/use-theme'

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function greetingFor(hour: number) {
  if (hour < 5) return 'Still up, dreamer?'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const now = useClock()

  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="flex min-h-full flex-col bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Sparkles className="h-4 w-4 text-violet-500 dark:text-violet-400" />
          DeluluTab
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun /> : <Moon />}
        </Button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 pb-24">
        <div className="text-center">
          <p className="text-7xl font-light tabular-nums tracking-tight sm:text-8xl">{time}</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{date}</p>
        </div>

        <h1 className="text-2xl font-medium text-slate-700 dark:text-slate-300">
          {greetingFor(now.getHours())}
        </h1>

        <form
          className="w-full max-w-xl"
          onSubmit={(e) => {
            e.preventDefault()
            const q = new FormData(e.currentTarget).get('q')?.toString().trim()
            if (q) window.location.href = `https://www.google.com/search?q=${encodeURIComponent(q)}`
          }}
        >
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-violet-500/50 dark:border-slate-800 dark:bg-slate-900">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              name="q"
              autoFocus
              autoComplete="off"
              placeholder="Search the web or ask AI…"
              className="w-full bg-transparent text-base outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </label>
        </form>
      </main>
    </div>
  )
}
