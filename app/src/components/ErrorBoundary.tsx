import { Component, type ReactNode } from 'react'
import { isChunkLoadError, shouldReloadForChunkError } from '../lib/chunkReload'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  name?: string
  context?: Record<string, unknown>
  // When this value changes (e.g. the route path), the boundary resets so a
  // crash on one page doesn't permanently block navigation to other pages.
  resetKey?: string | number
}

interface ErrorBoundaryState {
  hasError: boolean
  message?: string
  /** A route whose code no longer exists on the server, not a component bug. */
  isStaleBuild?: boolean
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message, isStaleBuild: isChunkLoadError(error) }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, message: undefined, isStaleBuild: undefined })
    }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error(`${this.props.name || 'UI'} error boundary caught:`, {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.context,
    })

    // A deploy deleted the chunk this tab asked for. Reloading is the only fix,
    // and doing it here spares the user a dead end whose message names a
    // webpack chunk id. Bounded to one attempt — see ../lib/chunkReload.
    if (shouldReloadForChunkError(error, Date.now(), window.sessionStorage)) {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      // Takes precedence over a caller's fallback: this is not the failure any
      // of them were written for, and none of them offer the one action that
      // works. Reaching here at all means the automatic reload was declined as
      // a loop risk, so the only honest thing left is to ask.
      if (this.state.isStaleBuild) {
        return (
          <div className="max-w-3xl mx-auto p-6">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <div className="mb-1 font-semibold text-amber-900">This page is out of date</div>
              <div>
                ClearCaseIQ was updated while this tab was open, so part of the page could no longer
                be loaded. Reloading will pick up the new version.
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-50"
                >
                  Reload page
                </button>
              </div>
            </div>
          </div>
        )
      }

      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="max-w-3xl mx-auto p-6">
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="font-semibold text-red-800 mb-1">Something went wrong</div>
            <div>{this.state.message || 'A rendering error occurred.'}</div>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, message: undefined, isStaleBuild: undefined })}
                className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
