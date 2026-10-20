import { Component } from 'react'
import type { ReactNode } from 'react'
import ErrorState from './ErrorState'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  public componentDidCatch(error: Error) {
    console.error('Unhandled application error:', error)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="container-app py-12">
          <ErrorState
            error={this.state.error}
            title="Halaman ini mengalami error"
            description="Terjadi kesalahan saat menampilkan halaman. Muat ulang untuk mencoba lagi."
            onRetry={() => window.location.reload()}
            className="mx-auto max-w-xl"
          />
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary