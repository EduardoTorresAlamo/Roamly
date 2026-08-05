import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Optional custom rescue UI; falls back to the built-in screen when omitted */
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Generic error boundary that catches render-phase crashes in its subtree and
 * swaps the broken UI for a rescue screen with a reload button.
 *
 * React only supports error boundaries as class components, so this is the one
 * class in the codebase. It deliberately catches *any* error rather than
 * pattern-matching on the message: a blank white screen is always worse than a
 * generic "something broke, reload" panel.
 *
 * Note it does NOT catch errors thrown in event handlers, async callbacks, or
 * outside the React render cycle — those still surface in the console.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the stack in the console for debugging; a real deployment would
    // forward this to an error-reporting service instead.
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleReset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback

    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-border/60 bg-background/80 p-8 text-center shadow-xl backdrop-blur-md">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>

          <h2 className="text-xl font-semibold tracking-tight">Something went wrong</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This part of Roamly crashed unexpectedly. Your trips are saved locally, so
            reloading should bring everything back.
          </p>

          {/* Message only — the full stack stays in the console, not on screen */}
          <p className="mt-4 truncate rounded-lg bg-muted/60 px-3 py-2 font-mono text-xs text-muted-foreground">
            {error.message || 'Unknown error'}
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={this.handleReload} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reload app
            </Button>
            <Button variant="outline" onClick={this.handleReset}>
              Try again
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
