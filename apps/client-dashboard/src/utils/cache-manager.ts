/**
 * Cache Manager
 * 
 * Centralized cache management for browser storage (localStorage, sessionStorage).
 * Handles expiration, versioning, and automatic cleanup.
 */

import { CACHE_EXPIRATION, STORAGE_KEYS, createCacheEntry, isCacheExpired, type CacheMetadata } from '@/config/cache.config';

interface CacheEntry<T> {
  data: T;
  meta: CacheMetadata;
}

/**
 * Cache Manager Class
 */
export class CacheManager {
  private storage: Storage;
  private prefix: string;
  
  constructor(storage: Storage = localStorage, prefix = 'blunari_') {
    this.storage = storage;
    this.prefix = prefix;
  }
  
  /**
   * Get prefixed key
   */
  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }
  
  /**
   * Set cache entry with metadata
   */
  set<T>(key: string, value: T, version = '1.0'): void {
    try {
      const entry = createCacheEntry(value, version);
      this.storage.setItem(this.getKey(key), JSON.stringify(entry));
    } catch (error) {
      console.error(`[CacheManager] Failed to set ${key}:`, error);
      // Handle quota exceeded errors
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.cleanup();
        // Retry once after cleanup
        try {
          const entry = createCacheEntry(value, version);
          this.storage.setItem(this.getKey(key), JSON.stringify(entry));
        } catch (retryError) {
          console.error(`[CacheManager] Failed to set ${key} after cleanup:`, retryError);
        }
      }
    }
  }
  
  /**
   * Get cache entry
   */
  get<T>(key: string, maxAgeSeconds?: number): T | null {
    try {
      const item = this.storage.getItem(this.getKey(key));
      if (!item) return null;
      
      const entry: CacheEntry<T> = JSON.parse(item);
      
      // Check expiration
      if (maxAgeSeconds && isCacheExpired(entry.meta.timestamp, maxAgeSeconds)) {
        this.remove(key);
        return null;
      }
      
      // Increment hit counter
      entry.meta.hits = (entry.meta.hits || 0) + 1;
      this.storage.setItem(this.getKey(key), JSON.stringify(entry));
      
      return entry.data;
    } catch (error) {
      console.error(`[CacheManager] Failed to get ${key}:`, error);
      return null;
    }
  }
  
  /**
   * Remove cache entry
   */
  remove(key: string): void {
    try {
      this.storage.removeItem(this.getKey(key));
    } catch (error) {
      console.error(`[CacheManager] Failed to remove ${key}:`, error);
    }
  }
  
  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return this.storage.getItem(this.getKey(key)) !== null;
  }
  
  /**
   * Clear all cache entries with prefix
   */
  clear(): void {
    try {
      const keys = Object.keys(this.storage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          this.storage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('[CacheManager] Failed to clear cache:', error);
    }
  }
  
  /**
   * Cleanup expired entries
   */
  cleanup(maxAgeSeconds = CACHE_EXPIRATION.DRAFT_EXPIRY_DAYS * 24 * 60 * 60): number {
    let cleanedCount = 0;
    
    try {
      const keys = Object.keys(this.storage);
      
      keys.forEach(key => {
        if (!key.startsWith(this.prefix)) return;
        
        try {
          const item = this.storage.getItem(key);
          if (!item) return;
          
          const entry: CacheEntry<unknown> = JSON.parse(item);
          
          if (isCacheExpired(entry.meta.timestamp, maxAgeSeconds)) {
            this.storage.removeItem(key);
            cleanedCount++;
          }
        } catch (error) {
          // Invalid entry, remove it
          this.storage.removeItem(key);
          cleanedCount++;
        }
      });
      
      if (cleanedCount > 0) {
        console.log(`[CacheManager] Cleaned up ${cleanedCount} expired entries`);
      }
    } catch (error) {
      console.error('[CacheManager] Cleanup failed:', error);
    }
    
    return cleanedCount;
  }
  
  /**
   * Get cache size in bytes (approximate)
   */
  getSize(): number {
    let size = 0;
    
    try {
      const keys = Object.keys(this.storage);
      
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          const item = this.storage.getItem(key);
          if (item) {
            size += key.length + item.length;
          }
        }
      });
    } catch (error) {
      console.error('[CacheManager] Failed to calculate size:', error);
    }
    
    return size;
  }
  
  /**
   * Get cache statistics
   */
  getStats(): {
    count: number;
    size: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    let count = 0;
    let size = 0;
    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;
    
    try {
      const keys = Object.keys(this.storage);
      
      keys.forEach(key => {
        if (!key.startsWith(this.prefix)) return;
        
        const item = this.storage.getItem(key);
        if (!item) return;
        
        count++;
        size += key.length + item.length;
        
        try {
          const entry: CacheEntry<unknown> = JSON.parse(item);
          const timestamp = entry.meta.timestamp;
          
          if (oldestEntry === null || timestamp < oldestEntry) {
            oldestEntry = timestamp;
          }
          
          if (newestEntry === null || timestamp > newestEntry) {
            newestEntry = timestamp;
          }
        } catch (error) {
          // Ignore parse errors
        }
      });
    } catch (error) {
      console.error('[CacheManager] Failed to get stats:', error);
    }
    
    return { count, size, oldestEntry, newestEntry };
  }
  
  /**
   * Export cache as JSON
   */
  export(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    
    try {
      const keys = Object.keys(this.storage);
      
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          const item = this.storage.getItem(key);
          if (item) {
            try {
              data[key.replace(this.prefix, '')] = JSON.parse(item);
            } catch (error) {
              data[key.replace(this.prefix, '')] = item;
            }
          }
        }
      });
    } catch (error) {
      console.error('[CacheManager] Export failed:', error);
    }
    
    return data;
  }
  
  /**
   * Import cache from JSON
   */
  import(data: Record<string, unknown>): void {
    try {
      Object.entries(data).forEach(([key, value]) => {
        this.storage.setItem(
          this.getKey(key),
          typeof value === 'string' ? value : JSON.stringify(value)
        );
      });
    } catch (error) {
      console.error('[CacheManager] Import failed:', error);
    }
  }
}

// ============================================================================
// Global Cache Instances
// ============================================================================

export const localCache = new CacheManager(localStorage, 'blunari_');
export const sessionCache = new CacheManager(sessionStorage, 'blunari_session_');

// ============================================================================
// Auto Cleanup
// ============================================================================

/**
 * Setup automatic cache cleanup
 */
export const setupCacheCleanup = (): (() => void) => {
  const intervalId = setInterval(() => {
    const cleaned = localCache.cleanup();
    if (cleaned > 0) {
      console.log(`[Cache] Auto-cleanup removed ${cleaned} expired entries`);
    }
  }, CACHE_EXPIRATION.CLEANUP_INTERVAL_MS);
  
  // Return cleanup function
  return () => clearInterval(intervalId);
};

// ============================================================================
// Cache Utilities
// ============================================================================

/**
 * Get or set cache value with callback
 */
export const cacheOrFetch = async <T>(
  key: string,
  fetchFn: () => Promise<T>,
  maxAgeSeconds = 300 // 5 minutes default
): Promise<T> => {
  // Try cache first
  const cached = localCache.get<T>(key, maxAgeSeconds);
  if (cached !== null) {
    return cached;
  }
  
  // Fetch fresh data
  const data = await fetchFn();
  
  // Store in cache
  localCache.set(key, data);
  
  return data;
};

/**
 * Invalidate cache entries by pattern
 */
export const invalidateCachePattern = (pattern: string | RegExp): number => {
  let invalidated = 0;
  
  try {
    const keys = Object.keys(localStorage);
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    
    keys.forEach(key => {
      if (regex.test(key)) {
        localStorage.removeItem(key);
        invalidated++;
      }
    });
  } catch (error) {
    console.error('[Cache] Failed to invalidate by pattern:', error);
  }
  
  return invalidated;
};

/**
 * Get cache health metrics
 */
export const getCacheHealth = (): {
  isHealthy: boolean;
  size: number;
  maxSize: number;
  usage: number;
  recommendations: string[];
} => {
  const stats = localCache.getStats();
  const maxSize = 5 * 1024 * 1024; // 5MB (typical localStorage limit is 5-10MB)
  const usage = (stats.size / maxSize) * 100;
  const recommendations: string[] = [];
  
  if (usage > 80) {
    recommendations.push('Cache usage above 80%, consider cleanup');
  }
  
  if (stats.count > 1000) {
    recommendations.push('High number of cache entries, run cleanup');
  }
  
  const now = Date.now();
  if (stats.oldestEntry && (now - stats.oldestEntry) > 30 * 24 * 60 * 60 * 1000) {
    recommendations.push('Cache contains entries older than 30 days');
  }
  
  return {
    isHealthy: usage < 80 && stats.count < 1000,
    size: stats.size,
    maxSize,
    usage,
    recommendations,
  };
};
