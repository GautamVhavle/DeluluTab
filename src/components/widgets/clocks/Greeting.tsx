import { greetingFor } from '@/utils/greetings'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/store/useAppStore'

/** The line under the clock. It follows the time of day, and a custom JSON list when one is saved. */
export function Greeting({ now, name, className }: { now: Date; name: string; className?: string }) {
  const greetings = useAppStore((s) => s.settings.greetings)
  return (
    <p className={cn('line-clamp-2 max-w-xl text-xl font-medium leading-snug tracking-tight', className)}>
      {greetingFor(now.getHours(), name, now, greetings)}
    </p>
  )
}
