import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
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

  componentDidCatch(error: Error) {
    console.error('UI error boundary caught:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-3xl mx-auto p-6">
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="font-semibold text-red-800 mb-1">Something went wrong</div>
            <div>{this.state.message || 'A rendering error occurred.'}</div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
