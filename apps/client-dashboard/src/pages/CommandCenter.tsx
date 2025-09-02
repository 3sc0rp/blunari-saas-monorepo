import React, { Suspense, lazy, memo, useCallback, useMemo, Component, ReactNode, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Activity, TrendingUp, Users, Clock, Square, Wifi, WifiOff, RefreshCw, Zap } from "lucide-react";
import { useRealtimeCommandCenter } from "@/hooks/useRealtimeCommandCenter";
import { RealtimeCommandCenterProvider } from "@/contexts/RealtimeCommandCenterContext";
import { useHeartbeat } from "@/hooks/useHeartbeat";
import { Badge } from "@/components/ui/badge";

// Enhanced lazy loading with better error handling and component tracking
const createLazyComponent = (
  importFn: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>,
  componentName: string,
  FallbackIcon?: React.ComponentType<{ className?: string }>
) => {
  return lazy(() => 
    importFn().catch((error) => {
      console.error(`Failed to load component: ${componentName}`, error);
      
      // Log to performance monitoring (in production you might use DataDog, Sentry, etc.)
      if (typeof window !== 'undefined' && window.performance) {
        performance.mark(`component-load-error-${componentName}`);
      }
      
      return {
        default: () => (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            {FallbackIcon && <FallbackIcon className="w-8 h-8 text-slate-400 mb-2" />}
            <p className="text-sm text-slate-600 mb-1">
              {componentName} temporarily unavailable
            </p>
            <p className="text-xs text-slate-500">
              Component failed to load
            </p>
          </div>
        )
      };
    })
  );
};

// Type-safe dynamic import wrapper with enhanced error handling
const createSafeImport = (modulePath: string) => {
  return async () => {
    try {
      const startTime = performance.now();
      // Use /* @vite-ignore */ to suppress Vite warning
      const module = await import(/* @vite-ignore */ modulePath);
      const loadTime = performance.now() - startTime;
      
      // Log successful loads in development
      if (process.env.NODE_ENV === 'development') {
        console.debug(`✅ Loaded ${modulePath} in ${loadTime.toFixed(2)}ms`);
      }
      
      return module;
    } catch (error) {
      console.error(`❌ Failed to import module: ${modulePath}`, error);
      
      // Log error to performance monitoring
      if (typeof window !== 'undefined' && window.performance) {
        performance.mark(`import-error-${modulePath.split('/').pop()}`);
      }
      
      throw error;
    }
  };
};

// Lazy load Command Center components with enhanced error handling
const KpiBar = createLazyComponent(
  createSafeImport("@/components/command-center/KpiBar"),
  "KPI Bar",
  TrendingUp
);
const Timeline = createLazyComponent(
  createSafeImport("@/components/command-center/Timeline"),
  "Timeline", 
  Clock
);
const FloorMap = createLazyComponent(
  createSafeImport("@/components/command-center/FloorMap"),
  "Floor Map",
  Square
);
const Waitlist = createLazyComponent(
  createSafeImport("@/components/command-center/Waitlist"),
  "Waitlist",
  Users
);
const DetailsDrawer = createLazyComponent(
  createSafeImport("@/components/command-center/DetailsDrawer"),
  "Details Drawer",
  Activity
);
const QuickActions = createLazyComponent(
  createSafeImport("@/components/command-center/QuickActions"),
  "Quick Actions",
  Activity
);
const OnboardingTour = lazy(() => 
  createSafeImport("@/components/command-center/OnboardingTour")().catch((error) => {
    console.debug("OnboardingTour failed to load:", error);
    return { default: () => null };
  })
);

// Enhanced skeleton components with better visual feedback
const SkeletonCard = memo(({ className, icon: Icon }: { 
  className?: string; 
  icon?: React.ComponentType<{ className?: string }> 
}) => (
  <div className={`bg-slate-100 animate-pulse rounded-lg flex items-center justify-center ${className}`}>
    {Icon && <Icon className="w-6 h-6 text-slate-400" />}
  </div>
));

const LoadingSpinner = memo(({ size = 8, className }: { 
  size?: number; 
  className?: string 
}) => {
  // Use explicit size classes to ensure Tailwind includes them in the build
  const sizeClass = useMemo(() => {
    switch(size) {
      case 4: return 'w-4 h-4';
      case 6: return 'w-6 h-6';
      case 8: return 'w-8 h-8';
      case 10: return 'w-10 h-10';
      default: return 'w-8 h-8';
    }
  }, [size]);

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 className={`${sizeClass} animate-spin text-slate-600`} />
    </div>
  );
});

// Error fallback component
const ErrorFallback = memo(({ error, resetError }: { 
  error: Error; 
  resetError: () => void 
}) => (
  <div className="flex flex-col items-center justify-center h-32 text-center">
    <Activity className="w-8 h-8 text-slate-400 mb-2" />
    <p className="text-sm text-slate-600 mb-2">Something went wrong</p>
    <button 
      onClick={resetError}
      className="px-3 py-1 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
    >
      Try again
    </button>
  </div>
));

// Enhanced Error Boundary with retry count and recovery strategies
class ErrorBoundary extends Component<
  { 
    children: ReactNode; 
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: { componentStack: string }) => void;
    maxRetries?: number;
    resetKeys?: Array<string | number | boolean>;
  },
  { 
    hasError: boolean; 
    error?: Error; 
    retryCount: number;
    lastResetKeys?: Array<string | number | boolean>;
  }
> {
  constructor(props: { 
    children: ReactNode; 
    fallback?: ReactNode; 
    onError?: (error: Error, errorInfo: { componentStack: string }) => void;
    maxRetries?: number;
    resetKeys?: Array<string | number | boolean>;
  }) {
    super(props);
    this.state = { 
      hasError: false, 
      retryCount: 0,
      lastResetKeys: props.resetKeys
    };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  static getDerivedStateFromProps(
    props: { resetKeys?: Array<string | number | boolean> },
    state: { lastResetKeys?: Array<string | number | boolean>; hasError: boolean }
  ) {
    // Auto-reset when resetKeys change
    if (state.hasError && 
        props.resetKeys && 
        state.lastResetKeys &&
        !props.resetKeys.every((key, i) => key === state.lastResetKeys?.[i])) {
      return {
        hasError: false,
        error: undefined,
        retryCount: 0,
        lastResetKeys: props.resetKeys
      };
    }
    return { lastResetKeys: props.resetKeys };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    const maxRetries = this.props.maxRetries || 3;
    if (this.state.retryCount < maxRetries) {
      this.setState(prevState => ({ 
        hasError: false, 
        error: undefined,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  render() {
    if (this.state.hasError) {
      const canRetry = this.state.retryCount < (this.props.maxRetries || 3);
      
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <Activity className="w-8 h-8 text-slate-400 mb-2" />
          <p className="text-sm text-slate-600 mb-2">Something went wrong</p>
          <div className="flex gap-2">
            {canRetry && (
              <button 
                onClick={this.handleRetry}
                className="px-3 py-1 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
              >
                Try again ({this.state.retryCount + 1}/{this.props.maxRetries || 3})
              </button>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="px-3 py-1 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const CommandCenter: React.FC = memo(() => {
  // Real-time data hook
  const {
    bookings,
    tables,
    waitlist,
    metrics,
    isLoading: realtimeLoading,
    error: realtimeError,
    connectionStatus,
    isConnected,
    allConnected,
    lastUpdate,
    refreshData,
  } = useRealtimeCommandCenter();

  // State for performance monitoring and error recovery
  const [componentLoadStatus, setComponentLoadStatus] = React.useState<Record<string, 'loading' | 'loaded' | 'error'>>({});
  const [resetKey, setResetKey] = React.useState(0);
  const [loadingMetrics, setLoadingMetrics] = React.useState<Record<string, number>>({});
  
  // Auto-refresh timer state
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshTimer, setRefreshTimer] = useState<number | null>(null);
  
  // Heartbeat indicator
  const pulse = useHeartbeat(allConnected, 2000);
  
  // Track component loading performance
  const trackComponentLoad = useCallback((componentName: string, startTime: number) => {
    const loadTime = Date.now() - startTime;
    setLoadingMetrics(prev => ({
      ...prev,
      [componentName]: loadTime
    }));
    
    // Log slow loading components
    if (loadTime > 1000) {
      console.warn(`Slow component load: ${componentName} took ${loadTime}ms`);
    }
  }, []);
  
  // Memoized animation configurations
  const animations = useMemo(() => ({
    timeline: { opacity: 0, x: -20 },
    floorMap: { opacity: 0, x: 20 },
    waitlist: { opacity: 0, x: 20 }
  }), []);

  const animateProps = useMemo(() => ({
    opacity: 1,
    x: 0
  }), []);

  // Enhanced error handler with component tracking and performance metrics
  const handleError = useCallback((error: Error, errorInfo: { componentStack: string }) => {
    console.error('CommandCenter Error:', error, errorInfo);
    
    // Extract component name from error info if possible
    const componentMatch = errorInfo.componentStack.match(/at (\w+)/);
    const componentName = componentMatch?.[1] || 'Unknown';
    
    setComponentLoadStatus(prev => ({
      ...prev,
      [componentName]: 'error'
    }));
    
    // Track error rate for monitoring
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark(`error-${componentName}-${Date.now()}`);
    }
    
    // In production, you might want to log this to your error tracking service
    // Example: errorTracker.captureException(error, { 
    //   extra: { ...errorInfo, currentMetrics: loadingMetrics, componentStatus: componentLoadStatus }
    // });
  }, [loadingMetrics, componentLoadStatus]);

  const handleGlobalReset = useCallback(() => {
    setResetKey(prev => prev + 1);
    setComponentLoadStatus({});
    setLoadingMetrics({});
  }, []);

  // Development mode: Log performance metrics
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development' && Object.keys(loadingMetrics).length > 0) {
      console.group('🚀 Component Loading Performance');
      Object.entries(loadingMetrics).forEach(([component, time]) => {
        const status = time > 1000 ? '🐌 SLOW' : time > 500 ? '⚠️  MODERATE' : '✅ FAST';
        console.log(`${status} ${component}: ${time}ms`);
      });
      console.groupEnd();
    }
  }, [loadingMetrics]);

  const resetError = useCallback(() => {
    handleGlobalReset();
  }, [handleGlobalReset]);

  // Enhanced preloading with cleanup, error handling, and performance tracking
  React.useEffect(() => {
    let mounted = true;
    
    // Preload non-critical components with performance tracking
    const timer = setTimeout(async () => {
      if (!mounted) return;
      
      try {
        const startTime = Date.now();
        
        // Preload components that might be needed soon
        const preloadPromises = [
          {
            name: 'DetailsDrawer',
            promise: createSafeImport("@/components/command-center/DetailsDrawer")()
          },
          {
            name: 'OnboardingTour', 
            promise: createSafeImport("@/components/command-center/OnboardingTour")()
          }
        ].map(async ({ name, promise }) => {
          const componentStart = Date.now();
          try {
            await promise;
            trackComponentLoad(`preload-${name}`, componentStart);
            setComponentLoadStatus(prev => ({ ...prev, [name]: 'loaded' }));
          } catch (error) {
            console.debug(`Preloading failed for ${name}:`, error);
            setComponentLoadStatus(prev => ({ ...prev, [name]: 'error' }));
          }
        });
        
        await Promise.allSettled(preloadPromises);
        
        const totalTime = Date.now() - startTime;
        console.debug(`Component preloading completed in ${totalTime}ms`);
        
      } catch (error) {
        console.debug("Component preloading failed:", error);
      }
    }, 1000);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [trackComponentLoad]);
  return (
    <ErrorBoundary 
      key={resetKey}
      onError={handleError}
      maxRetries={3}
      resetKeys={[resetKey]}
      fallback={
        <div className="flex flex-col items-center justify-center h-full">
          <Activity className="w-12 h-12 text-slate-400 mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Command Center Unavailable</h2>
          <p className="text-sm text-slate-600 mb-4">We're having trouble loading the dashboard</p>
          <button
            onClick={handleGlobalReset}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Reload Dashboard
          </button>
        </div>
      }
    >
      <div className="h-full flex flex-col bg-slate-50" role="main" aria-label="Command Center Dashboard">
        {/* Onboarding Tour */}
        <ErrorBoundary fallback={null} resetKeys={[resetKey]}>
          <Suspense fallback={null}>
            <OnboardingTour />
          </Suspense>
        </ErrorBoundary>

        {/* Header with Quick Actions */}
        <header className="flex-shrink-0 border-b border-slate-200 bg-white">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Command Center</h1>
                  <p className="text-sm text-slate-600">Live operations dashboard</p>
                </div>

                {/* Real-time Status Indicator */}
                <div className="flex items-center gap-2">
                  <AnimatePresence mode="wait">
                    {allConnected ? (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <div className="relative">
                          <Wifi className="w-4 h-4 text-emerald-500" />
                          {pulse && (
                            <motion.div
                              initial={{ scale: 0, opacity: 1 }}
                              animate={{ scale: 2, opacity: 0 }}
                              transition={{ duration: 0.6 }}
                              className="absolute inset-0 bg-emerald-400 rounded-full"
                            />
                          )}
                        </div>
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          <Zap className="w-3 h-3 mr-1" />
                          Live
                        </Badge>
                      </motion.div>
                    ) : isConnected ? (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <Wifi className="w-4 h-4 text-amber-500 animate-pulse" />
                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                          Connecting...
                        </Badge>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <WifiOff className="w-4 h-4 text-slate-400" />
                        <Badge variant="outline" className="text-slate-600">
                          Offline
                        </Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <button
                    onClick={refreshData}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Refresh data"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  <div className="text-xs text-slate-500">
                    Last updated: {lastUpdate.toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <ErrorBoundary 
                fallback={<SkeletonCard className="w-64 h-10" />} 
                resetKeys={[resetKey]}
              >
                <Suspense fallback={<SkeletonCard className="w-64 h-10" icon={Activity} />}>
                  <QuickActions />
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>

          {/* KPI Bar */}
          <div className="px-6 pb-4">
            <ErrorBoundary 
              fallback={<SkeletonCard className="w-full h-16" />} 
              resetKeys={[resetKey]}
            >
              <Suspense fallback={<SkeletonCard className="w-full h-16" icon={TrendingUp} />}>
                <KpiBar />
              </Suspense>
            </ErrorBoundary>
          </div>
        </header>

        {/* Main Content Grid */}
        <main className="flex-1 p-6 min-h-0" role="main">
          <div className="h-full grid grid-cols-12 gap-6">
            {/* Left Column - Timeline (7 columns) */}
            <section className="col-span-12 lg:col-span-7 flex flex-col min-h-0" aria-labelledby="timeline-header">
              <motion.div 
                className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm min-h-0"
                initial={animations.timeline}
                animate={animateProps}
                transition={{ delay: 0.1 }}
                data-tour="timeline"
              >
                <div className="h-full flex flex-col">
                  <div className="flex-shrink-0 p-4 border-b border-slate-200">
                    <h2 id="timeline-header" className="text-lg font-semibold text-slate-900">Timeline</h2>
                    <p className="text-sm text-slate-600">Today's reservations and table status</p>
                  </div>
                  <div className="flex-1 min-h-0">
                    <ErrorBoundary 
                      maxRetries={2} 
                      resetKeys={[resetKey]}
                      fallback={
                        <div className="flex flex-col items-center justify-center h-full" role="alert">
                          <Clock className="w-8 h-8 text-slate-400 mb-2" aria-hidden="true" />
                          <p className="text-sm text-slate-600">Timeline temporarily unavailable</p>
                        </div>
                      }
                    >
                      <Suspense fallback={<LoadingSpinner className="h-full" />}>
                        <Timeline />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                </div>
              </motion.div>
            </section>

            {/* Right Column - Floor Map, Waitlist, Details (5 columns) */}
            <div className="col-span-12 lg:col-span-5 flex flex-col gap-6 min-h-0">
              {/* Floor Map */}
              <motion.div 
                className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[300px] flex-1"
                initial={animations.floorMap}
                animate={animateProps}
                transition={{ delay: 0.2 }}
                data-tour="floor-map"
              >
                <div className="h-full flex flex-col">
                  <div className="flex-shrink-0 p-4 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">Floor Plan</h2>
                    <p className="text-sm text-slate-600">Interactive table layout</p>
                  </div>
                  <div className="flex-1 min-h-0 p-4">
                    <ErrorBoundary 
                    maxRetries={2} 
                    resetKeys={[resetKey]}
                    fallback={
                      <div className="flex flex-col items-center justify-center h-full">
                        <Square className="w-8 h-8 text-slate-400 mb-2" />
                        <p className="text-sm text-slate-600">Floor map temporarily unavailable</p>
                      </div>
                    }
                  >
                      <Suspense fallback={<LoadingSpinner size={6} className="h-full" />}>
                        <FloorMap />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                </div>
              </motion.div>

              {/* Waitlist */}
              <motion.div 
                className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[200px] flex-1"
                initial={animations.waitlist}
                animate={animateProps}
                transition={{ delay: 0.3 }}
                data-tour="waitlist"
              >
                <div className="h-full flex flex-col">
                  <div className="flex-shrink-0 p-4 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">Waitlist</h2>
                    <p className="text-sm text-slate-600">Current waiting guests</p>
                  </div>
                  <div className="flex-1 min-h-0">
                    <ErrorBoundary 
                    maxRetries={2} 
                    resetKeys={[resetKey]}
                    fallback={
                      <div className="flex flex-col items-center justify-center h-full">
                        <Users className="w-8 h-8 text-slate-400 mb-2" />
                        <p className="text-sm text-slate-600">Waitlist temporarily unavailable</p>
                      </div>
                    }
                  >
                      <Suspense fallback={<LoadingSpinner size={6} className="h-full" />}>
                        <Waitlist />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </main>

        {/* Details Drawer - Rendered conditionally based on selection */}
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <DetailsDrawer />
          </Suspense>
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
});

// Set display names for better debugging
SkeletonCard.displayName = 'SkeletonCard';
LoadingSpinner.displayName = 'LoadingSpinner'; 
ErrorFallback.displayName = 'ErrorFallback';
CommandCenter.displayName = 'CommandCenter';

// Main export with real-time provider
const RealtimeCommandCenter: React.FC = () => {
  return (
    <RealtimeCommandCenterProvider>
      <CommandCenter />
    </RealtimeCommandCenterProvider>
  );
};

RealtimeCommandCenter.displayName = 'RealtimeCommandCenter';

export default RealtimeCommandCenter;
