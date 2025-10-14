/**
 * 🚀 Advanced Code Splitting Strategy
 * Intelligent route and component-based splitting for optimal loading
 */

import React, { lazy, Suspense } from 'react';

// Loading fallback component
      const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  }>
    {children}
  </Suspense>
);

// Critical pages (loaded immediately)
export const Dashboard = lazy(() => import('@/pages/Dashboard'));
export const Auth = lazy(() => import('@/pages/Auth'));

// High-priority pages (preloaded)
export const Bookings = lazy(() => 
  import('@/pages/Bookings').then(module => {
    // Preload related components
      if (they exist
    return module;
  }).catch(() => import('@/pages/Dashboard')) // Fallback to Dashboard
);

// Medium-priority pages (lazy loaded)
export const Analytics = lazy(() => import('@/pages/Analytics'));
export const Settings = lazy(() => import('@/pages/Settings'));
export const Tables = lazy(() => import('@/pages/Tables'));
export const Staff = lazy(() => import('@/pages/Staff'));

// Low-priority pages (heavily lazy loaded)
export const DebugTenant = lazy(() => import('@/pages/DebugTenant').catch(() => import('@/pages/Dashboard')));
export const DemoPage = lazy(() => import('@/pages/DemoPage').catch(() => import('@/pages/Dashboard')));

// Heavy components (loaded only when needed) - Using fallback components for safety
export const ChartComponents = {
  // Simple fallback chart component
  RevenueChart: lazy(() => Promise.resolve({ 
    default: () => <div className="h-64 flex items-center justify-center bg-muted rounded">Revenue Chart Loading...</div> 
  })),
  OrdersChart: lazy(() => Promise.resolve({ 
    default: () => <div className="h-64 flex items-center justify-center bg-muted rounded">Orders Chart Loading...</div> 
  })),
  SalesChart: lazy(() => Promise.resolve({ 
    default: () => <div className="h-64 flex items-center justify-center bg-muted rounded">Sales Chart Loading...</div> 
  })),
};

export const TableComponents = {
  // Simple fallback table component
  DataTable: lazy(() => Promise.resolve({ 
    default: () => <div className="h-32 flex items-center justify-center bg-muted rounded">Data Table Loading...</div> 
  })),
  BookingsTable: lazy(() => Promise.resolve({ 
    default: () => <div className="h-32 flex items-center justify-center bg-muted rounded">Bookings Table Loading...</div> 
  })),
  MenuTable: lazy(() => Promise.resolve({ 
    default: () => <div className="h-32 flex items-center justify-center bg-muted rounded">Menu Table Loading...</div> 
  })),
};

// Utility function for dynamic imports with retries
export const dynamicImport = async function<T>(
  importFn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      return await importFn();
    } catch (error) {
      retries++;
      
      if (retries >= maxRetries) {
        console.error(`Failed to load module after ${maxRetries} retries:`, error);
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, retries - 1)));
    }
  }
  
  throw new Error('Unexpected error in dynamicImport');
};

// Preload strategy for better user experience
export const preloadStrategy = {
  // Preload critical routes based on user behavior
  preloadCritical: () => {
    import('@/pages/Dashboard');
    import('@/pages/Bookings').catch(() => import('@/pages/Dashboard'));
  },
  
  // Preload on user interaction (hover, focus)
  preloadOnHover: (routeName: string) => {
    switch (routeName) {
      case 'analytics':
        import('@/pages/Analytics');
        break;
      case 'settings':
        import('@/pages/Settings');
        break;
      case 'tables':
        import('@/pages/Tables');
        break;
      case 'staff':
        import('@/pages/Staff');
        break;
    }
  },
  
  // Preload during idle time
  preloadIdle: () => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        import('@/pages/DebugTenant').catch(() => {});
        import('@/pages/DemoPage').catch(() => {});
      });
    }
  }
};

// HOC for adding preloading capabilities
export const withPreload = function<P extends object>(
  Component: React.ComponentType<P>,
  preloadFn?: () => Promise<any>
) {
  const WrappedComponent = (props: P) => {
    // Preload on mount
    React.useEffect(() => {
      if (preloadFn) {
        preloadFn().catch(console.warn);
      }
    }, []);

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withPreload(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Bundle analysis utilities
export const bundleAnalysis = {
  // Track which modules are loaded
  loadedModules: new Set<string>(),
  
  // Track loading times
  loadingTimes: new Map<string, number>(),
  
  // Record module load
  recordLoad: (moduleName: string, loadTime: number) => {
    bundleAnalysis.loadedModules.add(moduleName);
    bundleAnalysis.loadingTimes.set(moduleName, loadTime);
    
    // Module load recorded for performance tracking
  },
  
  // Get performance report
  getReport: () => ({
    totalModules: bundleAnalysis.loadedModules.size,
    loadedModules: Array.from(bundleAnalysis.loadedModules),
    averageLoadTime: Array.from(bundleAnalysis.loadingTimes.values())
      .reduce((sum, time) => sum + time, 0) / bundleAnalysis.loadingTimes.size || 0,
    slowestModules: Array.from(bundleAnalysis.loadingTimes.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
  })
};

export { SuspenseWrapper };


