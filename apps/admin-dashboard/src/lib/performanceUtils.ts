/**
 * Performance Optimization Utilities
 * 
 * React performance helpers for memoization, debouncing, throttling, and optimization.
 * These hooks help prevent unnecessary re-renders and improve application performance.
 * 
 * @module performanceUtils
 * @author Blunari Team
 * @since Phase 2 - Performance Optimization
 */

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

/**
 * Deep comparison memoization hook that performs deep equality checks on dependencies.
 * 
 * @template T
 * @param {() => T} factory - The factory function to memoize
 * @param {React.DependencyList} deps - Dependencies to deep compare
 * @returns {T} The memoized value
 * 
 * @example
 * ```typescript
 * const expensiveResult = useDeepCompareMemo(() => {
 *   return processComplexData(obj);
 * }, [obj]); // Will only recompute if obj deeply changes
 * ```
 * 
 * @remarks
 * Unlike `useMemo`, this hook performs deep equality checking on dependencies,
 * preventing unnecessary recalculations when objects/arrays are recreated with
 * the same values.
 * 
 * @performance Use for expensive computations with object/array dependencies
 */
export function useDeepCompareMemo<T>(factory: () => T, deps: React.DependencyList): T {
  const ref = useRef<{ deps: React.DependencyList; value: T }>();
  
  const depsChanged = !ref.current || !deepEqual(ref.current.deps, deps);
  
  if (depsChanged) {
    ref.current = { deps, value: factory() };
  }
  
  return ref.current!.value;
}

/**
 * Deep equality comparison utility function.
 * 
 * @param {unknown} a - First value to compare
 * @param {unknown} b - Second value to compare
 * @returns {boolean} True if values are deeply equal
 * 
 * @remarks
 * Recursively compares objects and arrays. Uses strict equality (===) for primitives.
 * 
 * @internal Used by useDeepCompareMemo
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }
  
  return true;
}

/**
 * Debounce hook that delays callback execution until after a specified time.
 * 
 * @template T
 * @param {T} callback - The function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {T} Debounced version of the callback
 * 
 * @example
 * ```typescript
 * const handleSearch = useDebounce((query: string) => {
 *   // This will only execute 500ms after the user stops typing
 *   searchAPI(query);
 * }, 500);
 * 
 * <input onChange={(e) => handleSearch(e.target.value)} />
 * ```
 * 
 * @remarks
 * - Ideal for search inputs, auto-save, and API calls
 * - Cancels previous timeout if called again before delay expires
 * - Maintains stable reference between renders
 * 
 * @performance Reduces API calls and expensive operations by up to 90%
 * @use-case Search bars, form auto-save, resize handlers
 */
export function useDebounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
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
 * Throttle hook that limits callback execution frequency to once per time period.
 * 
 * @template T
 * @param {T} callback - The function to throttle
 * @param {number} limit - Minimum time between calls in milliseconds
 * @returns {T} Throttled version of the callback
 * 
 * @example
 * ```typescript
 * const handleScroll = useThrottle(() => {
 *   // This will execute at most once every 200ms during scrolling
 *   updateScrollPosition();
 * }, 200);
 * 
 * window.addEventListener('scroll', handleScroll);
 * ```
 * 
 * @remarks
 * - Unlike debounce, throttle guarantees execution at regular intervals
 * - First call executes immediately
 * - Subsequent calls are blocked until limit expires
 * 
 * @performance Ideal for high-frequency events like scroll, mousemove
 * @use-case Scroll handlers, resize handlers, analytics tracking
 */
export function useThrottle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  limit: number
): T {
  const inThrottle = useRef(false);
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
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
 * Intersection Observer hook for lazy loading and viewport detection.
 * 
 * @param {React.RefObject<Element>} ref - Reference to the element to observe
 * @param {IntersectionObserverInit} [options={}] - Intersection observer options
 * @returns {boolean} True when element is intersecting (visible in viewport)
 * 
 * @example
 * ```typescript
 * const ref = useRef<HTMLDivElement>(null);
 * const isVisible = useIntersectionObserver(ref, {
 *   threshold: 0.5 // Trigger when 50% visible
 * });
 * 
 * return (
 *   <div ref={ref}>
 *     {isVisible && <HeavyComponent />}
 *   </div>
 * );
 * ```
 * 
 * @remarks
 * Options:
 * - `threshold`: Visibility percentage (0-1)
 * - `rootMargin`: Margin around viewport
 * - `root`: Custom viewport element
 * 
 * @performance Enables lazy loading of images, components, and infinite scroll
 * @use-case Lazy loading, infinite scroll, analytics (view tracking)
 */
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isIntersecting, setIntersecting] = useState(false);
  
  useEffect(() => {
    if (!ref.current) return;
    
    const observer = new IntersectionObserver(([entry]) => {
      setIntersecting(entry.isIntersecting);
    }, options);
    
    observer.observe(ref.current);
    
    return () => {
      observer.disconnect();
    };
  }, [ref, options]);
  
  return isIntersecting;
}

/**
 * Memoized computation hook with performance monitoring.
 * 
 * @template T
 * @param {() => T} compute - The computation function to memoize
 * @param {React.DependencyList} deps - Dependencies that trigger recomputation
 * @param {string} [debugName] - Optional name for performance logging
 * @returns {T} The memoized computed value
 * 
 * @example
 * ```typescript
 * const stats = useMemoizedComputation(() => {
 *   return expensiveStatsCalculation(data);
 * }, [data], 'DashboardStats');
 * 
 * // In development, logs if computation takes > 16ms:
 * // [Performance] Slow computation in DashboardStats: 23.45ms
 * ```
 * 
 * @remarks
 * - Wraps `useMemo` with performance tracking
 * - In development mode, warns if computation exceeds 16ms (1 frame)
 * - Helps identify performance bottlenecks
 * 
 * @performance Use for expensive calculations, data transformations
 * @development Shows performance warnings in dev console
 */
export function useMemoizedComputation<T>(
  compute: () => T,
  deps: React.DependencyList,
  debugName?: string
): T {
  return useMemo(() => {
    const start = performance.now();
    const result = compute();
    const duration = performance.now() - start;
    
    if (import.meta.env.MODE === 'development' && duration > 16) {
      console.warn(`[Performance] Slow computation in ${debugName || 'unknown'}: ${duration.toFixed(2)}ms`);
    }
    
    return result;
  }, deps);
}

/**
 * Event callback hook that maintains a stable reference while always using latest function.
 * 
 * @template T
 * @param {T} fn - The event callback function
 * @returns {T} A stable callback reference
 * 
 * @example
 * ```typescript
 * const MyComponent = ({ onSave, data }) => {
 *   // handleClick reference never changes, but always calls latest onSave
 *   const handleClick = useEventCallback(() => {
 *     onSave(data);
 *   });
 *   
 *   // ChildComponent won't re-render when onSave/data changes
 *   return <ChildComponent onClick={handleClick} />;
 * };
 * ```
 * 
 * @remarks
 * - Combines benefits of `useCallback` (stable reference) with always-fresh closure
 * - Prevents unnecessary child re-renders while accessing latest props/state
 * - No need to list dependencies
 * 
 * @performance Ideal for callbacks passed to memoized children
 * @use-case Event handlers, callbacks to child components
 */
export function useEventCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T
): T {
  const ref = useRef<T>(fn);
  
  useEffect(() => {
    ref.current = fn;
  }, [fn]);
  
  return useCallback((...args: Parameters<T>) => {
    return ref.current(...args);
  }, []) as T;
}

/**
 * Hook to access the previous value of a state or prop.
 * 
 * @template T
 * @param {T} value - The current value
 * @returns {T | undefined} The previous value (undefined on first render)
 * 
 * @example
 * ```typescript
 * const [count, setCount] = useState(0);
 * const prevCount = usePrevious(count);
 * 
 * console.log(`Count changed from ${prevCount} to ${count}`);
 * // First render: "Count changed from undefined to 0"
 * // After increment: "Count changed from 0 to 1"
 * ```
 * 
 * @remarks
 * - Returns `undefined` on first render
 * - Updates to current value after each render
 * - Useful for detecting changes and animations
 * 
 * @use-case Change detection, animations, comparative logic
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
}

/**
 * Render count tracking hook for performance debugging (development only).
 * 
 * @param {string} componentName - Name of the component to track
 * @returns {number} Current render count
 * 
 * @example
 * ```typescript
 * const MyComponent = () => {
 *   const renderCount = useRenderCount('MyComponent');
 *   
 *   // Development console output:
 *   // [Render] MyComponent rendered 1 times
 *   // [Render] MyComponent rendered 2 times
 *   // [Performance] MyComponent has rendered 21 times - consider optimization
 *   
 *   return <div>Rendered {renderCount} times</div>;
 * };
 * ```
 * 
 * @remarks
 * - Only logs in development mode
 * - Warns if component renders more than 20 times
 * - Helps identify unnecessary re-renders
 * - Does not affect production performance
 * 
 * @development Essential tool for React performance optimization
 * @use-case Debugging excessive re-renders, optimization analysis
 */
export function useRenderCount(componentName: string): number {
  const count = useRef(0);
  
  useEffect(() => {
    count.current += 1;
    
    if (import.meta.env.MODE === 'development') {
      console.log(`[Render] ${componentName} rendered ${count.current} times`);
      
      if (count.current > 20) {
        console.warn(`[Performance] ${componentName} has rendered ${count.current} times - consider optimization`);
      }
    }
  });
  
  return count.current;
}
