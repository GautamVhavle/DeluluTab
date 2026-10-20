import { ShortcutsPanel } from '@/components/shortcuts/ShortcutsPanel'
import type { WidgetProps } from './types'

export function QuickAppsWidget({ mode }: WidgetProps) {
  return <ShortcutsPanel compact={mode === 'compact'} />
}
