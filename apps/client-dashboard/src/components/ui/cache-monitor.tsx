/**
 * Cache Monitor Component
 * 
 * Displays cache statistics and provides management controls.
 * For developer/settings page.
 */

import { useEffect } from 'react';
import { RefreshCw, Trash2, Database, TrendingUp, Activity } from 'lucide-react';
import { useServiceWorkerCache, formatBytes } from '@/hooks/useServiceWorkerCache';
import { localCache, getCacheHealth } from '@/utils/cache-manager';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export const CacheMonitor = () => {
  const swCache = useServiceWorkerCache();
  const localCacheStats = localCache.getStats();
  const cacheHealth = getCacheHealth();

  // Auto-refresh stats every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (swCache.isRegistered) {
        swCache.refreshStats();
        swCache.refreshSize();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [swCache.isRegistered]);

  // Initial fetch
  useEffect(() => {
    if (swCache.isRegistered) {
      swCache.refreshStats();
      swCache.refreshSize();
    }
  }, [swCache.isRegistered]);

  const handleClearAll = async () => {
    if (confirm('Clear all caches? This will log you out and reload the page.')) {
      // Clear Service Worker caches
      await swCache.clearCache();
      
      // Clear localStorage
      localCache.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Reload page
      window.location.reload();
    }
  };

  const handleClearLocalStorage = () => {
    if (confirm('Clear localStorage cache?')) {
      localCache.clear();
      window.location.reload();
    }
  };

  if (!swCache.isSupported) {
    return (
      <Card className="border-yellow-500/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-600">
            <Activity className="w-5 h-5" />
            Service Worker Not Supported
          </CardTitle>
          <CardDescription>
            Your browser doesn't support Service Workers. Some caching features may be limited.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Service Worker Cache */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Service Worker Cache
              </CardTitle>
              <CardDescription>
                {swCache.isRegistered ? (
                  <>Version: {swCache.version || 'Unknown'}</>
                ) : (
                  'Not registered'
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  swCache.refreshStats();
                  swCache.refreshSize();
                }}
                disabled={!swCache.isRegistered}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={swCache.clearCache}
                disabled={!swCache.isRegistered}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {swCache.stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Hit Rate</div>
                <div className="text-2xl font-bold text-green-600">
                  {swCache.stats.hitRate.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Cache Hits</div>
                <div className="text-2xl font-bold">{swCache.stats.hits}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Cache Misses</div>
                <div className="text-2xl font-bold">{swCache.stats.misses}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Errors</div>
                <div className="text-2xl font-bold text-red-600">{swCache.stats.errors}</div>
              </div>
            </div>
          )}

          {swCache.size && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Size</span>
                <span className="font-medium">{formatBytes(swCache.size.totalSize)}</span>
              </div>
              
              {swCache.size.caches.map((cache) => (
                <div key={cache.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{cache.name}</span>
                    <span>{formatBytes(cache.size)} ({cache.entries} items)</span>
                  </div>
                  <Progress 
                    value={(cache.size / swCache.size.totalSize) * 100} 
                    className="h-1"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* LocalStorage Cache */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                LocalStorage Cache
              </CardTitle>
              <CardDescription>
                Browser storage for app state and drafts
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearLocalStorage}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Entries</div>
              <div className="text-2xl font-bold">{localCacheStats.count}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Size</div>
              <div className="text-2xl font-bold">{formatBytes(localCacheStats.size)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Usage</div>
              <div className="text-2xl font-bold">
                {cacheHealth.usage.toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Health Status</span>
              <span className={`font-medium ${cacheHealth.isHealthy ? 'text-green-600' : 'text-yellow-600'}`}>
                {cacheHealth.isHealthy ? 'Healthy' : 'Needs Attention'}
              </span>
            </div>
            <Progress 
              value={cacheHealth.usage} 
              className="h-2"
            />
          </div>

          {cacheHealth.recommendations.length > 0 && (
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-3 space-y-1">
              <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Recommendations
              </div>
              {cacheHealth.recommendations.map((rec, idx) => (
                <div key={idx} className="text-sm text-yellow-700 dark:text-yellow-300">
                  • {rec}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clear All */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            These actions cannot be undone
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleClearAll}
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Caches
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            This will clear all cached data and reload the page
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
