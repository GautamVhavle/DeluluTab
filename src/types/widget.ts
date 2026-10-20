import type { LayoutMode } from '@/types'

/** What every dashboard widget receives. Kept small so a new widget does not depend on the whole store. */
export interface WidgetProps {
  mode: LayoutMode
}
