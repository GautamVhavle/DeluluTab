import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CLASSIC_QUOTES, QUOTES, quoteAt, type Quote } from '@/config/quotes'
import { isRemoteQuoteSource, loadQuotes } from '@/services/quotes'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/store/useAppStore'
import type { WidgetProps } from './types'

function useMinute() {
  const [minute, setMinute] = useState(() => Math.floor(Date.now() / 60_000))
  useEffect(() => {
    let timer = 0
    const schedule = () => {
      const wait = 60_000 - (Date.now() % 60_000) + 30
      timer = window.setTimeout(() => {
        setMinute(Math.floor(Date.now() / 60_000))
        schedule()
      }, wait)
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [])
  return minute
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return reduced
}

/** One bold line. It fades out as the minute turns, and the next line fades in. */
export function QuotesWidget({ mode }: WidgetProps) {
  const source = useAppStore((s) => s.settings.quoteSource)
  const custom = useAppStore((s) => s.settings.customQuotes)
  const quoteUrl = useAppStore((s) => s.settings.quoteUrl)
  const minute = useMinute()
  const reduced = usePrefersReducedMotion()
  const [remote, setRemote] = useState<Quote[] | null>(null)
  const [status, setStatus] = useState('')
  const focus = mode === 'focus'
  const compact = mode === 'compact'
  const remoteSource = isRemoteQuoteSource(source)

  useEffect(() => {
    if (!remoteSource) return
    let dead = false
    setRemote(null)
    setStatus('')
    loadQuotes(source, quoteUrl)
      .then((list) => {
        if (dead) return
        setRemote(list)
      })
      .catch((err: unknown) => {
        if (dead) return
        setRemote([])
        setStatus(err instanceof Error ? err.message : "Can't reach that quote source.")
      })
    return () => {
      dead = true
    }
  }, [remoteSource, source, quoteUrl])

  const own = custom.filter((quote) => quote.text.trim())
  const list = source === 'builtin' ? QUOTES : source === 'classics' ? CLASSIC_QUOTES : source === 'custom' ? own : (remote ?? [])
  const quote = quoteAt(list, minute)
  const fade = reduced ? 0 : 0.7

  return (
    <figure className="flex h-full flex-col justify-center">
      <div className="relative min-h-16">
        <AnimatePresence mode="wait" initial={false}>
          {quote ? (
            <motion.div
              key={`${quote.text}-${quote.by}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: fade, ease: [0.22, 1, 0.36, 1] }}
            >
              <blockquote className={cn('text-balance font-bold leading-snug tracking-tight', focus ? 'text-center text-3xl' : compact ? 'text-lg' : 'text-xl')}>
                “{quote.text}”
              </blockquote>
              <figcaption className={cn('mt-3 text-xs font-medium text-muted-foreground', focus && 'text-center')}>{quote.by}</figcaption>
            </motion.div>
          ) : (
            <motion.p key="empty" className="text-sm text-muted-foreground">
              {status || (source === 'custom' ? 'Add your own lines in Settings → Quotes.' : remoteSource && remote === null ? 'Loading a quote…' : 'No quotes from that source.')}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </figure>
  )
}
