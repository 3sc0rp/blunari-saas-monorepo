// Performance utilities for better UX

// Preload critical resources
export const preloadResource = (href: string, as: string, type?: string) => {
  const link = document.createElement("link");
  link.rel = "preload";
  link.href = href;
  link.as = as;
  if (type) link.type = type;
  document.head.appendChild(link);
};

// Preload images
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

// Check if user prefers reduced motion
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

// Measure performance metrics
export const measurePerformance = (name: string, fn: () => void) => {
  if (typeof window !== 'undefined' && "performance" in window) {
    performance.mark(`${name}-start`);
    fn();
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
  } else {
    fn();
  }
};

// Optimize for first contentful paint
export const optimizeFCP = () => {
  // Preload critical fonts
  preloadResource(
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
    "style",
  );

  // Preload critical images if any
  const criticalImages = ["/placeholder.svg"];

  criticalImages.forEach((src) => {
    preloadImage(src).catch(() => {
      // Silent fail for image preloading
    });
  });
};

// Defer non-critical resources
export const deferResource = (callback: () => void, delay = 100) => {
  if (typeof window !== 'undefined' && "requestIdleCallback" in window) {
    requestIdleCallback(callback);
  } else {
    setTimeout(callback, delay);
  }
};

// Layout shift prevention
export const reserveSpace = (width: number, height: number) => ({
  width: `${width}px`,
  height: `${height}px`,
  minHeight: `${height}px`,
});

// Cache management for better performance
class SimpleCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  private ttl: number;

  constructor(ttlMinutes = 5) {
    this.ttl = ttlMinutes * 60 * 1000;
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const createCache = <T>(ttlMinutes?: number) =>
  new SimpleCache<T>(ttlMinutes);

// Run performance optimizations on page load
export const initializePerformance = () => {
  // Ensure we're on the client side
  if (typeof window === 'undefined') return;
  
  // Optimize FCP
  optimizeFCP();

  // Set up intersection observer for lazy loading
  if ("IntersectionObserver" in window) {
    const lazyImages = document.querySelectorAll("img[data-lazy]");
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = img.dataset.lazy || "";
          img.classList.remove("lazy");
          imageObserver.unobserve(img);
        }
      });
    });

    lazyImages.forEach((img) => imageObserver.observe(img));
  }

  // Prefetch likely next pages
  deferResource(() => {
    const criticalRoutes = ["/dashboard/bookings", "/dashboard/analytics"];
    criticalRoutes.forEach((route) => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = route;
      document.head.appendChild(link);
    });
  }, 2000);
};
