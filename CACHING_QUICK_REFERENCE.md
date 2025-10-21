# Caching Quick Reference

## 🎯 Quick Start

### Add Cache to Component
```typescript
import { useQuery } from '@tanstack/react-query';
import { STALE_TIMES } from '@/config/cache.config';

const { data } = useQuery({
  queryKey: ['resource', id],
  queryFn: fetchResource,
  staleTime: STALE_TIMES.MEDIUM, // 5 minutes
});
```

### Use LocalStorage Cache
```typescript
import { localCache } from '@/utils/cache-manager';

// Set
localCache.set('key', value, '1.0');

// Get (with 1-hour expiration)
const value = localCache.get('key', 3600);
```

### Monitor Cache
```tsx
import { CacheMonitor } from '@/components/ui/cache-monitor';

<CacheMonitor /> // Add to Settings page
```

## 📊 Cache Times Reference

| Constant | Value | Use Case |
|----------|-------|----------|
| `REALTIME` | 30s | Messages, notifications |
| `SHORT` | 1m | Bookings, tables |
| `MEDIUM` | 5m | Analytics, customers |
| `LONG` | 15m | Settings, staff, menu |
| `STATIC` | 30m | Categories, templates |
| `PERMANENT` | 24h | Public packages |

## 🔧 Common Tasks

### Clear All Caches
```typescript
import { localCache } from '@/utils/cache-manager';

// Clear localStorage
localCache.clear();

// Clear Service Worker caches
const { clearCache } = useServiceWorkerCache();
await clearCache();

// Or use Cache Monitor UI
```

### Get Cache Stats
```typescript
import { useServiceWorkerCache } from '@/hooks/useServiceWorkerCache';

const { stats, refreshStats } = useServiceWorkerCache();
await refreshStats();

console.log(`Hit rate: ${stats?.hitRate}%`);
```

### Health Check
```typescript
import { getCacheHealth } from '@/utils/cache-manager';

const health = getCacheHealth();
if (!health.isHealthy) {
  console.warn(health.recommendations);
}
```

## 🎨 Cache Strategies

### HTTP/CDN (Vercel)
- **HTML**: No cache
- **JS/CSS**: 1 year immutable
- **Images**: 30 days + stale-while-revalidate
- **Fonts**: 1 year immutable

### Service Worker
- **Fonts**: Cache First (1 year)
- **Static**: Cache First (7 days)
- **Images**: Cache First (30 days)
- **API**: Network First (5s timeout)
- **HTML**: Network First (3s timeout)

### React Query
- **Real-time**: 30s stale time
- **Frequently changing**: 1-2m
- **Stable data**: 5-15m
- **Static data**: 30m-24h

### LocalStorage
- **Drafts**: 7-day expiration
- **Sessions**: 24-hour expiration
- **Analytics**: 30-day expiration
- **Preferences**: No expiration

## 🚀 Testing

### Check HTTP Headers
```bash
# DevTools → Network → Select asset → Headers
Cache-Control: public, max-age=31536000, immutable
```

### Check Service Worker
```bash
# DevTools → Application → Service Workers
Status: Activated and running
Version: v2
```

### Check React Query
```bash
# React Query DevTools (Alt+Q)
# Check stale times and cache status
```

### Check LocalStorage
```bash
# DevTools → Application → Local Storage
# Look for blunari_ prefixed keys
```

## ⚠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| Cache not working | Check SW registration, clear caches |
| High miss rate | Adjust stale times, verify query keys |
| Quota exceeded | Run `localCache.cleanup()` |
| SW not updating | Unregister SW, hard reload |

## 📁 File Locations

- **Config**: `src/config/cache.config.ts`
- **Manager**: `src/utils/cache-manager.ts`
- **Hook**: `src/hooks/useServiceWorkerCache.ts`
- **UI**: `src/components/ui/cache-monitor.tsx`
- **Service Worker**: `public/service-worker.js`
- **Vercel**: `vercel.json`

## 🎯 Best Practices

1. **Use centralized config** - Import from `cache.config.ts`
2. **Match resource types** - Use appropriate stale times
3. **Monitor hit rates** - Target >70%
4. **Clean up regularly** - Auto-cleanup runs automatically
5. **Test offline** - Verify Service Worker fallbacks
6. **Check health** - Review recommendations weekly

## 📈 Expected Performance

- **Initial load**: ~1s faster (cached assets)
- **API calls**: -70% (React Query cache)
- **Repeat visits**: -80% bandwidth
- **Offline**: App shell + cached data

## 🔗 Related Docs

- Full implementation: `CACHING_IMPLEMENTATION_COMPLETE.md`
- Priority 2 features: `PRIORITY_2_COMPLETE.md`
- Project overview: `.github/copilot-instructions.md`
