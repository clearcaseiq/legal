import { Component, type ReactNode } from 'react'

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
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, message: undefined })
    }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error(`${this.props.name || 'UI'} error boundary caught:`, {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.context,
    })
  }

  render() {
    if (this.state.hasError) {
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
                onClick={() => this.setState({ hasError: false, message: undefined })}
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
