import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class MainSplitErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('MainSplit Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div 
          className="h-full grid grid-cols-[280px_1fr] gap-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="glass rounded-[10px] p-8 col-span-2">
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <AlertCircle className="w-16 h-16 text-red-400 mb-6" aria-hidden="true" />
              <h2 className="text-xl font-semibold text-white mb-3">
                Command Center Unavailable
              </h2>
              <p className="text-white/70 mb-6 max-w-md leading-relaxed">
                The command center encountered an unexpected error and couldn't load properly. 
                This might be temporary.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <button
                  onClick={this.handleRetry}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2"
                >
                  Refresh Page
                </button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="w-full max-w-2xl">
                  <summary className="cursor-pointer text-sm text-white/60 hover:text-white/80 transition-colors mb-2">
                    Developer Information
                  </summary>
                  <div className="text-left bg-red-900/20 border border-red-400/20 rounded-lg p-4 mt-2">
                    <div className="text-sm text-red-300 mb-2 font-medium">
                      Error: {this.state.error.message}
                    </div>
                    <pre className="text-xs text-red-200 overflow-auto max-h-40 whitespace-pre-wrap break-all">
                      {this.state.error.stack}
                    </pre>
                    {this.state.errorInfo && (
                      <>
                        <div className="text-sm text-red-300 mb-2 font-medium mt-4">
                          Component Stack:
                        </div>
                        <pre className="text-xs text-red-200 overflow-auto max-h-40 whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MainSplitErrorBoundary;
