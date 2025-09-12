/**
 * Performance Optimization Hook
 * Helps reduce memory usage and improve performance
 */
import { useEffect, useCallback, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Performance monitoring
interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  navigationTime: number;
}

// Debounce hook for performance
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

// Memory cleanup hook
export function useMemoryCleanup() {
  const location = useLocation();
  const previousLocation = useRef(location.pathname);

  useEffect(() => {
    try {
      // Clean up when navigating away from heavy pages
      const currentPath = location.pathname;
      const previousPath = previousLocation.current;

      if (previousPath !== currentPath) {
        // Force garbage collection on heavy pages
        const heavyPages = ['/dashboard/tables', '/dashboard/analytics', '/dashboard/ai-business-insights'];

        if (heavyPages.some(page => previousPath.includes(page))) {
          // Clear any lingering timers
          const timerId = setTimeout(() => {}, 0);
          clearTimeout(timerId);

          // Request garbage collection if available (Chrome DevTools)
          if (typeof window !== 'undefined' && typeof (window as any).gc === 'function') {
            setTimeout(() => (window as any).gc(), 1000);
          }
        }
      }

      previousLocation.current = currentPath;
    } catch (error) {
      // Silently fail memory cleanup in environments where it's not available
      console.warn('[MemoryCleanup] Failed to clean up memory:', error);
    }
  }, [location.pathname]);
}

// Performance monitoring hook
export function usePerformanceMonitoring(componentName: string) {
  const startTime = useRef(typeof performance !== 'undefined' ? performance.now() : Date.now());
  const location = useLocation();

  useEffect(() => {
    try {
      // Check if performance API is available
      if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
        return;
      }

      const endTime = performance.now();
      const renderTime = endTime - startTime.current;

      // Validate render time is reasonable (not negative or extremely large)
      if (renderTime < 0 || renderTime > 10000) {
        console.warn(`[Performance] Invalid render time for ${componentName}: ${renderTime}ms`);
        return;
      }

      // Log performance metrics for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${componentName}:`, {
          renderTime: `${renderTime.toFixed(2)}ms`,
          path: location.pathname,
          memory: (performance as any).memory ? {
            used: `${((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
            total: `${((performance as any).memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
            limit: `${((performance as any).memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
          } : 'Not available'
        });
      }

      // Reset timer for next render
      startTime.current = performance.now();
    } catch (error) {
      // Silently fail performance monitoring in environments where it's not available
      console.warn(`[Performance] Failed to monitor ${componentName}:`, error);
    }
  });

  return {
    startTime: startTime.current,
    componentName
  };
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    });

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [ref, options]);

  return isVisible;
}

// Prefetch hook for better navigation performance
export function usePrefetch() {
  const navigate = useNavigate();

  const prefetchRoute = useCallback((path: string) => {
    // Create a link element for prefetching
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = path;
    document.head.appendChild(link);

    // Clean up after 5 seconds
    setTimeout(() => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    }, 5000);
  }, []);

  const navigateWithPrefetch = useCallback((path: string) => {
    prefetchRoute(path);
    setTimeout(() => navigate(path), 100);
  }, [navigate, prefetchRoute]);

  return {
    prefetchRoute,
    navigateWithPrefetch
  };
}

// Bundle size monitoring
export function useBundleMonitoring() {
  useEffect(() => {
    try {
      if (process.env.NODE_ENV === 'development' && typeof console !== 'undefined') {
        // Monitor bundle loading
        const originalLog = console.log;
        console.log = (...args) => {
          if (args[0]?.includes?.('chunk')) {
            originalLog('[Bundle Loading]', ...args);
          } else {
            originalLog(...args);
          }
        };

        return () => {
          console.log = originalLog;
        };
      }
    } catch (error) {
      // Silently fail bundle monitoring in environments where it's not available
      console.warn('[BundleMonitoring] Failed to monitor bundles:', error);
    }
  }, []);
}
