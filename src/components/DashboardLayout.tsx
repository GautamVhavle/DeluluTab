import { WidgetGrid } from './grid/WidgetGrid'

/** The dashboard body. Arrangement is a draggable grid; Detailed, Compact and Focus each keep their own layout. */
export function DashboardLayout() {
  return <WidgetGrid />
}
