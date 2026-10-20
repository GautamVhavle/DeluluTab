import { Newspaper } from 'lucide-react'
import type { WidgetProps } from './types'

const HEADLINES = ['AI headlines will appear here', 'Pick your sources in settings', 'Stay curious, stay delulu']

/** Placeholder until a news provider is wired up (detailed layout only). */
export function NewsWidget(_: WidgetProps) {
  return (
    <div className="flex h-full flex-col gap-3">
      <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Newspaper className="h-4 w-4" /> News
      </h3>
      <ul className="space-y-2 text-sm">
        {HEADLINES.map((h) => (
          <li key={h} className="truncate">
            {h}
          </li>
        ))}
      </ul>
    </div>
  )
}
