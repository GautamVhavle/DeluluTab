import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw, Warning } from '@/components/common/icons'

interface Props {
  label: string
  children: ReactNode
}

interface State {
  failed: boolean
}

/** Keeps one broken widget from taking the whole new tab down with it. */
export class WidgetBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[DeluluTab] ${this.props.label} crashed`, error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="flex h-full flex-col items-start justify-center gap-2 text-sm">
        <p className="flex items-center gap-2 font-medium"><Warning className="h-3.5 w-3.5 text-amber-400" aria-hidden /> {this.props.label} stopped working.</p>
        <p className="text-xs text-muted-foreground">The rest of the page is fine.</p>
        <button
          type="button"
          onClick={() => this.setState({ failed: false })}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1 text-xs font-medium outline-none hover:bg-foreground/15 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCw className="h-3 w-3" aria-hidden /> Try again
        </button>
      </div>
    )
  }
}
