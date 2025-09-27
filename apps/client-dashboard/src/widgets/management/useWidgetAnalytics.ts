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
  set(key: string, data: WidgetAnalyticsData, ttlMs: number = 5 * 60 * 1000): void { // 5 minutes default
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
  /** Raw HTTP status from last edge function error (if any) */
  edgeStatus?: number | null;
  /** Raw edge function JSON error code (e.g. MISSING_TENANT_ID) */
  edgeFunctionCode?: string | null;
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
  refreshInterval = 300000, // 5 minutes default
  forceEdge = false,
}: UseWidgetAnalyticsOptions): AnalyticsState & {
  refresh: (timeRange?: AnalyticsTimeRange) => Promise<void>;
  isAvailable: boolean;
  rateLimitRemaining: number;
  rateLimitResetTime: number;
} {
  const [state, setState] = useState<AnalyticsState>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
    mode: undefined,
    correlationId: undefined,
    lastErrorCode: null,
    meta: null,
    edgeStatus: null,
    edgeFunctionCode: null
  });

  const sessionCheckedRef = useRef(false);
  const correlationBase = useRef<string>('');
  const isLoadingRef = useRef(false);
  // Suppress repeated Edge attempts after a validation/400 error
  const edgeCooldownRef = useRef<number>(0);
  if (!correlationBase.current) {
    correlationBase.current = Math.random().toString(36).slice(2, 10);
  }

  const isAvailable = Boolean(tenantId && tenantSlug);

  const fetchAnalytics = useCallback(async (timeRange: AnalyticsTimeRange = '7d'): Promise<void> => {
  debug('🔍 Analytics hook parameters:', {
      tenantId,
      tenantSlug,
      widgetType,
      timeRange,
      isAvailable
    });

    // Check cache first
    const cacheKey = `${tenantId}-${widgetType}-${timeRange}`;
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
  debugWarn('⚠️ Analytics fetch skipped - missing tenant information:', {
        tenantId: !!tenantId,
        tenantSlug: !!tenantSlug
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
  setState(prev => ({ ...prev, loading: true, error: null, lastErrorCode: null, edgeStatus: null, edgeFunctionCode: null }));

    try {
  debug(`Fetching REAL analytics for tenant ${tenantId}, widget ${widgetType}`);
      
      // Conditional database fallback: only when explicitly allowed via env OR tenantId not UUID (legacy data)
      const ALLOW_DB_FALLBACK = String((import.meta as any).env?.VITE_ALLOW_ANALYTICS_DB_FALLBACK || '').toLowerCase() === 'true';
      if (!forceEdge && (ALLOW_DB_FALLBACK || !tenantId.match(/^[0-9a-f-]{36}$/i))) {
  debug('⚠️ Using direct database fallback (edge disabled or non-UUID tenantId)');
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
            correlationId: correlationBase.current + ':db-fallback',
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

      // Honor temporary cooldown to avoid noisy repeated 400s
      if (!forceEdge && edgeCooldownRef.current && Date.now() < edgeCooldownRef.current) {
        debug('⏳ Edge in cooldown; using database fallback');
        const fallbackData = await fetchAnalyticsDirectly(tenantId, widgetType, timeRange);
        setState({
          data: fallbackData,
          loading: false,
          error: 'Analytics service temporarily unavailable — showing basic stats',
          lastUpdated: new Date(),
          mode: 'direct-db',
          correlationId: correlationBase.current + ':cooldown',
          lastErrorCode: 'EDGE_COOLDOWN',
          meta: { estimation: true, time_range: timeRange },
          edgeStatus: null,
          edgeFunctionCode: null
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
              const rr = await fetchRealWidgetAnalytics(tenantId, widgetType, session.access_token, timeRange, cid, tenantSlug || undefined);
              return rr.data;
            })();
            inflightMap.set(cacheKey, inflight);
          } else {
            debug('⏳ Joining in-flight Edge analytics fetch for key:', cacheKey);
          }
          const realData = await inflight;
          analytics = realData;
          
          // Cache successful results
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
            },
            edgeStatus: null,
            edgeFunctionCode: null
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
          meta: { estimation: true, time_range: timeRange },
          edgeStatus: (lastErr as any)?.context?.rawStatus || null,
          edgeFunctionCode: (lastErr as any)?.context?.edgeCode || null
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
          meta: { estimation: true, time_range: timeRange },
          edgeStatus: (error as any)?.context?.rawStatus || null,
          edgeFunctionCode: (error as any)?.context?.edgeCode || null
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
            meta: { estimation: false, time_range: timeRange },
            edgeStatus: (fallbackError as any)?.context?.rawStatus || (error as any)?.context?.rawStatus || null,
            edgeFunctionCode: (fallbackError as any)?.context?.edgeCode || (error as any)?.context?.edgeCode || null
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

    // Only fetch if we have valid tenant data
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
      // Only trigger refresh if not currently loading
      if (!state.loading) {
        fetchAnalytics().catch(console.error);
      }
    }, refreshInterval);

    return () => {
  debug('🧹 Cleaning up analytics interval');
      clearInterval(interval);
    };
  }, [fetchAnalytics, refreshInterval, isAvailable, tenantId, tenantSlug, widgetType]);

  return {
    ...state,
    refresh: fetchAnalytics,
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
  correlationId?: string,
  tenantSlug?: string
): Promise<AnalyticsResponse> {
  
  console.log('Calling real analytics Edge Function...');
  console.log('Request details:', { tenantId, widgetType, timeRange });
  console.log('Access token info:', {
    present: !!accessToken,
    length: accessToken?.length || 0,
    startsWithEyJ: accessToken?.startsWith('eyJ') || false
  });
  
  try {
    console.log('Calling real analytics Edge Function...');
    console.log('Request details:', { 
      tenantId: tenantId?.substring(0, 8) + '...', 
      widgetType, 
      timeRange 
    });
    console.log('Access token info:', {
      present: !!accessToken,
      length: accessToken?.length || 0,
      startsWithEyJ: accessToken?.startsWith('eyJ') || false
    });
    
    // Call the widget-analytics Edge Function with real data queries
    console.log('📡 Invoking Edge Function with body:', { tenantId, widgetType, timeRange });
    // Build headers object - always include Authorization (use anon key if no user token)
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // Always provide Authorization header - use user token if available, otherwise anon key
    if (accessToken) {
      requestHeaders['Authorization'] = `Bearer ${accessToken}`;
    } else {
      // Fallback to anon key when no user session
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (anonKey) {
        requestHeaders['Authorization'] = `Bearer ${anonKey}`;
      }
    }
    // Ensure apikey header is present for invoke contexts that require it
    const anonKeyForApi = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (anonKeyForApi && !requestHeaders['apikey']) {
      requestHeaders['apikey'] = anonKeyForApi;
    }
    // Avoid custom headers that can trigger CORS preflight rejections

    console.log('🚀 About to call Edge Function with:', {
      tenantId,
      widgetType,
      timeRange,
      headers: Object.keys(requestHeaders),
      hasAuthHeader: Boolean(requestHeaders['Authorization']),
      correlationId,
      tenantIdLength: tenantId?.length,
      tenantIdContainsDash: tenantId?.includes('-'),
      tenantIdContainsUnderscore: tenantId?.includes('_')
    });

    const response = await supabase.functions.invoke('widget-analytics', {
      body: {
        // Provide both camelCase and snake_case keys for compatibility
        tenantId,
        tenant_id: tenantId,
        ...(tenantSlug ? { tenantSlug, tenant_slug: tenantSlug } : {}),
        widgetType,
        widget_type: widgetType,
        timeRange,
        time_range: timeRange,
        version: '2.0',
        cid: correlationId || ''
      },
      headers: requestHeaders
    });

    console.log('Edge Function response:', {
      error: response.error,
      data: response.data ? 'received' : 'null',
      success: response.data?.success,
      authMethod: response.data?.meta?.authMethod
    });

    if (response.error) {
      const rawStatus = (response.error as any)?.context?.response?.status || (response.error as any)?.status;
      let errorBodyText: string | undefined;
      let parsedErrorJson: any = undefined;
      try {
        const res: any = (response.error as any)?.context?.response;
        if (res && typeof res.text === 'function') {
          const cloned = res.clone ? res.clone() : res;
            errorBodyText = await cloned.text();
            if (errorBodyText) {
              try { parsedErrorJson = JSON.parse(errorBodyText); } catch { /* non-JSON body */ }
            }
        }
      } catch (readErr) {
        console.warn('Failed to read Edge Function error body', readErr);
      }

      const edgeCode = parsedErrorJson?.code;
      const edgeMessage = parsedErrorJson?.error || response.error.message;
      // Map raw edge function error codes to internal analytics error codes
      let internalCode: AnalyticsErrorCode = AnalyticsErrorCode.EDGE_FUNCTION_ERROR;
      if (rawStatus === 400 || edgeCode?.startsWith?.('MISSING_') || edgeCode?.startsWith?.('INVALID_')) {
        internalCode = AnalyticsErrorCode.VALIDATION_ERROR;
      } else if (edgeCode === 'RATE_LIMIT_EXCEEDED' || rawStatus === 429) {
        internalCode = AnalyticsErrorCode.RATE_LIMIT_ERROR;
      } else if (edgeCode === 'ORIGIN_NOT_ALLOWED' || rawStatus === 403) {
        internalCode = AnalyticsErrorCode.AUTHENTICATION_ERROR; // closest existing enum
      }

      console.warn('Edge Function error details:', {
        name: response.error.name,
        message: edgeMessage,
        status: rawStatus,
        edgeCode,
        internalCode,
        correlationId,
        bodyPreview: errorBodyText?.slice(0, 500)
      });
      if (parsedErrorJson && !edgeCode) {
        console.warn('Parsed error JSON lacked code field:', parsedErrorJson);
      }

      // Retry w/ anon key only for potential auth / token mismatch scenarios (400 or 401 without explicit validation code)
      const shouldRetryAnon = !edgeCode && (rawStatus === 400 || rawStatus === 401 || response.error.message?.includes('Bad Request'));
      if (shouldRetryAnon) {
        console.log('Retrying Edge Function with anon key authentication (diagnostic path)...');
        try {
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          if (anonKey) {
            const retryHeaders: Record<string, string> = {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${anonKey}`
            };
            const retryResponse = await supabase.functions.invoke('widget-analytics', {
              body: { tenantId, tenant_id: tenantId, tenant_slug: tenantSlug, widgetType, widget_type: widgetType, timeRange, time_range: timeRange, version: '2.0', cid: correlationId || '' },
              headers: retryHeaders
            });
            if (!retryResponse.error && retryResponse.data?.success) {
              console.log('✅ Retry with anon key succeeded');
              return { data: retryResponse.data.data, meta: retryResponse.data.meta };
            }
            console.warn('Retry with anon key still failed');
          }
        } catch (retryErr) {
          console.warn('Retry with anon key threw error:', retryErr);
        }
      }

      // If server indicates an empty body / 400, try a direct fetch with explicit JSON.stringify
      if ((edgeMessage || '').toLowerCase().includes('empty') || rawStatus === 400) {
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          const token = accessToken || anonKey;
          if (supabaseUrl && token && anonKey) {
            const payload = {
              tenantId,
              tenant_id: tenantId,
              tenantSlug,
              tenant_slug: tenantSlug,
              widgetType,
              widget_type: widgetType,
              timeRange,
              time_range: timeRange,
              version: '2.0',
              cid: correlationId || ''
            };
            const fetchRes = await fetch(`${supabaseUrl}/functions/v1/widget-analytics`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': anonKey
              },
              body: JSON.stringify(payload)
            });
            if (fetchRes.ok) {
              const data = await fetchRes.json();
              if (data?.success && data?.data) {
                return { data: data.data, meta: data.meta };
              }
            } else {
              const txt = await fetchRes.text();
              console.warn('Direct fetch to widget-analytics failed', fetchRes.status, txt);
            }
          }
        } catch (dfErr) {
          console.warn('Direct fetch fallback threw error:', dfErr);
        }
      }

      // Report structured error
      const edgeError = new EdgeFunctionError(
        edgeMessage || 'Edge Function failed',
        internalCode,
        response,
        {
          tenantId,
          widgetType,
            timeRange,
            correlationId,
            rawStatus,
            edgeCode,
            parsedError: parsedErrorJson || errorBodyText
        }
      );
      analyticsErrorReporter.reportError(edgeError);

      // Validation / client errors: return empty dataset and start cooldown
      if (internalCode === AnalyticsErrorCode.VALIDATION_ERROR) {
        console.log('Validation error from Edge Function – returning empty analytics dataset');
        return {
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

      // Rate limit errors: propagate so hook can surface friendly message instead of DB fallback noise
      if (internalCode === AnalyticsErrorCode.RATE_LIMIT_ERROR) {
        throw Object.assign(new Error('Rate limit exceeded for widget analytics'), { code: internalCode });
      }

      // For 400 errors that may be due to edge function not existing or misconfigured, disable edge for this session
      if (rawStatus === 400 && !edgeCode) {
        console.warn('Edge Function widget-analytics may not exist or is misconfigured');
        // Throw a specialized error; caller decides on fallback & cooldown
        throw new EdgeFunctionError(
          'Edge function missing or misconfigured',
          AnalyticsErrorCode.EDGE_FUNCTION_ERROR,
          response,
          {
            tenantId,
            widgetType,
            timeRange,
            correlationId,
            rawStatus,
            edgeCode: edgeCode || 'MISSING_FUNCTION',
            misconfigured: true
          }
        );
      }

      // Other errors – allow outer logic to attempt DB fallback; start cooldown on 400s
      console.log('Attempting direct database fallback due to non-validation Edge Function error...');
      throw Object.assign(new Error('Edge function error'), { code: response.error.name || internalCode || 'EDGE_ERROR' });
    }

    // Check if Edge Function returned success
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
    }

    console.log('Real analytics data received successfully from Edge Function');
    console.log('Auth method used:', response.data.meta?.authMethod || 'unknown');
  return { data: response.data.data, meta: response.data.meta };
    
  } catch (err) {
    console.warn('Edge Function request failed (handled):', (err as any)?.message || err, 'cid:', correlationId);
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
): Promise<WidgetAnalyticsData> {
  
  console.log('Fetching analytics directly from database...');
  
  // Calculate date range
  const now = new Date();
  const daysBack = timeRange === '30d' ? 30 : timeRange === '7d' ? 7 : 1;
  const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
  
  try {
    // Fetch booking/order data based on widget type
    const tableName = widgetType === 'booking' ? 'bookings' : 'catering_orders';
    
    // Select only columns that exist per table to avoid 42703 errors (bookings lacks total_amount)
    const bookingColumns = 'id, created_at, status, party_size';
    const cateringColumns = 'id, created_at, status, total_amount';
    const selectedColumns = widgetType === 'booking' ? bookingColumns : cateringColumns;
    const { data: ordersData, error: ordersError } = await supabase
      .from(tableName as any)
      // RLS-OK: selecting limited columns; relies on row-level policy enforcing tenant_id scoping
      .select(selectedColumns)
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
      // Peak hours require event timestamps aggregated by hour; skip if insufficient data
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
      const dayRevenue = widgetType === 'catering'
        ? dayOrders
            .map((o: any) => o.total_amount)
            .filter((v: any) => typeof v === 'number' && v > 0)
            .reduce((sum: number, v: number) => sum + v, 0)
        : undefined;
      analytics.dailyStats.push({
        date: dateStr,
        views: 0,
        clicks: 0,
        bookings: dayOrders.length,
        revenue: dayRevenue || undefined
      });
    }
    
    console.log('Direct database analytics generated:', analytics);
    return analytics;
    
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