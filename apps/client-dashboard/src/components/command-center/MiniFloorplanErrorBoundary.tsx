import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class MiniFloorplanErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('MiniFloorplan Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div 
          className="h-64 relative bg-slate-800/20 rounded-lg flex items-center justify-center border border-red-400/20"
          role="alert"
          aria-live="assertive"
        >
          <div className="text-center p-4">
            <div className="text-red-400 text-sm font-medium mb-2">
              Floor Plan Unavailable
            </div>
            <p className="text-white/60 text-xs">
              Unable to load restaurant floor plan. Please refresh the page.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-2 text-xs text-red-300">
                <summary className="cursor-pointer">Error Details</summary>
                <pre className="mt-1 text-left bg-red-900/20 p-2 rounded overflow-auto max-h-20">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MiniFloorplanErrorBoundary;
