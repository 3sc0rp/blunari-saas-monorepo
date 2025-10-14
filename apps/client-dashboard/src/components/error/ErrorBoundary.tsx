/**
 * Enterprise-grade Error Boundary System
 * Provides comprehensive error handling, recovery, and reporting
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { logger } from '@/utils/logger';
import { performanceMonitor } from '@/utils/performanceMonitor';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
  enableRecovery?: boolean;
  level?: 'page' | 'component' | 'critical';
}

class EnterpriseErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimer: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component' } = this.props;
    
    // Log the error with full context
    logger.error('React Error Boundary caught error', error, {
      errorInfo: errorInfo.componentStack,
      level,
      errorId: this.state.errorId,
      retryCount: this.state.retryCount,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });

    // Track error in performance monitoring
    performanceMonitor.recordUXEvent('error', undefined, {
      errorType: 'react_boundary',
      errorMessage: error.message,
      level,
      errorId: this.state.errorId
    });

    // Update state with error info
    this.setState({ errorInfo });

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo);
    }

    // Auto-recovery for non-critical errors
    if (level !== 'critical' && this.props.enableRecovery !== false) {
      this.scheduleRecovery();
    }

    // Report to external error service (in production)
    if (import.meta.env.PROD) {
      this.reportToErrorService(error, errorInfo);
    }
  }

  private scheduleRecovery = () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount >= maxRetries) {
      logger.warn('Max retry attempts reached for error boundary', {
        errorId: this.state.errorId,
        retryCount: this.state.retryCount
      });
      return;
    }

    // Progressive delay: 1s, 2s, 4s
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000);
    
    this.retryTimer = setTimeout(() => {
      logger.info('Attempting automatic recovery', {
        errorId: this.state.errorId,
        retryCount: this.state.retryCount + 1
      });
      
      this.retry();
    }, delay);
  };

  private reportToErrorService = (error: Error, errorInfo: ErrorInfo) => {
    // Integration point for services like Sentry, LogRocket, etc.
    try {
      // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });    } catch (reportingError) {
      logger.error('Failed to report error to external service', reportingError);
    }
  };

  private retry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  };

  componentWillUnmount() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.retry);
      }

      // Default fallback UI based on error level
      return this.renderDefaultFallback();
    }

    return this.props.children;
  }

  private renderDefaultFallback() {
    const { level = 'component' } = this.props;
    const { error, errorId, retryCount } = this.state;
    const { maxRetries = 3 } = this.props;

    if (level === 'critical') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.732 0L3.732 19c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Application Error</h3>
              <p className="text-sm text-gray-500 mb-4">
                We're sorry, but something went wrong. Please refresh the page or contact support.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Refresh Page
                </button>
                {import.meta.env.DEV && (
                  <details className="text-left">
                    <summary className="cursor-pointer text-sm text-gray-500">Error Details</summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                      {error?.message}
                      {'\n\nError ID: '}
                      {errorId}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Component-level error
    return (
      <div className="border-2 border-dashed border-red-200 rounded-lg p-4 bg-red-50">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">Component Error</h3>
            <p className="mt-1 text-sm text-red-700">
              This component encountered an error and couldn't render properly.
            </p>
            {retryCount < maxRetries && (
              <div className="mt-2">
                <button
                  onClick={this.retry}
                  className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200"
                >
                  Try Again ({maxRetries - retryCount} attempts left)
                </button>
              </div>
            )}
            {import.meta.env.DEV && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-red-600">Technical Details</summary>
                <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto">
                  {error?.message}
                  {'\n\nError ID: '}
                  {errorId}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  }
}

// Convenience wrapper components
export const CriticalErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <EnterpriseErrorBoundary level="critical" maxRetries={0}>
    {children}
  </EnterpriseErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ 
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}> = ({ children, fallback }) => (
  <EnterpriseErrorBoundary level="component" enableRecovery fallback={fallback}>
    {children}
  </EnterpriseErrorBoundary>
);

export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <EnterpriseErrorBoundary level="page" maxRetries={2}>
    {children}
  </EnterpriseErrorBoundary>
);

export default EnterpriseErrorBoundary;

