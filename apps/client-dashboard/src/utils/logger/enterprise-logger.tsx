import React from 'react';
import { logger } from './index';

/**
 * Log React Error Boundary errors with enterprise logging
 */
export const logErrorBoundary = (
  error: Error,
  errorInfo: React.ErrorInfo,
  component: string
): void => {
  logger.fatal('🚨 React Error Boundary caught error', {
    component,
    operation: 'error_boundary',
    metadata: {
      componentStack: errorInfo.componentStack,
      errorBoundary: component
    }
  }, error);
};

/**
 * Enterprise Error Boundary Components for Blunari SAAS
 *
 * JSX Components for error handling and user feedback
 */

/**
 * Enterprise Error Boundary Component
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class EnterpriseErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<any> },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ComponentType<any> }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logErrorBoundary(error, errorInfo, 'EnterpriseErrorBoundary');
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} errorInfo={this.state.errorInfo} />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{ error?: Error; errorInfo?: React.ErrorInfo }> = ({ error }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-gray-800">Something went wrong</h3>
          <div className="mt-2 text-sm text-gray-500">
            <p>We're sorry, but something went wrong. Our team has been notified.</p>
            {error && (
              <details className="mt-2">
                <summary className="cursor-pointer">Technical Details</summary>
                <pre className="mt-2 text-xs overflow-auto">{error.message}</pre>
              </details>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <button
          onClick={() => window.location.reload()}
          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
        >
          Reload Page
        </button>
      </div>
    </div>
  </div>
);