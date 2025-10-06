/**
 * Service Worker for Blunari Client Dashboard
 * Provides offline caching and performance optimization
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `blunari-client-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
];

// Cache strategies by URL pattern
const CACHE_STRATEGIES = {
  // Static assets - Cache First
  STATIC: /\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico)$/,
  
  // API calls - Network First with cache fallback
  API: /\/api\//,
  
  // Supabase REST API - Network First
  SUPABASE_REST: /supabase\.co\/rest\/v1\//,
  
  // Images - Cache First
  IMAGES: /\.(png|jpg|jpeg|gif|webp|svg|ico)$/,
  
  // Fonts - Cache First (long TTL)
  FONTS: /\.(woff2?|ttf|eot)$/,
};

// Install event - precache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[Service Worker] Precache failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome extensions and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip WebSocket connections
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  event.respondWith(handleFetch(request));
});

async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // Fonts - Cache First (long TTL)
    if (CACHE_STRATEGIES.FONTS.test(url.pathname)) {
      return await cacheFirst(request, CACHE_NAME, { maxAge: 365 * 24 * 60 * 60 }); // 1 year
    }
    
    // Static assets (JS, CSS) - Cache First
    if (CACHE_STRATEGIES.STATIC.test(url.pathname)) {
      return await cacheFirst(request, CACHE_NAME, { maxAge: 7 * 24 * 60 * 60 }); // 1 week
    }
    
    // Images - Cache First
    if (CACHE_STRATEGIES.IMAGES.test(url.pathname)) {
      return await cacheFirst(request, RUNTIME_CACHE, { maxAge: 30 * 24 * 60 * 60 }); // 30 days
    }
    
    // API calls - Network First
    if (CACHE_STRATEGIES.API.test(url.pathname) || CACHE_STRATEGIES.SUPABASE_REST.test(url.href)) {
      return await networkFirst(request, RUNTIME_CACHE, { timeout: 5000 });
    }
    
    // HTML pages - Network First
    if (request.headers.get('accept')?.includes('text/html')) {
      return await networkFirst(request, CACHE_NAME, { timeout: 3000 });
    }
    
    // Default - Network First
    return await networkFirst(request, RUNTIME_CACHE);
    
  } catch (error) {
    console.error('[Service Worker] Fetch error:', error);
    
    // Return offline page for navigation requests
    if (request.headers.get('accept')?.includes('text/html')) {
      const cache = await caches.open(CACHE_NAME);
      const offlinePage = await cache.match('/offline.html');
      if (offlinePage) return offlinePage;
    }
    
    return new Response('Network error', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// Cache First strategy - check cache, fallback to network
async function cacheFirst(request, cacheName, options = {}) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    // Check if cached response is still fresh
    if (options.maxAge) {
      const cachedDate = new Date(cached.headers.get('date') || 0).getTime();
      const now = Date.now();
      const age = (now - cachedDate) / 1000; // age in seconds
      
      if (age > options.maxAge) {
        // Cache expired, fetch fresh
        const fresh = await fetchAndCache(request, cache);
        return fresh || cached; // Fallback to stale cache if fetch fails
      }
    }
    
    return cached;
  }
  
  return await fetchAndCache(request, cache);
}

// Network First strategy - try network, fallback to cache
async function networkFirst(request, cacheName, options = {}) {
  const cache = await caches.open(cacheName);
  
  try {
    const controller = new AbortController();
    const timeoutId = options.timeout 
      ? setTimeout(() => controller.abort(), options.timeout)
      : null;
    
    const response = await fetch(request, { 
      signal: controller.signal 
    });
    
    if (timeoutId) clearTimeout(timeoutId);
    
    // Only cache successful responses
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
    
  } catch (error) {
    // Fallback to cache
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    
    throw error;
  }
}

// Helper to fetch and cache response
async function fetchAndCache(request, cache) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[Service Worker] Fetch failed:', error);
    throw error;
  }
}

// Message handler for cache management
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
  
  if (event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});
