/**
 * Service Worker Cache Hook
 * 
 * React hook for interacting with Service Worker cache.
 * Provides cache stats, management, and monitoring.
 */

import { useState, useEffect, useCallback } from 'react';

interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
  total: number;
  hitRate: number;
}

interface CacheSize {
  totalSize: number;
  caches: Array<{
    name: string;
    size: number;
    entries: number;
  }>;
}

interface ServiceWorkerCache {
  isSupported: boolean;
  isRegistered: boolean;
  version: string | null;
  stats: CacheStats | null;
  size: CacheSize | null;
  clearCache: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshSize: () => Promise<void>;
  skipWaiting: () => Promise<void>;
}

export const useServiceWorkerCache = (): ServiceWorkerCache => {
  const [isSupported] = useState(() => 'serviceWorker' in navigator);
  const [isRegistered, setIsRegistered] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [size, setSize] = useState<CacheSize | null>(null);

  // Check if service worker is registered
  useEffect(() => {
    if (!isSupported) return;

    navigator.serviceWorker.getRegistration()
      .then(registration => {
        setIsRegistered(!!registration);
      })
      .catch(error => {
        console.error('[useServiceWorkerCache] Failed to check registration:', error);
      });
  }, [isSupported]);

  // Get service worker version
  const refreshVersion = useCallback(async () => {
    if (!isSupported || !isRegistered) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration?.active) return;

      const messageChannel = new MessageChannel();
      
      return new Promise<void>((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          setVersion(event.data.version);
          resolve();
        };

        registration.active.postMessage(
          { type: 'GET_VERSION' },
          [messageChannel.port2]
        );
      });
    } catch (error) {
      console.error('[useServiceWorkerCache] Failed to get version:', error);
    }
  }, [isSupported, isRegistered]);

  // Get cache statistics
  const refreshStats = useCallback(async () => {
    if (!isSupported || !isRegistered) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration?.active) return;

      const messageChannel = new MessageChannel();
      
      return new Promise<void>((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          setStats(event.data);
          resolve();
        };

        registration.active.postMessage(
          { type: 'GET_STATS' },
          [messageChannel.port2]
        );
      });
    } catch (error) {
      console.error('[useServiceWorkerCache] Failed to get stats:', error);
    }
  }, [isSupported, isRegistered]);

  // Get cache size
  const refreshSize = useCallback(async () => {
    if (!isSupported || !isRegistered) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration?.active) return;

      const messageChannel = new MessageChannel();
      
      return new Promise<void>((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          setSize(event.data);
          resolve();
        };

        registration.active.postMessage(
          { type: 'GET_CACHE_SIZE' },
          [messageChannel.port2]
        );
      });
    } catch (error) {
      console.error('[useServiceWorkerCache] Failed to get size:', error);
    }
  }, [isSupported, isRegistered]);

  // Clear all caches
  const clearCache = useCallback(async () => {
    if (!isSupported || !isRegistered) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration?.active) return;

      registration.active.postMessage({ type: 'CLEAR_CACHE' });
      
      // Wait a bit for cache to clear, then refresh stats
      setTimeout(() => {
        refreshStats();
        refreshSize();
      }, 1000);
    } catch (error) {
      console.error('[useServiceWorkerCache] Failed to clear cache:', error);
    }
  }, [isSupported, isRegistered, refreshStats, refreshSize]);

  // Skip waiting and activate new service worker
  const skipWaiting = useCallback(async () => {
    if (!isSupported) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration?.waiting) return;

      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload page after activation
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    } catch (error) {
      console.error('[useServiceWorkerCache] Failed to skip waiting:', error);
    }
  }, [isSupported]);

  // Fetch version on mount
  useEffect(() => {
    if (isRegistered) {
      refreshVersion();
    }
  }, [isRegistered, refreshVersion]);

  return {
    isSupported,
    isRegistered,
    version,
    stats,
    size,
    clearCache,
    refreshStats,
    refreshSize,
    skipWaiting,
  };
};

/**
 * Format bytes to human-readable size
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
