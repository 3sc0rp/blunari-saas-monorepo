/**
 * Cache Configuration for Blunari Client Dashboard
 * 
 * Centralized caching strategy for:
 * - React Query
 * - Service Worker
 * - Browser Storage
 * - HTTP Headers
 */

// ============================================================================
// React Query Cache Times
// ============================================================================

export const QUERY_CACHE_TIMES = {
  // Real-time data (frequent updates)
  REALTIME: 30 * 1000,              // 30 seconds
  
  // Dynamic data (moderate updates)
  SHORT: 1 * 60 * 1000,             // 1 minute
  MEDIUM: 5 * 60 * 1000,            // 5 minutes
  LONG: 15 * 60 * 1000,             // 15 minutes
  
  // Static data (infrequent updates)
  STATIC: 30 * 60 * 1000,           // 30 minutes
  PERMANENT: 24 * 60 * 60 * 1000,   // 24 hours
} as const;

// ============================================================================
// Query Stale Times (when to refetch)
// ============================================================================

export const STALE_TIMES = {
  // Critical data - refetch on every mount
  ALWAYS_FRESH: 0,
  
  // Frequently changing data
  BOOKINGS: QUERY_CACHE_TIMES.SHORT,
  MESSAGES: QUERY_CACHE_TIMES.REALTIME,
  NOTIFICATIONS: QUERY_CACHE_TIMES.SHORT,
  
  // Moderately changing data
  TABLES: QUERY_CACHE_TIMES.MEDIUM,
  MENU_ITEMS: QUERY_CACHE_TIMES.MEDIUM,
  CATERING_PACKAGES: QUERY_CACHE_TIMES.MEDIUM,
  ANALYTICS: QUERY_CACHE_TIMES.MEDIUM,
  
  // Rarely changing data
  TENANT: QUERY_CACHE_TIMES.LONG,
  USER_PROFILE: QUERY_CACHE_TIMES.LONG,
  SETTINGS: QUERY_CACHE_TIMES.LONG,
  
  // Static reference data
  BUSINESS_HOURS: QUERY_CACHE_TIMES.STATIC,
  LOCATIONS: QUERY_CACHE_TIMES.STATIC,
} as const;

// ============================================================================
// React Query Default Config
// ============================================================================

export const REACT_QUERY_CONFIG = {
  defaultOptions: {
    queries: {
      // Global defaults
      staleTime: STALE_TIMES.ALWAYS_FRESH,
      gcTime: QUERY_CACHE_TIMES.MEDIUM, // Previously cacheTime
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      retry: 2,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Network settings
      networkMode: 'online' as const,
      
      // Metadata
      meta: {
        errorMessage: 'Failed to fetch data',
      },
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
      networkMode: 'online' as const,
    },
  },
} as const;

// ============================================================================
// Service Worker Cache Names
// ============================================================================

export const SW_CACHE_NAMES = {
  STATIC: 'blunari-static-v1',
  DYNAMIC: 'blunari-dynamic-v1',
  IMAGES: 'blunari-images-v1',
  API: 'blunari-api-v1',
  FONTS: 'blunari-fonts-v1',
} as const;

// ============================================================================
// Service Worker Cache Strategies
// ============================================================================

export const SW_CACHE_STRATEGIES = {
  // Cache First (long-lived static assets)
  FONTS: {
    strategy: 'CacheFirst',
    maxAge: 365 * 24 * 60 * 60, // 1 year
    maxEntries: 50,
  },
  
  // Cache First (versioned static assets)
  STATIC: {
    strategy: 'CacheFirst',
    maxAge: 7 * 24 * 60 * 60, // 1 week
    maxEntries: 100,
  },
  
  // Cache First (images)
  IMAGES: {
    strategy: 'CacheFirst',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    maxEntries: 200,
  },
  
  // Network First (HTML)
  HTML: {
    strategy: 'NetworkFirst',
    timeout: 3000,
    maxEntries: 50,
  },
  
  // Network First (API)
  API: {
    strategy: 'NetworkFirst',
    timeout: 5000,
    maxEntries: 100,
  },
  
  // Stale While Revalidate (balance between speed and freshness)
  DYNAMIC: {
    strategy: 'StaleWhileRevalidate',
    maxAge: 60 * 60, // 1 hour
    maxEntries: 150,
  },
} as const;

// ============================================================================
// LocalStorage Cache Keys
// ============================================================================

export const STORAGE_KEYS = {
  // User preferences
  THEME: 'theme',
  CONTRAST: 'contrast',
  LANGUAGE: 'language',
  
  // Session data
  SESSION_ID: 'catering_session_id',
  LAST_ACTIVE: 'last_active',
  
  // Draft data
  CATERING_DRAFT_PREFIX: 'catering_draft_',
  BOOKING_DRAFT_PREFIX: 'booking_draft_',
  
  // Cache metadata
  CACHE_VERSION: 'cache_version',
  LAST_CACHE_CLEAR: 'last_cache_clear',
  
  // Analytics
  ANALYTICS_SESSION: 'analytics_session',
  ANALYTICS_USER_ID: 'analytics_user_id',
} as const;

// ============================================================================
// Cache Expiration Policies
// ============================================================================

export const CACHE_EXPIRATION = {
  // Draft data expiration
  DRAFT_EXPIRY_DAYS: 7,
  
  // Session data expiration
  SESSION_EXPIRY_HOURS: 24,
  
  // Analytics data retention
  ANALYTICS_RETENTION_DAYS: 30,
  
  // Cleanup intervals
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
} as const;

// ============================================================================
// HTTP Cache Headers (for reference/documentation)
// ============================================================================

export const HTTP_CACHE_HEADERS = {
  // No cache (HTML, dynamic content)
  NO_CACHE: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  
  // Immutable (hashed assets)
  IMMUTABLE: 'public, max-age=31536000, immutable',
  
  // Short cache (API responses)
  SHORT: 'public, max-age=60, stale-while-revalidate=30',
  
  // Medium cache (images, non-hashed assets)
  MEDIUM: 'public, max-age=2592000, stale-while-revalidate=86400', // 30 days
  
  // Long cache (fonts)
  LONG: 'public, max-age=31536000, immutable',
} as const;

// ============================================================================
// Cache Utility Functions
// ============================================================================

/**
 * Get cache key for tenant-specific data
 */
export const getTenantCacheKey = (tenantId: string, key: string): string => {
  return `tenant_${tenantId}_${key}`;
};

/**
 * Check if cache entry is expired
 */
export const isCacheExpired = (timestamp: number, maxAgeSeconds: number): boolean => {
  const now = Date.now();
  const age = (now - timestamp) / 1000;
  return age > maxAgeSeconds;
};

/**
 * Get cache metadata
 */
export interface CacheMetadata {
  timestamp: number;
  version: string;
  size?: number;
  hits?: number;
}

/**
 * Create cache entry with metadata
 */
export const createCacheEntry = <T>(data: T, version = '1.0'): {
  data: T;
  meta: CacheMetadata;
} => ({
  data,
  meta: {
    timestamp: Date.now(),
    version,
    hits: 0,
  },
});

/**
 * Calculate cache efficiency
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
}

export const calculateCacheStats = (hits: number, misses: number, size: number): CacheStats => ({
  hits,
  misses,
  hitRate: hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0,
  size,
});
