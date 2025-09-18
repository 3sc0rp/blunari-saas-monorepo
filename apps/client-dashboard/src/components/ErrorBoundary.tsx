/**
 * Enterprise Error Boundary with Professional Logging Integration
 * 
 * Features:
 * - Comprehensive error capture and recovery
 * - Integration with enterprise logging system
 * - User-friendly fallback UI
 * - Error analytics and monitoring
 * - Graceful degradation strategies
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../utils/logger';
import { AlertTriangle, RefreshCcw, Bug, Shield } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  component?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRecovery?: boolean;
  level?: 'page' | 'component' | 'widget';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
  retryCount: number;
  lastErrorTime?: number;
}

/**
 * Enterprise-grade Error Boundary component
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeout?: NodeJS.Timeout;
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
      lastErrorTime: Date.now()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { component = 'unknown', onError } = this.props;
    const errorId = this.state.errorId || 'unknown';

    // Log to enterprise logging system with error boundary utility
    const logContext = {
      component,
      operation: 'error_boundary',
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: component
      }
    };
    (logger as any).error('🚨 React Error Boundary caught error', logContext, error);
    
    // Additional detailed logging
    const detailedLogContext = {
      component,
      operation: 'error_boundary_catch',
      correlationId: errorId,
      metadata: {
        errorId,
        componentStack: errorInfo.componentStack,
        errorBoundaryLevel: this.props.level || 'component',
        retryCount: this.state.retryCount,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        stackTrace: error.stack,
        errorName: error.name,
        errorMessage: error.message
      }
    };
    (logger as any).error('🚨 Component Error Boundary Triggered', detailedLogContext, error);

    // Auto-retry for transient errors
    if (error.message?.includes('ChunkLoadError') || 
        error.message?.includes('Loading chunk') ||
        error.message?.includes('Failed to fetch')) {
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }

    // Update state with error info
    this.setState({ errorInfo });

    // Call custom error handler if provided
      if (onError) {
        try {
          onError(error, errorInfo);
        } catch (handlerError) {
          const handlerLogContext = {
            component,
            operation: 'error_handler_failure'
          };
          (logger as any).error('Error in custom error handler', handlerLogContext, handlerError as Error);
        }
      }    // Send to external monitoring
    this.sendToMonitoring(error, errorInfo, errorId);
  }

  private sendToMonitoring = (error: Error, errorInfo: ErrorInfo, errorId: string): void => {
    try {
      // Send to Sentry if available
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          tags: {
            component: this.props.component || 'unknown',
            errorBoundary: true,
            level: this.props.level || 'component',
            errorId
          },
          contexts: {
            errorInfo: {
              componentStack: errorInfo.componentStack,
              retryCount: this.state.retryCount
            }
          },
          level: 'fatal'
        });
      }

      // Send to custom analytics endpoint if configured
      const endpoint = (window as any).__ERROR_ANALYTICS_ENDPOINT__ || '';
      if (endpoint && navigator.sendBeacon) {
        try {
          const payload = JSON.stringify({
            type: 'error_boundary',
            errorId,
            component: this.props.component,
            level: this.props.level,
            error: { name: error.name, message: error.message, stack: error.stack },
            errorInfo: { componentStack: errorInfo.componentStack },
            metadata: {
              retryCount: this.state.retryCount,
              userAgent: navigator.userAgent,
              url: window.location.href,
              timestamp: new Date().toISOString()
            }
          });
          navigator.sendBeacon(endpoint, payload);
        } catch {}
      }
    } catch (monitoringError) {
      const monitoringLogContext = {
        component: this.props.component || 'error-boundary',
        operation: 'monitoring_failure'
      };
      (logger as any).warn('Failed to send error to monitoring service', monitoringLogContext, monitoringError as Error);
    }
  };

  private handleRetry = (): void => {
    const { retryCount } = this.state;
    
    if (retryCount >= this.maxRetries) {
      const maxRetriesLogContext = {
        component: this.props.component || 'error-boundary',
        operation: 'max_retries_reached',
        metadata: { maxRetries: this.maxRetries, retryCount }
      };
      (logger as any).warn('Maximum retry attempts reached', maxRetriesLogContext);
      return;
    }

    const recoveryLogContext = {
      component: this.props.component || 'error-boundary',
      operation: 'error_recovery_attempt',
      metadata: { retryCount: retryCount + 1 }
    };
    (logger as any).info(`🔄 Attempting error recovery (${retryCount + 1}/${this.maxRetries})`, recoveryLogContext);

    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1
    }));

    // Auto-retry with exponential backoff
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    
    this.retryTimeout = setTimeout(() => {
      if (this.state.hasError) {
        this.handleRetry();
      }
    }, this.retryDelay * Math.pow(2, retryCount));
  };

  private handleReload = (): void => {
    const reloadLogContext = {
      component: this.props.component || 'error-boundary',
      operation: 'user_page_reload'
    };
    (logger as any).info('🔄 User initiated page reload from error boundary', reloadLogContext);
    
    window.location.reload();
  };

  private handleReportBug = (): void => {
    const { error, errorInfo, errorId } = this.state;
    
    const bugReportLogContext = {
      component: this.props.component || 'error-boundary',
      operation: 'user_bug_report',
      correlationId: errorId
    };
    (logger as any).info('🐛 User reporting bug from error boundary', bugReportLogContext);

    // Open bug report with pre-filled data
    const reportData = {
      errorId,
      component: this.props.component,
      level: this.props.level,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null,
      componentStack: errorInfo?.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    // You can integrate with your bug reporting system here
    const bugReportUrl = `/support/bug-report?data=${encodeURIComponent(JSON.stringify(reportData))}`;
    window.open(bugReportUrl, '_blank');
  };

  componentWillUnmount(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  render(): ReactNode {
    const { hasError, error, errorId, retryCount } = this.state;
    const { children, fallback, enableRecovery = true, level = 'component' } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default professional error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-red-200 dark:border-red-800 p-6">
            {/* Error Icon */}
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>

            {/* Error Title */}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
              {level === 'page' ? 'Page Error' : 
               level === 'widget' ? 'Widget Error' : 
               'Component Error'}
            </h3>

            {/* Error Message */}
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-4">
              {level === 'page' 
                ? 'This page encountered an unexpected error and could not be displayed.'
                : level === 'widget'
                ? 'This widget encountered an error and cannot be displayed properly.'
                : 'A component on this page encountered an unexpected error.'}
            </p>

            {/* Error ID */}
            {errorId && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium">Error ID:</span> {errorId}
                </p>
              </div>
            )}

            {/* Development Mode Error Details */}
            {process.env.NODE_ENV === 'development' && error && (
              <details className="mb-4">
                <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer mb-2">
                  🔍 Technical Details
                </summary>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 text-xs">
                  <p className="text-red-600 dark:text-red-400 font-mono mb-2">
                    {error.name}: {error.message}
                  </p>
                  {error.stack && (
                    <pre className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap overflow-x-auto">
                      {error.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col space-y-2">
              {enableRecovery && retryCount < this.maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Try Again {retryCount > 0 && `(${retryCount}/${this.maxRetries})`}
                </button>
              )}

              <button
                onClick={this.handleReload}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                <Shield className="w-4 h-4 mr-2" />
                Reload Page
              </button>

              <button
                onClick={this.handleReportBug}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                <Bug className="w-4 h-4 mr-2" />
                Report Issue
              </button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
              If this issue persists, please contact support with the error ID above.
            </p>
          </div>
        </div>
      );
    }

    return children;
  }
}

// Higher-order component for easy error boundary wrapping
export const withErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithErrorBoundaryComponent;
};

// Hook for accessing error boundary context
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, errorInfo?: { componentStack?: string }) => {
    // This would work with a context provider that manages error state
    const hookLogContext = {
      component: 'error-handler-hook',
      operation: 'manual_error_report',
      metadata: errorInfo
    };
    (logger as any).error('Manual error report', hookLogContext, error);

    // You can also throw to trigger the nearest error boundary
    throw error;
  }, []);

  return { handleError };
};

export default ErrorBoundary;
