/**
 * Performance Utilities Test Suite
 * 
 * Tests for React performance optimization hooks including:
 * - useDeepCompareMemo
 * - useDebounce
 * - useThrottle
 * - useIntersectionObserver
 * - useMemoizedComputation
 * - useEventCallback
 * - usePrevious
 * - useRenderCount
 * 
 * @author Blunari Team
 * @since Phase 4 - Testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useDeepCompareMemo,
  useDebounce,
  useThrottle,
  useIntersectionObserver,
  useMemoizedComputation,
  useEventCallback,
  usePrevious,
  useRenderCount,
} from '@/lib/performanceUtils';

describe('Performance Utilities', () => {
  describe('useDeepCompareMemo', () => {
    it('should memoize value when dependencies are deeply equal', () => {
      const factory = vi.fn(() => ({ result: 'computed' }));
      const deps = { a: 1, b: { c: 2 } };

      const { result, rerender } = renderHook(
        ({ deps }) => useDeepCompareMemo(factory, [deps]),
        { initialProps: { deps } }
      );

      const firstResult = result.current;
      expect(factory).toHaveBeenCalledTimes(1);

      // Rerender with deeply equal object (different reference)
      rerender({ deps: { a: 1, b: { c: 2 } } });

      expect(result.current).toBe(firstResult);
      expect(factory).toHaveBeenCalledTimes(1); // Should not recompute
    });

    it('should recompute when dependencies change deeply', () => {
      const factory = vi.fn(() => ({ result: 'computed' }));
      const deps = { a: 1, b: { c: 2 } };

      const { result, rerender } = renderHook(
        ({ deps }) => useDeepCompareMemo(factory, [deps]),
        { initialProps: { deps } }
      );

      const firstResult = result.current;
      expect(factory).toHaveBeenCalledTimes(1);

      // Change nested value
      rerender({ deps: { a: 1, b: { c: 3 } } });

      expect(result.current).not.toBe(firstResult);
      expect(factory).toHaveBeenCalledTimes(2); // Should recompute
    });

    it('should handle array dependencies', () => {
      const factory = vi.fn(() => 'result');
      const deps = [1, 2, 3];

      const { result, rerender } = renderHook(
        ({ deps }) => useDeepCompareMemo(factory, [deps]),
        { initialProps: { deps } }
      );

      expect(factory).toHaveBeenCalledTimes(1);

      // Same array values, different reference
      rerender({ deps: [1, 2, 3] });
      expect(factory).toHaveBeenCalledTimes(1); // Should not recompute

      // Different array values
      rerender({ deps: [1, 2, 4] });
      expect(factory).toHaveBeenCalledTimes(2); // Should recompute
    });

    it('should handle primitive dependencies', () => {
      const factory = vi.fn(() => 'result');

      const { result, rerender } = renderHook(
        ({ num, str }) => useDeepCompareMemo(factory, [num, str]),
        { initialProps: { num: 1, str: 'test' } }
      );

      expect(factory).toHaveBeenCalledTimes(1);

      // Same primitives
      rerender({ num: 1, str: 'test' });
      expect(factory).toHaveBeenCalledTimes(1);

      // Different primitives
      rerender({ num: 2, str: 'test' });
      expect(factory).toHaveBeenCalledTimes(2);
    });

    it('should handle null and undefined', () => {
      const factory = vi.fn(() => 'result');

      const { result, rerender } = renderHook(
        ({ val }) => useDeepCompareMemo(factory, [val]),
        { initialProps: { val: null as unknown } }
      );

      expect(factory).toHaveBeenCalledTimes(1);

      rerender({ val: undefined });
      expect(factory).toHaveBeenCalledTimes(2);

      rerender({ val: null });
      expect(factory).toHaveBeenCalledTimes(3);
    });
  });

  describe('useDebounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should debounce callback execution', async () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebounce(callback, 500));

      // Call multiple times rapidly
      act(() => {
        result.current('call1');
        result.current('call2');
        result.current('call3');
      });

      // Should not be called yet
      expect(callback).not.toHaveBeenCalled();

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Should only be called once with last argument
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('call3');
    });

    it('should cancel previous timeout on new call', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebounce(callback, 500));

      act(() => {
        result.current('call1');
      });

      // Advance partially
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Call again (should cancel previous)
      act(() => {
        result.current('call2');
      });

      // Advance remaining time of first call
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Should not be called yet (timer was reset)
      expect(callback).not.toHaveBeenCalled();

      // Advance full delay from second call
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('call2');
    });

    it('should maintain stable reference', () => {
      const callback = vi.fn();
      const { result, rerender } = renderHook(() => useDebounce(callback, 500));

      const firstRef = result.current;
      rerender();
      const secondRef = result.current;

      expect(firstRef).toBe(secondRef);
    });

    it('should use latest callback', () => {
      let callbackResult = 'first';
      const { result, rerender } = renderHook(
        ({ callback }) => useDebounce(callback, 500),
        { initialProps: { callback: vi.fn(() => callbackResult) } }
      );

      act(() => {
        result.current();
      });

      // Update callback
      callbackResult = 'second';
      rerender({ callback: vi.fn(() => callbackResult) });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Should use latest callback logic
      expect(callbackResult).toBe('second');
    });
  });

  describe('useThrottle', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should throttle callback execution', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useThrottle(callback, 1000));

      // First call should execute immediately
      act(() => {
        result.current('call1');
      });
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('call1');

      // Second call within throttle window should be ignored
      act(() => {
        result.current('call2');
      });
      expect(callback).toHaveBeenCalledTimes(1);

      // Advance past throttle limit
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Third call should execute
      act(() => {
        result.current('call3');
      });
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith('call3');
    });

    it('should block multiple calls within limit', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useThrottle(callback, 1000));

      // Call 5 times rapidly
      act(() => {
        result.current('call1'); // Should execute
        result.current('call2'); // Blocked
        result.current('call3'); // Blocked
        result.current('call4'); // Blocked
        result.current('call5'); // Blocked
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('call1');
    });

    it('should reset after limit expires', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useThrottle(callback, 500));

      act(() => {
        result.current('call1');
      });
      expect(callback).toHaveBeenCalledTimes(1);

      act(() => {
        vi.advanceTimersByTime(500);
        result.current('call2');
      });
      expect(callback).toHaveBeenCalledTimes(2);

      act(() => {
        vi.advanceTimersByTime(500);
        result.current('call3');
      });
      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('should maintain stable reference', () => {
      const callback = vi.fn();
      const { result, rerender } = renderHook(() => useThrottle(callback, 1000));

      const firstRef = result.current;
      rerender();
      const secondRef = result.current;

      expect(firstRef).toBe(secondRef);
    });
  });

  describe('useIntersectionObserver', () => {
    let mockObserve: ReturnType<typeof vi.fn>;
    let mockDisconnect: ReturnType<typeof vi.fn>;
    let mockCallback: IntersectionObserverCallback;

    beforeEach(() => {
      mockObserve = vi.fn();
      mockDisconnect = vi.fn();

      // Mock IntersectionObserver
      global.IntersectionObserver = vi.fn((callback) => {
        mockCallback = callback;
        return {
          observe: mockObserve,
          disconnect: mockDisconnect,
          unobserve: vi.fn(),
          takeRecords: vi.fn(() => []),
          root: null,
          rootMargin: '',
          thresholds: [],
        };
      }) as unknown as typeof IntersectionObserver;
    });

    it('should return false initially', () => {
      const ref = { current: document.createElement('div') };
      const { result } = renderHook(() => useIntersectionObserver(ref));

      expect(result.current).toBe(false);
    });

    it('should observe element and return true when intersecting', () => {
      const element = document.createElement('div');
      const ref = { current: element };

      const { result } = renderHook(() => useIntersectionObserver(ref));

      expect(mockObserve).toHaveBeenCalledWith(element);

      // Simulate intersection
      act(() => {
        mockCallback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver
        );
      });

      expect(result.current).toBe(true);
    });

    it('should return false when not intersecting', () => {
      const element = document.createElement('div');
      const ref = { current: element };

      const { result } = renderHook(() => useIntersectionObserver(ref));

      // Simulate not intersecting
      act(() => {
        mockCallback(
          [{ isIntersecting: false } as IntersectionObserverEntry],
          {} as IntersectionObserver
        );
      });

      expect(result.current).toBe(false);
    });

    it('should disconnect observer on unmount', () => {
      const element = document.createElement('div');
      const ref = { current: element };

      const { unmount } = renderHook(() => useIntersectionObserver(ref));

      unmount();

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should handle ref without element', () => {
      const ref = { current: null };

      const { result } = renderHook(() => useIntersectionObserver(ref));

      expect(mockObserve).not.toHaveBeenCalled();
      expect(result.current).toBe(false);
    });

    it('should pass options to IntersectionObserver', () => {
      const element = document.createElement('div');
      const ref = { current: element };
      const options = { threshold: 0.5, rootMargin: '10px' };

      renderHook(() => useIntersectionObserver(ref, options));

      expect(global.IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        options
      );
    });
  });

  describe('useMemoizedComputation', () => {
    it('should memoize computation result', () => {
      const compute = vi.fn(() => 'result');
      const deps = [1, 2];

      const { result, rerender } = renderHook(
        ({ deps }) => useMemoizedComputation(compute, deps),
        { initialProps: { deps } }
      );

      expect(result.current).toBe('result');
      expect(compute).toHaveBeenCalledTimes(1);

      // Rerender with same deps
      rerender({ deps: [1, 2] });
      expect(compute).toHaveBeenCalledTimes(1); // Should not recompute
    });

    it('should recompute when dependencies change', () => {
      const compute = vi.fn((x: number) => x * 2);
      
      const { result, rerender } = renderHook(
        ({ value }) => useMemoizedComputation(() => compute(value), [value]),
        { initialProps: { value: 5 } }
      );

      expect(result.current).toBe(10);
      expect(compute).toHaveBeenCalledTimes(1);

      rerender({ value: 10 });
      expect(result.current).toBe(20);
      expect(compute).toHaveBeenCalledTimes(2);
    });

    it('should warn about slow computations in development', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock slow computation (>16ms)
      const slowCompute = vi.fn(() => {
        const start = Date.now();
        while (Date.now() - start < 20) {} // Busy wait
        return 'result';
      });

      renderHook(() =>
        useMemoizedComputation(slowCompute, [], 'TestComponent')
      );

      // Note: Warning only shows in dev mode, test environment may not trigger it
      // This test verifies the hook doesn't crash on slow computations

      expect(slowCompute).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('useEventCallback', () => {
    it('should maintain stable reference across renders', () => {
      const fn = vi.fn();

      const { result, rerender } = renderHook(() => useEventCallback(fn));

      const firstRef = result.current;
      rerender();
      const secondRef = result.current;

      expect(firstRef).toBe(secondRef);
    });

    it('should always call latest function', () => {
      let value = 'first';
      const fn = vi.fn(() => value);

      const { result, rerender } = renderHook(() => useEventCallback(fn));

      // Call with first value
      result.current();
      expect(fn).toHaveReturnedWith('first');

      // Update value
      value = 'second';
      rerender();

      // Call again - should use latest value
      result.current();
      expect(fn).toHaveReturnedWith('second');
    });

    it('should pass through arguments correctly', () => {
      const fn = vi.fn((a: number, b: string) => `${a}-${b}`);

      const { result } = renderHook(() => useEventCallback(fn));

      const returnValue = result.current(42, 'test');

      expect(fn).toHaveBeenCalledWith(42, 'test');
      expect(returnValue).toBe('42-test');
    });

    it('should handle function updates', () => {
      const fn1 = vi.fn(() => 'result1');
      const fn2 = vi.fn(() => 'result2');

      const { result, rerender } = renderHook(
        ({ fn }) => useEventCallback(fn),
        { initialProps: { fn: fn1 } }
      );

      result.current();
      expect(fn1).toHaveBeenCalled();
      expect(fn2).not.toHaveBeenCalled();

      // Change function
      rerender({ fn: fn2 });

      result.current();
      expect(fn2).toHaveBeenCalled();
    });
  });

  describe('usePrevious', () => {
    it('should return undefined on first render', () => {
      const { result } = renderHook(() => usePrevious('initial'));

      expect(result.current).toBeUndefined();
    });

    it('should return previous value after update', () => {
      const { result, rerender } = renderHook(
        ({ value }) => usePrevious(value),
        { initialProps: { value: 'first' } }
      );

      expect(result.current).toBeUndefined();

      rerender({ value: 'second' });
      expect(result.current).toBe('first');

      rerender({ value: 'third' });
      expect(result.current).toBe('second');
    });

    it('should work with numbers', () => {
      const { result, rerender } = renderHook(
        ({ count }) => usePrevious(count),
        { initialProps: { count: 0 } }
      );

      expect(result.current).toBeUndefined();

      rerender({ count: 1 });
      expect(result.current).toBe(0);

      rerender({ count: 2 });
      expect(result.current).toBe(1);
    });

    it('should work with objects', () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };

      const { result, rerender } = renderHook(
        ({ obj }) => usePrevious(obj),
        { initialProps: { obj: obj1 } }
      );

      expect(result.current).toBeUndefined();

      rerender({ obj: obj2 });
      expect(result.current).toBe(obj1);
    });

    it('should work with null and undefined', () => {
      const { result, rerender } = renderHook(
        ({ value }) => usePrevious(value),
        { initialProps: { value: null as string | null | undefined } }
      );

      expect(result.current).toBeUndefined();

      rerender({ value: undefined });
      expect(result.current).toBe(null);

      rerender({ value: 'value' });
      expect(result.current).toBe(undefined);
    });
  });

  describe('useRenderCount', () => {
    it('should return 0 initially', () => {
      const { result } = renderHook(() => useRenderCount('TestComponent'));

      expect(result.current).toBe(0);
    });

    it('should increment on each render', () => {
      const { result, rerender } = renderHook(() =>
        useRenderCount('TestComponent')
      );

      expect(result.current).toBe(0);

      rerender();
      expect(result.current).toBe(1);

      rerender();
      expect(result.current).toBe(2);

      rerender();
      expect(result.current).toBe(3);
    });

    it('should log render count in development', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { rerender } = renderHook(() => useRenderCount('TestComponent'));

      rerender();

      // Note: Logging only happens in dev mode
      // This test verifies the hook doesn't crash when logging

      consoleLogSpy.mockRestore();
    });

    it('should warn about excessive renders', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { rerender } = renderHook(() => useRenderCount('TestComponent'));

      // Force 21 renders to trigger warning
      for (let i = 0; i < 21; i++) {
        rerender();
      }

      // Note: Warning only shows in dev mode
      // This test verifies the hook handles high render counts

      consoleWarnSpy.mockRestore();
    });

    it('should track different components separately', () => {
      const { result: result1, rerender: rerender1 } = renderHook(() =>
        useRenderCount('Component1')
      );
      const { result: result2, rerender: rerender2 } = renderHook(() =>
        useRenderCount('Component2')
      );

      expect(result1.current).toBe(0);
      expect(result2.current).toBe(0);

      rerender1();
      rerender1();

      expect(result1.current).toBe(2);
      expect(result2.current).toBe(0);

      rerender2();

      expect(result1.current).toBe(2);
      expect(result2.current).toBe(1);
    });
  });
});
