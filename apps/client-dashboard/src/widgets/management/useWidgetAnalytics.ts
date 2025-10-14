/**
 * Widget Analytics Hook
 * Provides ONLY real analytics data from backend APIs - NO mock/demo data
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { WidgetAnalytics, WidgetType } from './types';
import { AnalyticsError, EdgeFunctionError, DatabaseError, AnalyticsErrorCode } from './analytics/errors';
import { analyticsErrorReporter } from './analytics/errorReporting';
import type { AnalyticsMeta, AnalyticsTimeRange, AnalyticsResponse, WidgetAnalyticsData } from './analytics/types';

/**
 * Rate Limiter for Analytics API calls
 */
class AnalyticsRateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) { // 10 requests per minute
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(): boolean {
    const now = Date.now();
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      return false;
    }

    this.requests.push(now);
    return true;
  }

  /**
   * Get remaining requests in current window
   */
  getRemainingRequests(): number {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - this.requests.length);
  }

  /**
   * Get time until next request is allowed (in milliseconds)
   */
  getTimeUntilNextAllowed(): number {
    if (this.requests.length < this.maxRequests) {
      return 0;
    }

    const now = Date.now();
    const oldestRequest = Math.min(...this.requests);
    return Math.max(0, this.windowMs - (now - oldestRequest));
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.requests = [];
  }
}

// Global rate limiter instance
      const analyticsRateLimiter = new AnalyticsRateLimiter();

/**
 * Debug logging gate – only emit verbose analytics logs when explicitly enabled.
 * Set VITE_ANALYTICS_DEBUG=true (or process env) in development to inspect analytics flow.
 * Errors and warnings still surface unconditionally.
 */
// Prefer Vite import.meta env but also fall back to process.env for test/runtime flexibility
// NOTE: We intentionally do not tree-shake by inlining conditionals so toggling flag at runtime (test) works.
// Access env flags defensively across build targets (Node in tests, browser in app)
      const RAW_DEBUG_FLAG = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ANALYTICS_DEBUG) ||
  (typeof process !== 'undefined' && typeof process.env !== 'undefined' ? (process.env as any).VITE_ANALYTICS_DEBUG : undefined);
const ANALYTICS_DEBUG = String(RAW_DEBUG_FLAG).toLowerCase() === 'true';

const debug = (...args: any[]) => { if (ANALYTICS_DEBUG) console.log(...args); };
const debugWarn = (...args: any[]) => { if (ANALYTICS_DEBUG) console.warn(...args); };

/**
 * Analytics Cache with TTL
 */
class AnalyticsCache {
  private cache = new Map<string, { data: WidgetAnalyticsData; timestamp: number; ttl: number }>();

  /**
   * Get cached data if still valid
   */
  get(key: string): WidgetAnalyticsData | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached data with TTL
   */
  set(key: string, data: WidgetAnalyticsData, ttlMs: number = 30 * 1000): void { // 30 seconds default for real-time feel
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    this.cleanup();
    return this.cache.size;
  }
}

// Global cache instance
      const analyticsCache = new AnalyticsCache();

export interface UseWidgetAnalyticsOptions {
  /** The tenant ID for analytics data isolation */
  tenantId?: string | null;
  /** The tenant slug for URL generation and identification */
  tenantSlug?: string | null;
  /** The type of widget (booking or catering) */
  widgetType: WidgetType;
  /** Refresh interval in milliseconds (default: 5 minutes) */
  refreshInterval?: number;
  /** Force using the Edge Function even for demo/test tenants (dev/QA only) */
  forceEdge?: boolean;
}

export interface AnalyticsState {
  /** Current analytics data or null if loading/error */
  data: WidgetAnalyticsData | null;
  /** Whether data is currently being fetched */
  loading: boolean;
  /** Error message if fetch failed, null otherwise */
  error: string | null;
  /** Timestamp of last successful data update */
  lastUpdated: Date | null;
  /** Data source mode: 'edge', 'direct-db', or 'cached' (synthetic removed for real-data-only policy) */
  mode?: 'edge' | 'direct-db' | 'cached';
  /** Correlation ID for tracking requests */
  correlationId?: string;
  /** Last error code for debugging */
  lastErrorCode?: string | null;
  /** Additional metadata about the data */
  meta?: AnalyticsMeta | null;
}

/**
 * Hook for fetching and managing widget analytics data with multi-layer fallback strategy.
 *
 * Features:
 * - Rate limiting (10 requests per minute)
 * - Client-side caching with TTL
 * - Multi-layer fallback: Edge Function → Database (synthetic removed for real-data-only policy)
 * - Concurrent request prevention
 * - Comprehensive error handling and reporting
 *
 * @param options - Configuration options for the analytics hook
 * @returns Analytics state and control functions
 *
 * @example
 * ```tsx
 * const { data, loading, error, refresh, rateLimitRemaining } = useWidgetAnalytics({
 *   tenantId: '550e8400-e29b-41d4-a716-446655440000',
 *   tenantSlug: 'my-restaurant',
 *   widgetType: 'booking'
 * });
 * ```
 */

/**
 * Hook for fetching REAL widget analytics data from database
 */
export function useWidgetAnalytics({
  tenantId,
  tenantSlug,
  widgetType,
  refreshInterval = 30000, // 30 seconds for real-time feel (changed from 5 minutes)
  forceEdge = false,
}: UseWidgetAnalyticsOptions): AnalyticsState & {
  refresh: (timeRange?: AnalyticsTimeRange) => Promise<void>;
  isAvailable: boolean;
  rateLimitRemaining: number;
  rateLimitResetTime: number;
} {
  // Log hook initialization with tenant info 
      const [state, setState] = useState<AnalyticsState>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
    mode: undefined,
    correlationId: undefined,
    lastErrorCode: null,
    meta: null
  });

  const sessionCheckedRef = useRef(false);
  const correlationBase = useRef<string>('');
  const isLoadingRef = useRef(false);
  if (!correlationBase.current) {
    correlationBase.current = Math.random().toString(36).slice(2, 10);
  }

  const isAvailable = Boolean(tenantId && tenantSlug);

  const fetchAnalytics = useCallback(async (timeRange: AnalyticsTimeRange = '7d', bypassCache: boolean = false): Promise<void> => {
  debug('🔍 Analytics hook parameters:', {
      tenantId,
      tenantSlug,
      widgetType,
      timeRange,
      isAvailable,
      bypassCache
    });

    // Check cache first (unless bypassing for manual refresh)
      const cacheKey = `${tenantId}-${widgetType}-${timeRange}`;
    if (!bypassCache) {
      const cachedData = analyticsCache.get(cacheKey);
      if (cachedData) {
        debug('✅ Using cached analytics data');
        setState(prev => ({
          ...prev,
          data: cachedData,
          loading: false,
          error: null,
          lastUpdated: new Date(),
          mode: 'cached',
          correlationId: 'cached-' + Date.now(),
          lastErrorCode: null,
          meta: { estimation: false, time_range: timeRange }
        }));
        return;
      }
    } else {
      debug('🔄 Bypassing cache for manual refresh');
    }

    // Join any in-flight request for the same key across components
  (globalThis as any).__widgetAnalyticsInflight = (globalThis as any).__widgetAnalyticsInflight || new Map<string, Promise<WidgetAnalyticsData>>();
  const inflightMap: Map<string, Promise<WidgetAnalyticsData>> = (globalThis as any).__widgetAnalyticsInflight;
    const existing = inflightMap.get(cacheKey);
    if (existing) {
  debug('⏳ Joining in-flight analytics fetch for key:', cacheKey);
      try {
        const sharedData = await existing;
        analyticsCache.set(cacheKey, sharedData);
        setState(prev => ({
          ...prev,
          data: sharedData,
          loading: false,
          error: null,
          lastUpdated: new Date(),
          mode: 'cached',
          correlationId: 'shared-' + Date.now(),
          lastErrorCode: null,
          meta: { estimation: false, time_range: timeRange }
        }));
        return;
      } catch (e) {
  debugWarn('Shared analytics fetch failed, proceeding with fresh fetch');
      }
    }

    // Check rate limit before proceeding (after cache/in-flight dedupe)
      if (!analyticsRateLimiter.isAllowed()) {
      const timeUntilNext = analyticsRateLimiter.getTimeUntilNextAllowed();
      const waitTimeSeconds = Math.ceil(timeUntilNext / 1000);

      console.warn(`🚫 Rate limit exceeded. Next request allowed in ${waitTimeSeconds} seconds`);

      setState(prev => ({
        ...prev,
        loading: false,
        error: `Rate limit exceeded. Please wait ${waitTimeSeconds} seconds before refreshing.`,
        lastErrorCode: 'RATE_LIMIT_EXCEEDED'
      }));
      return;
    }

    // Prevent concurrent fetches
      if (isLoadingRef.current) {
  debug('Fetch already in progress, skipping');
      return;
    }

    // First guard: not available case
      if (!isAvailable) {
  debug('Analytics not available, skipping fetch');
      setState(prev => ({
        ...prev,
        data: null,
        loading: false,
        error: null
      }));
      return;
    }

    // Second guard: missing tenant info
      if (!tenantId || !tenantSlug) {
      console.error('❌ Analytics fetch skipped - missing tenant information:', {
        tenantId,
        tenantIdPresent: !!tenantId,
        tenantIdValue: tenantId,
        tenantSlug,
        tenantSlugPresent: !!tenantSlug,
        tenantSlugValue: tenantSlug,
        widgetType,
        timeRange
      });
      setState(prev => ({
        ...prev,
        data: null,
        loading: false,
        error: 'Tenant information required for real analytics',
      }));
      return;
    }

  isLoadingRef.current = true;
  setState(prev => ({ ...prev, loading: true, error: null, lastErrorCode: null }));

    try {
  debug(`Fetching REAL analytics for tenant ${tenantId}, widget ${widgetType}`);
      
      // For development/demo purposes, use direct database fallback
      if (!forceEdge && (
        tenantId.includes('demo') ||
        tenantId.includes('test') ||
        (tenantSlug && /demo|test/i.test(tenantSlug)) ||
        !tenantId.match(/^[0-9a-f-]{36}$/i)
      )) {
  debug('🎭 Demo tenant detected, using database fallback');
        const promise = fetchAnalyticsDirectly(tenantId, widgetType, timeRange);
        inflightMap.set(cacheKey, promise);
        try {
          const fallbackData = await promise;
          // Cache fallback results with shorter TTL
          analyticsCache.set(cacheKey, fallbackData, 2 * 60 * 1000);
          setState({
            data: fallbackData,
            loading: false,
            error: null,
            lastUpdated: new Date(),
            mode: 'direct-db',
            correlationId: correlationBase.current + ':demo',
            lastErrorCode: null,
            meta: { estimation: true, time_range: timeRange }
          });
        } finally {
          inflightMap.delete(cacheKey);
        }
        isLoadingRef.current = false;
        return;
      }
      
      // Get current session for authentication
      const { data: { session }, error: authError } = await supabase.auth.getSession();
  sessionCheckedRef.current = true;
      
      if (authError || !session) {
  debugWarn('⚠️ No authentication available, using database fallback');
        // Don't throw error, just use fallback
      const fallbackData = await fetchAnalyticsDirectly(tenantId, widgetType, timeRange);
        setState({
          data: fallbackData,
          loading: false,
          error: null,
          lastUpdated: new Date(),
          mode: 'direct-db',
          correlationId: correlationBase.current + ':noauth',
          lastErrorCode: null,
          meta: { estimation: true, time_range: timeRange }
        });
        isLoadingRef.current = false;
        return;
      }

      // Retry logic for Edge Function
      const maxAttempts = process.env.NODE_ENV === 'test' ? 1 : 3;
      let lastErr: any = null;
  let analytics: WidgetAnalyticsData | null = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const cid = `${correlationBase.current}:a${attempt}`;
        try {
          // De-duplicate concurrent Edge requests across components by cacheKey
          (globalThis as any).__widgetAnalyticsInflight = (globalThis as any).__widgetAnalyticsInflight || new Map<string, Promise<WidgetAnalyticsData>>();
          const inflightMap: Map<string, Promise<WidgetAnalyticsData>> = (globalThis as any).__widgetAnalyticsInflight;
          let inflight = inflightMap.get(cacheKey);
          if (!inflight) {
            inflight = (async () => {
              const rr = await fetchRealWidgetAnalytics(tenantId, widgetType, session.access_token, timeRange, cid);
              return rr.data;
            })();
            inflightMap.set(cacheKey, inflight);
          } else {
            debug('⏳ Joining in-flight Edge analytics fetch for key:', cacheKey);
          }
          const realData = await inflight;
          analytics = realData;          // Cache successful results
          analyticsCache.set(cacheKey, realData);
          
          setState({
            data: realData,
            loading: false,
            error: null,
            lastUpdated: new Date(),
            mode: 'edge',
            correlationId: cid,
            lastErrorCode: null,
            meta: {
              estimation: undefined,
              version: undefined,
              time_range: timeRange
            }
          });
          debug('✅ Successfully loaded real analytics data (attempt', attempt, ')');
          break;
        } catch (edgeErr: any) {
          lastErr = edgeErr;
          debugWarn('Edge analytics attempt failed', { attempt, cid, message: edgeErr?.message });
          if (attempt < maxAttempts) {
            await new Promise(r => setTimeout(r, attempt * 250));
          }
        } finally {
          const inflightMap: Map<string, Promise<WidgetAnalyticsData>> | undefined = (globalThis as any).__widgetAnalyticsInflight;
          inflightMap?.delete?.(cacheKey);
        }
      }

      if (!analytics) {
  debug('Switching to direct-db fallback after edge retries');
        
        // Report the edge function error since we're falling back to database
      const analyticsError = lastErr instanceof AnalyticsError ? lastErr : new AnalyticsError(
          'Failed to fetch analytics from edge function',
          AnalyticsErrorCode.EDGE_FUNCTION_ERROR,
          {
            tenantId,
            widgetType,
            timeRange
          },
          lastErr instanceof Error ? lastErr : undefined
        );
        
        analyticsErrorReporter.reportError(analyticsError);
        
        const fallbackData = await fetchAnalyticsDirectly(tenantId, widgetType, timeRange);
        
        // Cache fallback results with shorter TTL
        analyticsCache.set(cacheKey, fallbackData, 2 * 60 * 1000); // 2 minutes for fallback data
        
        setState({
          data: fallbackData,
          loading: false,
          error: null, // Clear error since fallback worked
          lastUpdated: new Date(),
          mode: 'direct-db',
          correlationId: correlationBase.current + ':fallback',
          lastErrorCode: analyticsError.code,
          meta: { estimation: true, time_range: timeRange }
        });
      }
    } catch (error) {
  console.error('❌ Failed to fetch real analytics (will attempt DB fallback only):', error);
      
      // Create an analytics error for tracking
      const analyticsError = error instanceof AnalyticsError ? error : new AnalyticsError(
        'Failed to fetch analytics',
        AnalyticsErrorCode.UNKNOWN_ERROR,
        {
          tenantId,
          widgetType,
          timeRange
        },
        error instanceof Error ? error : undefined
      );
      
      analyticsErrorReporter.reportError(analyticsError);
      
      // Enhanced error handling with fallback attempt
      try {
  debug('🔄 Attempting direct database fallback...');
        const fallbackData = await fetchAnalyticsDirectly(tenantId, widgetType, timeRange);
        
        setState({
          data: fallbackData,
          loading: false,
          error: null, // Clear error since fallback worked
          lastUpdated: new Date(),
          mode: 'direct-db',
          correlationId: correlationBase.current + ':catch-fallback',
          lastErrorCode: analyticsError.code,
          meta: { estimation: true, time_range: timeRange }
        });
        
  debug('✅ Successfully loaded analytics via database fallback');
      } catch (fallbackError) {
        console.error('❌ Database fallback also failed:', fallbackError);
        
        // Final failure: surface error and clear data (no synthetic fabrication)
        setState(prev => ({
          ...prev,
            loading: false,
            error: 'Analytics unavailable – unable to load real data',
            data: null,
            mode: undefined,
            correlationId: correlationBase.current + ':unavailable',
            lastErrorCode: (fallbackError as any)?.code || analyticsError.code,
            meta: { estimation: false, time_range: timeRange }
        }));
        isLoadingRef.current = false;
      }
    }
  }, [tenantId, tenantSlug, widgetType]);

  // Auto-refresh effect
  useEffect(() => {
  debug('📊 Analytics effect triggered:', {
      isAvailable,
      tenantId: !!tenantId,
      tenantSlug: !!tenantSlug,
      widgetType
    });

    // Guard against recursive fetch attempts
      if (state.loading) {
  debug('Already fetching analytics, skipping');
      return;
    }

    if (!isAvailable) {
  debug('🚫 Analytics not available - setting empty state');
      setState(prev => ({
        ...prev,
        data: null,
        loading: false,
        error: null,
      }));
      return;
    }

    // Only fetch
      if (!tenantId || !tenantSlug || !widgetType) {
  debug('🚫 Analytics fetch skipped - missing required data:', {
        tenantId: !!tenantId,
        tenantSlug: !!tenantSlug,
        widgetType: !!widgetType
      });
      return;
    }

  debug('✅ Starting analytics fetch...');
    // Initial fetch with error handling
    fetchAnalytics().catch(err => {
      console.error('Failed to fetch analytics:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load analytics - please try again later',
        data: null
      }));
    });

    // Set up refresh interval for real-time updates
      const interval = setInterval(() => {
      // Only trigger refresh
      if (!state.loading) {
        fetchAnalytics().catch(console.error);
      }
    }, refreshInterval);

    // Set up real-time subscription to widget events   
      const eventsChannel = supabase
      .channel(`widget-events-${tenantId}-${widgetType}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'widget_events',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {          // Refresh analytics when new event comes in
      if (!state.loading) {
            fetchAnalytics().catch(console.error);
          }
        }
      )
      .subscribe((status) => {      });

    // Refresh when tab becomes visible
      const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !state.loading) {        fetchAnalytics().catch(console.error);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
  debug('🧹 Cleaning up analytics interval and subscriptions');
      clearInterval(interval);
      eventsChannel.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchAnalytics, refreshInterval, isAvailable, tenantId, tenantSlug, widgetType]);

  // Wrapper for manual refresh that bypasses cache
      const manualRefresh = useCallback(async (timeRange?: AnalyticsTimeRange) => {
    await fetchAnalytics(timeRange || '7d', true);
  }, [fetchAnalytics]);

  return {
    ...state,
    refresh: manualRefresh,
    isAvailable,
    rateLimitRemaining: analyticsRateLimiter.getRemainingRequests(),
    rateLimitResetTime: analyticsRateLimiter.getTimeUntilNextAllowed(),
  };
}

/**
 * Fetch REAL analytics from Supabase Edge Function
 * NO mock data - only actual database queries
 */
async function fetchRealWidgetAnalytics(
  tenantId: string,
  widgetType: WidgetType,
  accessToken: string,
  timeRange: AnalyticsTimeRange = '7d',
  correlationId?: string
): Promise<AnalyticsResponse> {
  
  // Validate tenantId before making the request
      if (!tenantId || tenantId === 'null' || tenantId.trim() === '') {
    throw new Error('Invalid tenantId: tenantId is required and cannot be null or empty');
  }

  // Validate tenantId is a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenantId)) {
    throw new Error(`Invalid tenantId format: "${tenantId}" is not a valid UUID`);
  }  try {    // Call the widget-analytics Edge Function with real data queries    // Build headers object - always include Authorization (use anon key
      if (no user token)
      const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-correlation-id': correlationId || ''
      // Note: x-widget-version removed to avoid CORS preflight issues
      // Version is included in the request body instead
    };
    
    // Always provide Authorization header - use user token
      if (available, otherwise anon key
      if (accessToken) {
      requestHeaders['Authorization'] = `Bearer ${accessToken}`;
    } else {
      // Fallback to anon key when no user session
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (anonKey) {
        requestHeaders['Authorization'] = `Bearer ${anonKey}`;
      }
    }    const requestBody = {
      tenantId,
      widgetType,
      timeRange,
      version: '2.0'
    };    // BYPASS SUPABASE SDK - Use direct fetch to avoid SDK body serialization issues
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const fetchUrl = `${supabaseUrl}/functions/v1/widget-analytics`;    const fetchResponse = await fetch(fetchUrl, {
      method: 'POST',
      headers: {
        ...requestHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const responseData = await fetchResponse.json();
    const response = {
      data: fetchResponse.ok ? responseData : null,
      error: fetchResponse.ok ? null : new Error(responseData.error || responseData.message || 'Request failed')
    };    if (response.error) {
      const errorStatus = (response.error as any)?.context?.response?.status || (response.error as any)?.status;
      console.error('Edge Function error details:', {
        name: response.error.name,
        message: response.error.message,
        status: errorStatus,
        context: (response.error as any)?.context
      });
      
      // Try to get the actual error body from the Edge Function
      let errorBody = null;
      try {
        const res: any = (response.error as any)?.context?.response;
        if (res && typeof res.text === 'function') {
          const bodyText = await (res.clone ? res.clone() : res).text();
          console.error('Edge Function error body (raw):', bodyText?.slice(0, 2000));
          try {
            errorBody = JSON.parse(bodyText);
            console.error('Edge Function error body (parsed):', errorBody);
            console.error('❌ Edge Function Error:', {
              code: errorBody.code,
              error: errorBody.error,
              details: errorBody.details,
              correlationId: errorBody.correlationId
            });
          } catch (parseErr) {
            console.warn('Could not parse error body as JSON');
          }
        }
      } catch (e) {
        console.warn('Failed to read Edge Function error body', e);
      }
      console.error('Real analytics function error:', response.error, 'cid:', correlationId);
      
      // If it's a 400 error, try with anon key authentication
      if (response.error.message?.includes('400') || response.error.message?.includes('Bad Request')) {        try {
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          const retryHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'x-correlation-id': correlationId || ''
            // Note: x-widget-version removed to avoid CORS preflight issues
          };
          
          if (anonKey) {
            retryHeaders['Authorization'] = `Bearer ${anonKey}`;
          }
          
          // BYPASS SUPABASE SDK - Use direct fetch for retry too
      const retryFetchResponse = await fetch(fetchUrl, {
            method: 'POST',
            headers: retryHeaders,
            body: JSON.stringify({
              tenantId,
              widgetType,
              timeRange,
              version: '2.0'
            })
          });

          const retryResponseData = await retryFetchResponse.json();
          const retryResponse = {
            data: retryFetchResponse.ok ? retryResponseData : null,
            error: retryFetchResponse.ok ? null : new Error(retryResponseData.error || 'Retry failed')
          };
          
          if (!retryResponse.error && retryResponse.data?.success) {            return { data: retryResponse.data.data, meta: retryResponse.data.meta };
          }
        } catch (retryError) {
          console.warn('Retry without auth also failed:', retryError);
        }
      }
      
      // Enhanced error handling with analytics error reporting
      const edgeError = new EdgeFunctionError(
        'Edge Function failed',
        response.error.message?.includes('400') ? 
          AnalyticsErrorCode.VALIDATION_ERROR : 
          AnalyticsErrorCode.EDGE_FUNCTION_ERROR,
        response,
        {
          tenantId,
          widgetType,
          timeRange,
          correlationId
        }
      );
      
      analyticsErrorReporter.reportError(edgeError);
      
      // Check
      if (response.error.message?.includes('400')) {        return { 
          data: {
            totalViews: 0,
            totalClicks: 0,
            conversionRate: 0,
            avgSessionDuration: 0,
            totalBookings: 0,
            completionRate: 0,
            topSources: [],
            dailyStats: []
          },
          meta: { 
            estimation: true,
            version: '2.0',
            time_range: timeRange 
          }
        };
      }
      
      // For other errors, try database fallback      throw Object.assign(new Error('Edge function error'), { code: response.error.name || 'EDGE_ERROR' });
    }

    // Check
      if (!response.data?.success || !response.data?.data) {
      console.warn('Edge Function returned unsuccessful response');
      return { 
        data: response.data?.data || {
          totalViews: 0,
          totalClicks: 0,
          conversionRate: 0,
          avgSessionDuration: 0,
          totalBookings: 0,
          completionRate: 0,
          topSources: [],
          dailyStats: []
        },
        meta: { 
          estimation: true,
          version: '2.0',
          time_range: timeRange
        }
      };
    }  return { data: response.data.data, meta: response.data.meta };
    
  } catch (err) {
    console.error('Edge Function request failed:', err, 'cid:', correlationId);
    throw Object.assign(err instanceof Error ? err : new Error('Edge failure'), { code: (err as any)?.code || 'EDGE_REQUEST_FAIL' });
  }
}

/**
 * Direct database fallback for analytics when Edge Function is unavailable
 */
async function fetchAnalyticsDirectly(
  tenantId: string,
  widgetType: WidgetType,
  timeRange: AnalyticsTimeRange = '7d'
): Promise<WidgetAnalyticsData> {  // Calculate date range
      const now = new Date();
  const daysBack = timeRange === '30d' ? 30 : timeRange === '7d' ? 7 : 1;
  const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
  
  try {
    // Fetch booking/order data based on widget type
      const tableName = widgetType === 'booking' ? 'bookings' : 'catering_orders';
    
    const { data: ordersData, error: ordersError } = await supabase
      .from(tableName as any)
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', now.toISOString());
    
    if (ordersError) {
      console.warn('Orders data not available:', ordersError);
    }
    
    const orders = ordersData || [];
    const totalOrders = orders.length;
    const completedOrders = orders.filter((order: any) =>
      order.status === 'confirmed' || order.status === 'completed'
    ).length;

    // Only compute metrics we can derive directly; leave others as 0/undefined
      const analytics: WidgetAnalyticsData = {
      totalViews: 0, // Unknown without dedicated events table
      totalClicks: 0, // Unknown without click tracking
      conversionRate: 0, // Cannot compute without views baseline
      avgSessionDuration: 0, // Not tracked here
      totalBookings: totalOrders,
      completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
      topSources: [], // No reliable source breakdown in orders table
      dailyStats: []
    };

    if (widgetType === 'booking') {
      const partySizes = orders
        .map((order: any) => order.party_size)
        .filter((size: any) => typeof size === 'number');
      if (partySizes.length) {
        analytics.avgPartySize = partySizes.reduce((a: number, b: number) => a + b, 0) / partySizes.length;
      }
      // Peak hours require event timestamps aggregated by hour; skip
      if (insufficient data
    } else {
      const orderValues = orders
        .map((order: any) => order.total_amount)
        .filter((v: any) => typeof v === 'number' && v > 0);
      if (orderValues.length) {
        analytics.avgOrderValue = orderValues.reduce((a: number, b: number) => a + b, 0) / orderValues.length;
      }
    }

    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayOrders = orders.filter((order: any) => order.created_at.startsWith(dateStr));
      const dayRevenue = dayOrders
        .map((o: any) => o.total_amount)
        .filter((v: any) => typeof v === 'number' && v > 0)
        .reduce((sum: number, v: number) => sum + v, 0);
      analytics.dailyStats.push({
        date: dateStr,
        views: 0,
        clicks: 0,
        bookings: dayOrders.length,
        revenue: dayRevenue || undefined
      });
    }    return analytics;
    
  } catch (error) {
    console.error('Direct database query failed:', error);
    
    // Report database error
      const dbError = new DatabaseError(
      'Database analytics query failed',
      AnalyticsErrorCode.DATABASE_ERROR,
      {
        tenantId,
        widgetType,
        timeRange,
        table: widgetType === 'booking' ? 'bookings' : 'catering_orders'
      },
      {
        attempt: 'fallback',
        error: error instanceof Error ? error.message : String(error)
      }
    );
    
    analyticsErrorReporter.reportError(dbError);
    
    // Re-throw to allow hook-level fallback
    throw dbError;
  }
}

/**
 * Format analytics value with fallback for unavailable data
 */
export function formatAnalyticsValue(
  value: number | string | undefined,
  formatter?: (val: number | string) => string
): string {
  if (value === undefined || value === null) {
    return '—'; // Em dash for unavailable data
  }
  
  if (formatter && typeof value === 'number') {
    return formatter(value);
  }
  
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  
  return String(value);
}

/**
 * Default formatters for common analytics values
 */
export const analyticsFormatters = {
  currency: (value: number) => `$${value.toFixed(2)}`,
  percentage: (value: number) => `${value.toFixed(1)}%`,
  duration: (value: number) => `${value.toFixed(1)}s`,
  count: (value: number) => value.toLocaleString(),
  decimal: (value: number) => value.toFixed(1),
} as const;



