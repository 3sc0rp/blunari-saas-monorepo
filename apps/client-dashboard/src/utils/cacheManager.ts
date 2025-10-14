import { logger } from '@/utils/logger';
import { performanceMonitor } from '@/utils/performanceMonitor';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  metadata?: {
    size?: number;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    dependencies?: string[];
  };
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  maxMemoryUsage: number;
  compressionThreshold: number;
  enableMetrics: boolean;
}

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private metrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalRequests: 0,
    memoryUsage: 0,
    averageAccessTime: 0
  };

  private config: CacheConfig = {
    maxSize: 1000,
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    compressionThreshold: 10 * 1024, // 10KB
    enableMetrics: true
  };

  // Interval references for cleanup
  private cleanupInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Every minute
    
    // Memory monitoring
      if (this.config.enableMetrics) {
      this.metricsInterval = setInterval(() => this.updateMemoryMetrics(), 30000); // Every 30 seconds
    }

    logger.info('Cache manager initialized', {
      component: 'CacheManager',
      config: this.config
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();
    this.metrics.totalRequests++;

    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.metrics.misses++;
        this.recordAccessTime(startTime);
        return null;
      }

      // Check TTL
      const now = Date.now();
      const age = now - entry.timestamp;
      const ttl = this.getTTL(key);
      
      if (age > ttl) {
        this.cache.delete(key);
        this.metrics.misses++;
        this.recordAccessTime(startTime);
        
        logger.debug('Cache entry expired', {
          component: 'CacheManager',
          key,
          age,
          ttl
        });
        
        return null;
      }

      // Update access metadata
      entry.accessCount++;
      entry.lastAccessed = now;
      
      this.metrics.hits++;
      this.recordAccessTime(startTime);

      logger.debug('Cache hit', {
        component: 'CacheManager',
        key,
        accessCount: entry.accessCount,
        age
      });

      return entry.data;
    } catch (error) {
      logger.error('Cache get error', error instanceof Error ? error : new Error('Unknown cache error'), {
        component: 'CacheManager',
        key
      });
      
      this.recordAccessTime(startTime);
      return null;
    }
  }

  async set<T>(
    key: string, 
    data: T, 
    options?: {
      ttl?: number;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      dependencies?: string[];
    }
  ): Promise<void> {
    try {
      const now = Date.now();
      const dataSize = this.estimateSize(data);
      
      // Check memory limits
      if (this.metrics.memoryUsage + dataSize > this.config.maxMemoryUsage) {
        await this.evictLRU(dataSize);
      }

      // Check cache size limits
      if (this.cache.size >= this.config.maxSize) {
        await this.evictLRU();
      }

      const entry: CacheEntry<T> = {
        data,
        timestamp: now,
        accessCount: 0,
        lastAccessed: now,
        metadata: {
          size: dataSize,
          priority: options?.priority || 'medium',
          dependencies: options?.dependencies
        }
      };

      this.cache.set(key, entry);
      this.metrics.memoryUsage += dataSize;

      logger.debug('Cache entry set', {
        component: 'CacheManager',
        key,
        size: dataSize,
        priority: entry.metadata?.priority,
        cacheSize: this.cache.size
      });

      // Compress large entries
      if (dataSize > this.config.compressionThreshold) {
        await this.compressEntry(key);
      }

    } catch (error) {
      logger.error('Cache set error', error instanceof Error ? error : new Error('Unknown cache error'), {
        component: 'CacheManager',
        key
      });
    }
  }

  async invalidate(key: string): Promise<void> {
    try {
      const entry = this.cache.get(key);
      if (entry) {
        this.cache.delete(key);
        this.metrics.memoryUsage -= entry.metadata?.size || 0;
        
        logger.debug('Cache entry invalidated', {
          component: 'CacheManager',
          key,
          freedMemory: entry.metadata?.size || 0
        });
      }

      // Invalidate dependent entries
      await this.invalidateDependencies(key);

    } catch (error) {
      logger.error('Cache invalidation error', error instanceof Error ? error : new Error('Unknown cache error'), {
        component: 'CacheManager',
        key
      });
    }
  }

  async invalidateByPattern(pattern: RegExp): Promise<void> {
    try {
      const keysToDelete: string[] = [];
      
      for (const key of this.cache.keys()) {
        if (pattern.test(key)) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        await this.invalidate(key);
      }

      logger.info('Cache entries invalidated by pattern', {
        component: 'CacheManager',
        pattern: pattern.toString(),
        deletedCount: keysToDelete.length
      });

    } catch (error) {
      logger.error('Cache pattern invalidation error', error instanceof Error ? error : new Error('Unknown cache error'), {
        component: 'CacheManager',
        pattern: pattern.toString()
      });
    }
  }

  getMetrics() {
    const hitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.hits / this.metrics.totalRequests) * 100 
      : 0;

    return {
      ...this.metrics,
      hitRate: parseFloat(hitRate.toFixed(2)),
      cacheSize: this.cache.size,
      memoryUsageFormatted: this.formatBytes(this.metrics.memoryUsage)
    };
  }

  async clear(): Promise<void> {
    try {
      const size = this.cache.size;
      this.cache.clear();
      this.metrics.memoryUsage = 0;
      
      logger.info('Cache cleared', {
        component: 'CacheManager',
        clearedEntries: size
      });

    } catch (error) {
      logger.error('Cache clear error', error instanceof Error ? error : new Error('Unknown cache error'), {
        component: 'CacheManager'
      });
    }
  }

  // Advanced cache warming
  async warmCache(
    warmupConfig: Array<{
      key: string;
      dataLoader: () => Promise<any>;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      ttl?: number;
    }>
  ): Promise<void> {
    logger.info('Starting cache warmup', {
      component: 'CacheManager',
      itemCount: warmupConfig.length
    });

    const startTime = performance.now();
    
    try {
      const promises = warmupConfig.map(async (config) => {
        try {
          const data = await config.dataLoader();
          await this.set(config.key, data, {
            priority: config.priority,
            ttl: config.ttl
          });
        } catch (error) {
          logger.warn('Failed to warm cache entry', {
            component: 'CacheManager',
            key: config.key,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      await Promise.allSettled(promises);
      
      const duration = performance.now() - startTime;
      
      logger.info('Cache warmup completed', {
        component: 'CacheManager',
        duration: `${duration.toFixed(2)}ms`,
        itemCount: warmupConfig.length
      });

      if (this.config.enableMetrics) {
        performanceMonitor.recordMetric('cache-warmup', duration);
      }

    } catch (error) {
      logger.error('Cache warmup error', error instanceof Error ? error : new Error('Unknown cache error'), {
        component: 'CacheManager'
      });
    }
  }

  private async evictLRU(requiredSpace?: number): Promise<void> {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => {
        const priorityWeight = this.getPriorityWeight(a[1].metadata?.priority);
        const priorityWeightB = this.getPriorityWeight(b[1].metadata?.priority);
        
        if (priorityWeight !== priorityWeightB) {
          return priorityWeight - priorityWeightB; // Lower priority first
        }
        
        return a[1].lastAccessed - b[1].lastAccessed; // Older first
      });

    let freedSpace = 0;
    let evictedCount = 0;

    for (const [key, entry] of entries) {
      if (requiredSpace && freedSpace >= requiredSpace) break;
      if (!requiredSpace && evictedCount >= Math.ceil(this.cache.size * 0.1)) break; // Evict 10%

      this.cache.delete(key);
      freedSpace += entry.metadata?.size || 0;
      evictedCount++;
      this.metrics.evictions++;
    }

    this.metrics.memoryUsage -= freedSpace;

    logger.debug('LRU eviction completed', {
      component: 'CacheManager',
      evictedCount,
      freedSpace: this.formatBytes(freedSpace)
    });
  }

  private async invalidateDependencies(key: string): Promise<void> {
    const dependentKeys: string[] = [];
    
    for (const [cacheKey, entry] of this.cache.entries()) {
      if (entry.metadata?.dependencies?.includes(key)) {
        dependentKeys.push(cacheKey);
      }
    }

    for (const dependentKey of dependentKeys) {
      await this.invalidate(dependentKey);
    }
  }

  private async compressEntry(key: string): Promise<void> {
    // Placeholder for compression implementation
    // In a real implementation, you might use compression libraries
    logger.debug('Entry marked for compression', {
      component: 'CacheManager',
      key
    });
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      const ttl = this.getTTL(key);
      
      if (age > ttl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      const entry = this.cache.get(key);
      this.cache.delete(key);
      this.metrics.memoryUsage -= entry?.metadata?.size || 0;
    }

    if (keysToDelete.length > 0) {
      logger.debug('Cache cleanup completed', {
        component: 'CacheManager',
        expiredEntries: keysToDelete.length
      });
    }
  }

  private updateMemoryMetrics(): void {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.metadata?.size || 0;
    }
    this.metrics.memoryUsage = totalSize;
  }

  private getTTL(key: string): number {
    // This could be extended to support per-key TTL configuration
      return this.config.defaultTTL;
  }

  private estimateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 1024; // Default 1KB estimate
    }
  }

  private getPriorityWeight(priority?: string): number {
    switch (priority) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 2;
    }
  }

  private recordAccessTime(startTime: number): void {
    const accessTime = performance.now() - startTime;
    this.metrics.averageAccessTime = 
      (this.metrics.averageAccessTime + accessTime) / 2;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Clean up resources and stop intervals
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    
    this.cache.clear();
    
    logger.info('Cache manager destroyed', {
      component: 'CacheManager'
    });
  }
}

// Export singleton instance
export const cacheManager = new CacheManager({
  maxSize: 2000,
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  maxMemoryUsage: 100 * 1024 * 1024, // 100MB
  enableMetrics: true
});

// Export decorator for easy caching
export function cached(
  key: string | ((args: any[]) => string),
  options?: {
    ttl?: number;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    dependencies?: string[];
  }
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheKey = typeof key === 'string' ? key : key(args);
      
      // Try to get from cache
      const cached = await cacheManager.get(cacheKey);
      if (cached !== null) {
        return cached;
      }
      
      // Execute method and cache result
      const result = await method.apply(this, args);
      await cacheManager.set(cacheKey, result, options);
      
      return result;
    };
    
    return descriptor;
  };
}

export type { CacheConfig, CacheEntry };

