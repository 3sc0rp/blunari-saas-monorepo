import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

// Extend window interface for gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // Call optional error handler
      if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Report to error reporting service
      if (available
      if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.toString(),
        fatal: false
      })
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="space-y-2">
              <p className="font-medium">Something went wrong</p>
              <p className="text-sm">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleRetry}
                className="mt-2"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Try Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

