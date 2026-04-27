import { Component } from 'react'
import type { ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  message: string
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Unexpected application error.',
    }
  }

  public componentDidCatch(error: Error) {
    console.error('Unhandled application error:', error)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="container-app py-12">
          <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
            <h1 className="text-xl font-bold text-rose-700">Something went wrong.</h1>
            <p className="mt-2 text-sm text-rose-600">{this.state.message}</p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary