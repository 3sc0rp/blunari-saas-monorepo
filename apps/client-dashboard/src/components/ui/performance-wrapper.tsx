import React, { memo, Suspense, Component, ReactNode } from "react";
import { SkeletonBox } from "./skeleton-components";
// Simple error boundary component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<
  {
    children: ReactNode;
    fallback: (error: Error, reset: () => void) => ReactNode;
  },
  ErrorBoundaryState
> {
  constructor(props: {
    children: ReactNode;
    fallback: (error: Error, reset: () => void) => ReactNode;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error, this.reset);
    }
    return this.props.children;
  }
}

// Error fallback component
const ErrorFallback: React.FC<{
  error: Error;
  resetErrorBoundary: () => void;
}> = ({ error, resetErrorBoundary }) => (
  <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
    <div className="text-destructive">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground mt-2">
        {error.message || "An unexpected error occurred"}
      </p>
    </div>
    <button
      onClick={resetErrorBoundary}
      className="px-4 py-2 bg-brand text-brand-foreground rounded-md hover:bg-brand/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
    >
      Try again
    </button>
  </div>
);

// Performance wrapper with error boundary and suspense
interface PerformanceWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  height?: string;
}

export const PerformanceWrapper: React.FC<PerformanceWrapperProps> = memo(
  ({ children, fallback, className = "", height = "h-64" }) => (
    <ErrorBoundary
      fallback={(error, reset) => (
        <ErrorFallback error={error} resetErrorBoundary={reset} />
      )}
    >
      <Suspense
        fallback={
          fallback || (
            <SkeletonBox className={`w-full ${height} ${className}`} />
          )
        }
      >
        {children}
      </Suspense>
    </ErrorBoundary>
  ),
);

PerformanceWrapper.displayName = "PerformanceWrapper";

// Debounced search hook for performance
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttled scroll hook
export function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = React.useState<T>(value);
  const lastRan = React.useRef(Date.now());

  React.useEffect(() => {
    const handler = setTimeout(
      () => {
        if (Date.now() - lastRan.current >= delay) {
          setThrottledValue(value);
          lastRan.current = Date.now();
        }
      },
      delay - (Date.now() - lastRan.current),
    );

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return throttledValue;
}

// Intersection observer hook for lazy loading
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  {
    threshold = 0,
    root = null,
    rootMargin = "0%",
  }: IntersectionObserverInit = {},
): boolean {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      { threshold, root, rootMargin },
    );

    observer.observe(element);
    return () => observer.unobserve(element);
  }, [elementRef, threshold, root, rootMargin]);

  return isIntersecting;
}

// Memoized component for list items
export const MemoizedCard = memo<{
  children: React.ReactNode;
  className?: string;
}>(({ children, className }) => <div className={className}>{children}</div>);

MemoizedCard.displayName = "MemoizedCard";
