/**
 * @fileoverview Performance optimization utilities (hooks & HOCs)
 * Provides: render monitoring, debounced/throttled callbacks, heavy computation memo, virtual scrolling, lazy loader, metrics collector.
 */

import React, { 
  useCallback, 
  useMemo, 
  useRef, 
  useEffect, 
  useState,
  memo,
  type ReactNode,
  type ComponentType,
  type RefObject
} from 'react';
import { logger } from '../logger';

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const mountTime = useRef(performance.now());
  const lastRenderTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current += 1;
    const currentTime = performance.now();
    const renderDuration = currentTime - lastRenderTime.current;
    lastRenderTime.current = currentTime;

    // Log performance metrics
    logger.debug('Component render metrics', {
      componentName,
      renderCount: renderCount.current,
      renderDuration,
      totalMountTime: currentTime - mountTime.current
    });

    // Warn about excessive re-renders
    if (renderCount.current > 50) {
      logger.warn('Excessive re-renders detected', {
        componentName,
        renderCount: renderCount.current
      });
    }
  });

  return {
    renderCount: renderCount.current,
    mountTime: mountTime.current
  };
}

/**
 * Debounced callback hook for performance optimization
 */
export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay]
  );
}

/**
 * Throttled callback hook for performance optimization
 */
export function useThrottleCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit: number
): T {
  const inThrottle = useRef(false);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback(
    ((...args: Parameters<T>) => {
      if (!inThrottle.current) {
        callbackRef.current(...args);
        inThrottle.current = true;
        setTimeout(() => {
          inThrottle.current = false;
        }, limit);
      }
    }) as T,
    [limit]
  );
}

/**
 * Memoized heavy computation hook
 */
export function useHeavyComputation<T>(
  computeFn: () => T,
  dependencies: unknown[],
  debugName?: string
): T {
  return useMemo(() => {
    const startTime = performance.now();
    const result = computeFn();
    const endTime = performance.now();
    const computationTime = endTime - startTime;

    if (debugName) {
      logger.debug('Heavy computation completed', {
        debugName,
        computationTime,
        dependencies: dependencies.length
      });

      // Warn about slow computations
      if (computationTime > 16) { // More than one frame (60fps)
        logger.warn('Slow computation detected', {
          debugName,
          computationTime,
          threshold: 16
        });
      }
    }

    return result;
  }, dependencies);
}

/**
 * Intersection Observer hook for lazy loading
 */
export function useIntersectionObserver(
  elementRef: RefObject<Element>,
  options?: IntersectionObserverInit
): {
  isIntersecting: boolean;
  intersectionRatio: number;
} {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [intersectionRatio, setIntersectionRatio] = useState(0);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        setIntersectionRatio(entry.intersectionRatio);
        
        logger.debug('Intersection observed', {
          isIntersecting: entry.isIntersecting,
          intersectionRatio: entry.intersectionRatio,
          target: element.tagName
        });
      },
      {
        threshold: [0, 0.25, 0.5, 0.75, 1],
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, options]);

  return { isIntersecting, intersectionRatio };
}

/**
 * Virtual scrolling hook for large lists
 */
export function useVirtualScrolling({
  totalItems,
  itemHeight,
  containerHeight,
  overscan = 5
}: {
  totalItems: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleItemsCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    totalItems - 1,
    startIndex + visibleItemsCount + overscan * 2
  );

  const visibleItems = useMemo(() => {
    const items = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({
        index: i,
        style: {
          position: 'absolute' as const,
          top: i * itemHeight,
          height: itemHeight,
          width: '100%'
        }
      });
    }
    return items;
  }, [startIndex, endIndex, itemHeight]);

  const totalHeight = totalItems * itemHeight;

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    handleScroll,
    startIndex,
    endIndex
  };
}

/**
 * Resource preloader hook
 */
export function useResourcePreloader(resources: string[]) {
  const [loadedResources, setLoadedResources] = useState<Set<string>>(new Set());
  const [failedResources, setFailedResources] = useState<Set<string>>(new Set());

  useEffect(() => {
    const preloadPromises = resources.map(async (resource) => {
      try {
        if (resource.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          // Preload image
          const img = new Image();
          img.src = resource;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
        } else if (resource.match(/\.(js|css)$/i)) {
          // Preload script/style
          const link = document.createElement('link');
          link.rel = resource.endsWith('.css') ? 'stylesheet' : 'preload';
          link.href = resource;
          if (!resource.endsWith('.css')) {
            link.as = 'script';
          }
          document.head.appendChild(link);
        }

        setLoadedResources(prev => new Set(prev).add(resource));
        logger.debug('Resource preloaded', { resource });
      } catch (error) {
        setFailedResources(prev => new Set(prev).add(resource));
        logger.warn('Resource preload failed', { resource, error });
      }
    });

    Promise.allSettled(preloadPromises);
  }, [resources]);

  return {
    loadedResources,
    failedResources,
    isAllLoaded: loadedResources.size === resources.length,
    loadProgress: resources.length > 0 ? loadedResources.size / resources.length : 1
  };
}

/**
 * Memory-efficient state hook for large datasets
 */
export function useLargeDataset<T>(
  data: T[],
  pageSize: number = 100
) {
  const [currentPage, setCurrentPage] = useState(0);
  const [cache] = useState(() => new Map<number, T[]>());

  const paginatedData = useMemo(() => {
    const cacheKey = currentPage;
    
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)!;
    }

    const startIndex = currentPage * pageSize;
    const endIndex = Math.min(startIndex + pageSize, data.length);
    const pageData = data.slice(startIndex, endIndex);

    // Cache with size limit
    if (cache.size > 10) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    cache.set(cacheKey, pageData);
    
    logger.debug('Dataset page cached', {
      page: currentPage,
      pageSize,
      cacheSize: cache.size,
      dataLength: pageData.length
    });

    return pageData;
  }, [data, currentPage, pageSize, cache]);

  const totalPages = Math.ceil(data.length / pageSize);

  return {
    currentData: paginatedData,
    currentPage,
    totalPages,
    setPage: setCurrentPage,
    hasNextPage: currentPage < totalPages - 1,
    hasPreviousPage: currentPage > 0,
    nextPage: () => setCurrentPage(p => Math.min(p + 1, totalPages - 1)),
    previousPage: () => setCurrentPage(p => Math.max(p - 1, 0))
  };
}

/**
 * Higher-order component for performance optimization
 */
export function withPerformanceOptimization<T extends Record<string, any>>(
  WrappedComponent: ComponentType<T>,
  options: {
    memoize?: boolean;
    displayName?: string;
    debugRenders?: boolean;
  } = {}
): ComponentType<T> {
  const {
    memoize = true,
    displayName = WrappedComponent.displayName || WrappedComponent.name,
    debugRenders = false
  } = options;

  const OptimizedComponent = (props: T) => {
    const { renderCount } = usePerformanceMonitor(displayName);

    if (debugRenders) {
      logger.debug('Component render', {
        componentName: displayName,
        renderCount,
        props: Object.keys(props as object)
      });
    }

    return <WrappedComponent {...props} />;
  };

  OptimizedComponent.displayName = `withPerformanceOptimization(${displayName})`;

  // Cast to ComponentType<T> to satisfy generic expectations; runtime shape is preserved.
  return (memoize ? (memo(OptimizedComponent) as unknown as ComponentType<T>) : OptimizedComponent) as ComponentType<T>;
}

/**
 * Bundle splitting utility
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback: ReactNode = null
): ComponentType<React.ComponentProps<T>> {
  const LazyComponent = memo((props: React.ComponentProps<T>) => {
    const [Component, setComponent] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
      let mounted = true;

      const loadComponent = async () => {
        try {
          const startTime = performance.now();
          const module = await importFn();
          const endTime = performance.now();

          if (mounted) {
            setComponent(() => module.default);
            setLoading(false);
            
            logger.debug('Component lazy loaded', {
              componentName: module.default.name || 'Anonymous',
              loadTime: endTime - startTime
            });
          }
        } catch (err) {
          if (mounted) {
            setError(err as Error);
            setLoading(false);
            logger.error('Component lazy load failed', err as Error);
          }
        }
      };

      loadComponent();

      return () => {
        mounted = false;
      };
    }, []);

    if (loading) {
      return <>{fallback}</>;
    }

    if (error) {
      logger.error('Lazy component error', error);
      return <div>Error loading component</div>;
    }

    if (!Component) {
      return <div>Component not found</div>;
    }

    return <Component {...props} />;
  });

  LazyComponent.displayName = 'LazyComponent';
  return LazyComponent as unknown as ComponentType<React.ComponentProps<T>>;
}

/**
 * Performance metrics collector
 */
export class PerformanceCollector {
  private static metrics = new Map<string, any>();

  static startMeasurement(name: string): void {
    performance.mark(`${name}-start`);
    this.metrics.set(name, { startTime: performance.now() });
  }

  static endMeasurement(name: string): number {
    const endTime = performance.now();
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);

    const metric = this.metrics.get(name);
    if (metric) {
      const duration = endTime - metric.startTime;
      metric.duration = duration;
      metric.endTime = endTime;

      logger.debug('Performance measurement', {
        name,
        duration,
        timestamp: new Date().toISOString()
      });

      return duration;
    }

    return 0;
  }

  static getMetrics(): Map<string, any> {
    return new Map(this.metrics);
  }

  static clearMetrics(): void {
    this.metrics.clear();
    performance.clearMarks();
    performance.clearMeasures();
  }

  static generateReport(): string {
    const metrics = Array.from(this.metrics.entries()).map(([name, data]) => ({
      name,
      ...data
    }));

    return JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics,
      summary: {
        totalMeasurements: metrics.length,
        averageDuration: metrics.reduce((acc, m) => acc + (m.duration || 0), 0) / metrics.length,
        slowestOperation: metrics.reduce((slowest, current) => 
          (current.duration || 0) > (slowest.duration || 0) ? current : slowest, 
          { duration: 0 }
        )
      }
    }, null, 2);
  }
}

// Export all performance utilities
export {
  memo,
  useCallback,
  useMemo
};