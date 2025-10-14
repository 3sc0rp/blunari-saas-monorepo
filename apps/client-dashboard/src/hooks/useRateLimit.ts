/**
 * Rate Limiting Hook
 * Client-side rate limiting to prevent abuse
 */

import { useRef, useCallback } from 'react';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  storageKey?: string;
}

interface RateLimitResult {
  checkLimit: () => boolean;
  remaining: number;
  resetTime: number;
  isLimited: boolean;
}

interface RequestRecord {
  timestamp: number;
  count: number;
}

/**
 * Client-side rate limiter using sliding window algorithm
 * 
 * @example
 * const { checkLimit, remaining } = useRateLimit('booking-creation', {
 *   maxRequests: 3,
 *   windowMs: 60000 // 3 requests per minute
 * });
 * 
 * if (!checkLimit()) {
 *   toast.error(`Rate limit exceeded. ${remaining}s remaining.`);
 *   return;
 * }
 */
export function useRateLimit(
  action: string,
  config: RateLimitConfig
): RateLimitResult {
  const { maxRequests, windowMs, storageKey } = config;
  const key = storageKey || `ratelimit_${action}`;
  
  // Use ref to maintain state across renders without causing re-renders
  const requestsRef = useRef<number[]>([]);
  
  // Load from sessionStorage on first mount
  if (requestsRef.current.length === 0) {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored) {
        const data: number[] = JSON.parse(stored);
        // Filter out expired timestamps
        const now = Date.now();
        requestsRef.current = data.filter(ts => now - ts < windowMs);
      }
    } catch (error) {
      console.warn('[useRateLimit] Failed to load from storage:', error);
    }
  }

  /**
   * Check if request is allowed and record it if so
   */
  const checkLimit = useCallback((): boolean => {
    const now = Date.now();
    
    // Remove expired requests (sliding window)
    requestsRef.current = requestsRef.current.filter(
      timestamp => now - timestamp < windowMs
    );

    // Check if limit exceeded
    if (requestsRef.current.length >= maxRequests) {
      return false;
    }

    // Record this request
    requestsRef.current.push(now);
    
    // Persist to sessionStorage
    try {
      sessionStorage.setItem(key, JSON.stringify(requestsRef.current));
    } catch (error) {
      console.warn('[useRateLimit] Failed to save to storage:', error);
    }

    return true;
  }, [key, maxRequests, windowMs]);

  /**
   * Get current state
   */
  const getState = useCallback((): Omit<RateLimitResult, 'checkLimit'> => {
    const now = Date.now();
    
    // Clean expired
    requestsRef.current = requestsRef.current.filter(
      timestamp => now - timestamp < windowMs
    );

    const count = requestsRef.current.length;
    const remaining = maxRequests - count;
    const oldestRequest = requestsRef.current[0] || now;
    const resetTime = Math.max(0, Math.ceil((oldestRequest + windowMs - now) / 1000));
    const isLimited = count >= maxRequests;

    return { remaining, resetTime, isLimited };
  }, [maxRequests, windowMs]);

  const state = getState();

  return {
    checkLimit,
    ...state
  };
}

/**
 * Global rate limiter using localStorage (persists across tabs)
 */
export function useGlobalRateLimit(
  action: string,
  config: RateLimitConfig
): RateLimitResult {
  const { maxRequests, windowMs, storageKey } = config;
  const key = storageKey || `global_ratelimit_${action}`;

  const checkLimit = useCallback((): boolean => {
    const now = Date.now();
    
    try {
      // Get current state
      const stored = localStorage.getItem(key);
      let requests: number[] = [];
      
      if (stored) {
        const data = JSON.parse(stored);
        requests = data.filter((ts: number) => now - ts < windowMs);
      }

      // Check limit
      if (requests.length >= maxRequests) {
        return false;
      }

      // Record request
      requests.push(now);
      localStorage.setItem(key, JSON.stringify(requests));
      
      return true;
    } catch (error) {
      console.warn('[useGlobalRateLimit] Error:', error);
      // Fail open - allow request if storage fails
      return true;
    }
  }, [key, maxRequests, windowMs]);

  const getState = useCallback((): Omit<RateLimitResult, 'checkLimit'> => {
    const now = Date.now();
    
    try {
      const stored = localStorage.getItem(key);
      let requests: number[] = [];
      
      if (stored) {
        const data = JSON.parse(stored);
        requests = data.filter((ts: number) => now - ts < windowMs);
      }

      const count = requests.length;
      const remaining = maxRequests - count;
      const oldestRequest = requests[0] || now;
      const resetTime = Math.max(0, Math.ceil((oldestRequest + windowMs - now) / 1000));
      const isLimited = count >= maxRequests;

      return { remaining, resetTime, isLimited };
    } catch (error) {
      console.warn('[useGlobalRateLimit] Error:', error);
      return { remaining: maxRequests, resetTime: 0, isLimited: false };
    }
  }, [key, maxRequests, windowMs]);

  const state = getState();

  return {
    checkLimit,
    ...state
  };
}

/**
 * Hook to display rate limit status
 */
export function useRateLimitStatus(action: string, config: RateLimitConfig) {
  const { remaining, resetTime, isLimited } = useRateLimit(action, config);

  const getMessage = useCallback((): string => {
    if (isLimited) {
      return `Rate limit exceeded. Try again in ${resetTime} seconds.`;
    }
    
    if (remaining <= 1) {
      return `Warning: Only ${remaining} request remaining.`;
    }

    return `${remaining} requests remaining.`;
  }, [isLimited, remaining, resetTime]);

  return {
    remaining,
    resetTime,
    isLimited,
    message: getMessage()
  };
}

/**
 * Clear rate limit (for testing or manual reset)
 */
export function clearRateLimit(action: string, global: boolean = false): void {
  const key = global ? `global_ratelimit_${action}` : `ratelimit_${action}`;
  const storage = global ? localStorage : sessionStorage;
  
  try {
    storage.removeItem(key);
  } catch (error) {
    console.warn('[clearRateLimit] Failed to clear:', error);
  }
}

/**
 * Rate limit multiple actions with shared quota
 */
export function useSharedRateLimit(
  actions: string[],
  config: RateLimitConfig
): Record<string, RateLimitResult> {
  const sharedKey = `shared_${actions.sort().join('_')}`;
  const result = useRateLimit(sharedKey, config);
  
  // Return same result for all actions
  return Object.fromEntries(
    actions.map(action => [action, result])
  );
}
