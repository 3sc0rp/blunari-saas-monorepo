/**
 * Performance Optimization Utilities
 * Improves app load time and responsiveness
 */

// Preconnect to critical origins
export function preconnectCriticalOrigins() {
  const origins = [
    'https://kbfbbkcaxhzlnbqxwgoz.supabase.co',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
  ];

  origins.forEach(origin => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}

// DNS prefetch for external resources
export function dnsPrefetch() {
  const domains = [
    '//kbfbbkcaxhzlnbqxwgoz.supabase.co',
    '//fonts.googleapis.com',
    '//fonts.gstatic.com',
  ];

  domains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = domain;
    document.head.appendChild(link);
  });
}

// Defer non-critical scripts
export function deferNonCriticalScripts() {
  // Mark analytics and non-essential scripts as defer
      const scripts = document.querySelectorAll('script[data-defer="true"]');
  scripts.forEach(script => {
    (script as HTMLScriptElement).defer = true;
  });
}

// Preload critical fonts
export function preloadCriticalFonts() {
  const fonts = [
    '/fonts/inter-var.woff2',
    '/fonts/inter-regular.woff2',
  ];

  fonts.forEach(font => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.href = font;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}

// Optimize images with loading priority
export function optimizeImageLoading() {
  // Mark above-the-fold images as priority
      const priorityImages = document.querySelectorAll('img[data-priority="high"]');
  priorityImages.forEach(img => {
    (img as HTMLImageElement).loading = 'eager';
    (img as HTMLImageElement).fetchPriority = 'high';
  });

  // Lazy load below-the-fold images
      const lazyImages = document.querySelectorAll('img:not([data-priority="high"])');
  lazyImages.forEach(img => {
    (img as HTMLImageElement).loading = 'lazy';
    (img as HTMLImageElement).fetchPriority = 'low';
  });
}

// Debounce function for expensive operations
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function for scroll/resize handlers
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Request idle callback wrapper with fallback
export function requestIdleCallback(callback: () => void, options?: { timeout?: number }) {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  } else {
    return setTimeout(callback, 1) as any;
  }
}

// Cancel idle callback wrapper
export function cancelIdleCallback(id: number) {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}

// Measure and log performance metrics
export function measurePerformance() {
  if (import.meta.env.PROD) return; // Only in development
      if ('performance' in window && 'getEntriesByType' in performance) {
    requestIdleCallback(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const metrics = {
          // Page load metrics
          dns: Math.round(navigation.domainLookupEnd - navigation.domainLookupStart),
          tcp: Math.round(navigation.connectEnd - navigation.connectStart),
          ttfb: Math.round(navigation.responseStart - navigation.requestStart),
          download: Math.round(navigation.responseEnd - navigation.responseStart),
          domInteractive: Math.round(navigation.domInteractive - navigation.fetchStart),
          domComplete: Math.round(navigation.domComplete - navigation.fetchStart),
          loadComplete: Math.round(navigation.loadEventEnd - navigation.fetchStart),
        };      }

      // Core Web Vitals (if available)
      if ('PerformanceObserver' in window) {
        try {
          // Largest Contentful Paint (LCP)
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];          }).observe({ entryTypes: ['largest-contentful-paint'] });

          // First Input Delay (FID)
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach(entry => {            });
          }).observe({ entryTypes: ['first-input'] });

          // Cumulative Layout Shift (CLS)
          let clsScore = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsScore += (entry as any).value;
              }
            }          }).observe({ entryTypes: ['layout-shift'] });
        } catch (e) {
          // PerformanceObserver not supported
        }
      }
    }, { timeout: 3000 });
  }
}

// Memory cleanup for unmounted components
export function cleanupMemory() {
  if ('gc' in window && import.meta.env.DEV) {
    // Force garbage collection in development (Chrome with --expose-gc flag)
    (window as any).gc();
  }
}

// Batch DOM updates
export function batchDOMUpdates(updates: Array<() => void>) {
  requestAnimationFrame(() => {
    updates.forEach(update => update());
  });
}

// Optimize React re-renders
export function shouldComponentUpdate<T extends Record<string, any>>(
  prevProps: T,
  nextProps: T,
  keys?: (keyof T)[]
): boolean {
  const propsToCheck = keys || Object.keys(nextProps) as (keyof T)[];
  
  return propsToCheck.some(key => prevProps[key] !== nextProps[key]);
}

// Initialize all optimizations
export function initializePerformanceOptimizations() {
  // Run immediately
  preconnectCriticalOrigins();
  dnsPrefetch();
  
  // Run when DOM is ready
      if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      optimizeImageLoading();
      deferNonCriticalScripts();
    });
  } else {
    optimizeImageLoading();
    deferNonCriticalScripts();
  }
  
  // Run when page is loaded
  window.addEventListener('load', () => {
    requestIdleCallback(() => {
      measurePerformance();
    });
  });
}


