/**
 * Component Preloader Utility
 * 
 * Provides hover-based preloading for lazy-loaded components to improve
 * perceived performance and reduce loading delays.
 */

import { ComponentType } from 'react';

// ============================================================================
// Types
// ============================================================================

type LazyComponent = () => Promise<{ default: ComponentType<any> }>;

// ============================================================================
// Preload Cache
// ============================================================================

const preloadCache = new Set<LazyComponent>();

// ============================================================================
// Preload Function
// ============================================================================

/**
 * Preload a lazy-loaded component
 * @param componentLoader - The lazy component loader function
 * @returns Promise that resolves when component is loaded
 */
export function preloadComponent(componentLoader: LazyComponent): Promise<void> {
  // Check if already preloaded
  if (preloadCache.has(componentLoader)) {
    return Promise.resolve();
  }

  // Mark as preloaded to prevent duplicate requests
  preloadCache.add(componentLoader);

  // Trigger the dynamic import
  return componentLoader()
    .then(() => {
      console.log('[Preloader] Component preloaded successfully');
    })
    .catch((error) => {
      console.error('[Preloader] Failed to preload component:', error);
      // Remove from cache on failure to allow retry
      preloadCache.delete(componentLoader);
    });
}

/**
 * Check if a component has been preloaded
 */
export function isPreloaded(componentLoader: LazyComponent): boolean {
  return preloadCache.has(componentLoader);
}

/**
 * Clear preload cache (useful for testing)
 */
export function clearPreloadCache(): void {
  preloadCache.clear();
}

// ============================================================================
// React Hook for Preloading
// ============================================================================

/**
 * Create hover handler that preloads a component
 * @param componentLoader - The lazy component loader function
 * @returns Hover event handler
 */
export function createPreloadHandler(componentLoader: LazyComponent) {
  let preloadTimeout: NodeJS.Timeout | null = null;

  return {
    onMouseEnter: () => {
      // Debounce preload by 100ms to avoid unnecessary loads on quick hovers
      preloadTimeout = setTimeout(() => {
        preloadComponent(componentLoader);
      }, 100);
    },
    onMouseLeave: () => {
      // Cancel preload if user moves away quickly
      if (preloadTimeout) {
        clearTimeout(preloadTimeout);
        preloadTimeout = null;
      }
    },
    onFocus: () => {
      // Also preload on focus for keyboard navigation
      preloadComponent(componentLoader);
    },
  };
}

// ============================================================================
// Preload on Intersection (for predictive loading)
// ============================================================================

/**
 * Preload component when element enters viewport
 * @param componentLoader - The lazy component loader function
 * @param options - IntersectionObserver options
 */
export function preloadOnIntersection(
  componentLoader: LazyComponent,
  element: Element | null,
  options: IntersectionObserverInit = { rootMargin: '50px' }
): () => void {
  if (!element || typeof IntersectionObserver === 'undefined') {
    return () => {};
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        preloadComponent(componentLoader);
        // Unobserve after preload
        observer.unobserve(entry.target);
      }
    });
  }, options);

  observer.observe(element);

  // Return cleanup function
  return () => {
    observer.disconnect();
  };
}

// ============================================================================
// Batch Preloading
// ============================================================================

/**
 * Preload multiple components in sequence
 * @param componentLoaders - Array of lazy component loaders
 * @param delay - Delay between preloads (ms)
 */
export async function preloadComponents(
  componentLoaders: LazyComponent[],
  delay: number = 50
): Promise<void> {
  for (const loader of componentLoaders) {
    await preloadComponent(loader);
    // Small delay to avoid blocking main thread
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Preload components after initial render (idle time)
 * @param componentLoaders - Array of lazy component loaders
 */
export function preloadOnIdle(componentLoaders: LazyComponent[]): void {
  // Use requestIdleCallback if available
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => {
      preloadComponents(componentLoaders, 100);
    });
  } else {
    // Fallback to setTimeout with longer delay
    setTimeout(() => {
      preloadComponents(componentLoaders, 100);
    }, 2000);
  }
}

// ============================================================================
// Export
// ============================================================================

export default {
  preloadComponent,
  isPreloaded,
  clearPreloadCache,
  createPreloadHandler,
  preloadOnIntersection,
  preloadComponents,
  preloadOnIdle,
};
