import React, { Suspense, lazy, useEffect, useMemo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantBrandingProvider } from "@/contexts/TenantBrandingContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { FullscreenProvider } from "@/contexts/FullscreenContext";
import { ModeProvider } from "@/lib/ui-mode";
import { registerRoutePrefetch, prefetchRoute } from "@/lib/prefetch";
import { ModeTransitionProvider } from "@/contexts/ModeTransitionContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import DataFlowDebugger from "@/components/debug/DataFlowDebugger";
import DataAuditor from "@/components/debug/DataAuditor";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import { connectionManager } from "@/utils/supabaseConnection";
import { useMemoryCleanup, usePerformanceMonitoring, useBundleMonitoring } from "@/hooks/usePerformance";
import LazyLoadingFallback, { 
  TableLoadingFallback, 
  AnalyticsLoadingFallback, 
  DashboardLoadingFallback 
} from "@/components/LazyLoadingFallback";
import { WebVitalsMonitor } from "@/components/WebVitalsMonitor";

// Immediate load components (small, essential)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
// Lazy load Bookings to avoid double import warning and reduce initial bundle
const Bookings = lazy(() => import(/* webpackChunkName: "bookings" */ "./pages/BookingsTabbed"));
const BookingTracking = lazy(() => import(/* webpackChunkName: "booking-tracking" */ "./pages/BookingTracking"));
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
// Removed unused BookingPage import
// 3D feature removed

// Lazy load heavy components with prefetch hints
const Analytics = lazy(() => import(/* webpackChunkName: "analytics" */ "./pages/Analytics"));
const Tables = lazy(() => import(/* webpackChunkName: "tables" */ "./pages/Tables"));
const CommandCenter = lazy(() => import(/* webpackChunkName: "command-center" */ "./pages/CommandCenter"));
const TestWidget = lazy(() => import(/* webpackChunkName: "test-widget" */ "./pages/test-widget"));
const WaitlistManagement = lazy(() => 
  import(/* webpackChunkName: "waitlist" */ "./pages/WaitlistManagement")
);
const CustomerProfiles = lazy(() => import(/* webpackChunkName: "customers" */ "./pages/CustomerProfiles"));
const Catering = lazy(() => import(/* webpackChunkName: "catering" */ "./pages/Catering"));
const CateringManagement = lazy(() => import(/* webpackChunkName: "catering-management" */ "./pages/CateringManagement"));
const CateringOrderTracking = lazy(() => import(/* webpackChunkName: "catering-tracking" */ "./pages/CateringOrderTracking"));
const Messages = lazy(() => import(/* webpackChunkName: "messages" */ "./pages/Messages"));
const StaffManagement = lazy(() => import(/* webpackChunkName: "staff" */ "./pages/StaffManagement"));
const InventoryManagement = lazy(() => import(/* webpackChunkName: "inventory" */ "./pages/InventoryManagement"));
const AIBusinessInsights = lazy(() => import(/* webpackChunkName: "ai-insights" */ "./pages/AIBusinessInsights"));
const WidgetManagement = lazy(() => import(/* webpackChunkName: "widgets" */ "./pages/WidgetManagement"));
const DashboardHome = lazy(() => import(/* webpackChunkName: "dashboard-home" */ "./pages/DashboardHome"));

// Marketplace pages (consumer-facing)
const RestaurantDiscoveryPage = lazy(() => import(/* webpackChunkName: "discovery" */ "./pages/RestaurantDiscoveryPage"));
const RestaurantProfilePage = lazy(() => import(/* webpackChunkName: "restaurant-profile" */ "./pages/RestaurantProfilePage"));

// Optimized QueryClient with inline configuration to prevent module loading issues
// Lazy initialization ensures React is fully loaded before QueryClient is created
let queryClientInstance: QueryClient | null = null;

const getQueryClient = () => {
  if (!queryClientInstance) {
    queryClientInstance = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 0, // Always fresh by default
          gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
          refetchOnWindowFocus: true,
          refetchOnReconnect: true,
          refetchOnMount: true,
          retry: 2,
          retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
          networkMode: 'online' as const,
          meta: {
            errorMessage: 'Failed to fetch data',
          },
        },
        mutations: {
          retry: 1,
          retryDelay: 1000,
          networkMode: 'online' as const,
        },
      },
    });
  }
  return queryClientInstance;
};

// Local component to safely run router-dependent hooks after BrowserRouter context exists
function RouterInstrumentation() {
  useMemoryCleanup();
  usePerformanceMonitoring('App');
  useBundleMonitoring();
  return null;
}

// Removed legacy public widget routes (/book and /catering).

function App() {
  if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
    if (import.meta.env.DEV) console.log('🎯 App component rendering with full providers...');
  }
  // Remove direct calls to router-dependent hooks here (now inside RouterInstrumentation)
  useEffect(() => {
    connectionManager.ensureConnection();
    // Lightweight prefetch of most-likely next routes
    try {
      registerRoutePrefetch('/dashboard/tables', () => import('./pages/Tables'));
      registerRoutePrefetch('/dashboard/analytics', () => import('./pages/Analytics'));
      registerRoutePrefetch('/dashboard/bookings', () => import('./pages/Bookings'));
      registerRoutePrefetch('/dashboard/widget-management', () => import('./pages/WidgetManagement'));
      // Prefetch one or two on idle
      setTimeout(() => {
        prefetchRoute('/dashboard/tables');
        prefetchRoute('/dashboard/analytics');
      }, 300);
    } catch (error) {
      console.error('Failed to register route prefetch:', error);
      // Non-critical - app will work without prefetching
    }
  }, []);
  
  const queryClient = useMemo(() => getQueryClient(), []);
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <RouterInstrumentation />
            {/* Public widget routes are served by a separate entry (widget-main). */}
            <TenantBrandingProvider>
              <AuthProvider>
                <ModeProvider>
                  <ModeTransitionProvider>
                    <NavigationProvider>
                      <FullscreenProvider>
                        <TooltipProvider>
                        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
                          <ScrollToTop />
                          <Routes>
                            {/* Non-protected routes with minimal loading */}
                            <Route path="/" element={<Index />} />
                            <Route path="/auth/*" element={<Auth />} />
                            
                            {/* Public marketplace routes */}
                            <Route path="/discover" element={
                              <Suspense fallback={<LazyLoadingFallback component="Restaurant Discovery" />}>
                                <RestaurantDiscoveryPage />
                              </Suspense>
                            } />
                            <Route path="/restaurant/:slug" element={
                              <Suspense fallback={<LazyLoadingFallback component="Restaurant Profile" />}>
                                <RestaurantProfilePage />
                              </Suspense>
                            } />
                            
                            {/* Public order/booking tracking */}
                            <Route path="/booking/:bookingId" element={
                              <Suspense fallback={<LazyLoadingFallback component="Booking Tracking" />}>
                                <BookingTracking />
                              </Suspense>
                            } />
                            <Route path="/catering-order/:orderId" element={
                              <Suspense fallback={<LazyLoadingFallback component="Order Tracking" />}>
                                <CateringOrderTracking />
                              </Suspense>
                            } />
                            
                            {/* Protected dashboard routes with optimized Suspense */}
                            <Route 
                              path="/dashboard/*" 
                              element={
                                <ProtectedRoute>
                                  <DashboardLayout />
                                </ProtectedRoute>
                              } 
                            >
                              {/* Immediate load routes */}
                              <Route index element={<Dashboard />} />
                              <Route path="bookings" element={<Bookings />} />
                              <Route path="settings" element={<Settings />} />
                              {/* Client 3D management removed */}
                              
                              {/* Lazy loaded routes with specific fallbacks */}
                              <Route path="home" element={
                                <Suspense fallback={<DashboardLoadingFallback />}>
                                  <DashboardHome />
                                </Suspense>
                              } />
                              
                              <Route path="tables" element={
                                <Suspense fallback={<TableLoadingFallback />}>
                                  <Tables />
                                </Suspense>
                              } />
                              
                              <Route path="analytics" element={
                                <Suspense fallback={<AnalyticsLoadingFallback />}>
                                  <Analytics />
                                </Suspense>
                              } />
                              
                              <Route path="ai-business-insights" element={
                                <Suspense fallback={<AnalyticsLoadingFallback />}>
                                  <AIBusinessInsights />
                                </Suspense>
                              } />
                              
                              {/* Standard lazy loaded routes */}
                              <Route path="waitlist-management" element={
                                <Suspense fallback={<LazyLoadingFallback component="Waitlist Management" />}>
                                  <WaitlistManagement />
                                </Suspense>
                              } />
                              
                              <Route path="customers" element={
                                <Suspense fallback={<LazyLoadingFallback component="Customer Profiles" />}>
                                  <CustomerProfiles />
                                </Suspense>
                              } />
                              
                              <Route path="catering" element={
                                <Suspense fallback={<LazyLoadingFallback component="Catering Management" />}>
                                  <CateringManagement />
                                </Suspense>
                              } />
                              
                              <Route path="messages" element={
                                <Suspense fallback={<LazyLoadingFallback component="Messages" />}>
                                  <Messages />
                                </Suspense>
                              } />
                              
                              <Route path="staff-management" element={
                                <Suspense fallback={<LazyLoadingFallback component="Staff Management" />}>
                                  <StaffManagement />
                                </Suspense>
                              } />
                              
                              <Route path="inventory-management" element={
                                <Suspense fallback={<LazyLoadingFallback component="Inventory Management" />}>
                                  <InventoryManagement />
                                </Suspense>
                              } />
                              
                              <Route path="widget-management" element={
                                <Suspense fallback={<LazyLoadingFallback component="Widget Management" />}>
                                  <WidgetManagement />
                                </Suspense>
                              } />
                              
                              <Route path="command-center" element={
                                <Suspense fallback={<LazyLoadingFallback component="Command Center" />}>
                                  <CommandCenter />
                                </Suspense>
                              } />
                              
                              {/* Debug route - only available in development */}
                              {import.meta.env.DEV && (
                                <Route path="test-widget" element={
                                  <Suspense fallback={<LazyLoadingFallback component="Test Widget" />}>
                                    <TestWidget />
                                  </Suspense>
                                } />
                              )}
                              </Route>
                              
                              {/* Legacy routes for backwards compatibility */}
                              <Route path="/bookings" element={
                                <ProtectedRoute>
                                  <>
                                    <Bookings />
                                  </>
                                </ProtectedRoute>
                              } />
                              <Route path="/settings" element={
                                <ProtectedRoute>
                                  <>
                                    <Settings />
                                  </>
                                </ProtectedRoute>
                              } />
                              <Route path="/command-center" element={
                                <ProtectedRoute>
                                  <>
                                    <CommandCenter />
                                  </>
                                </ProtectedRoute>
                              } />
                              
                              <Route path="*" element={
                                <>
                                  <NotFound />
                                </>
                              } />
                            </Routes>
                          
                          {/* Toast notifications */}
                          <Toaster />
                          <Sonner />
                          
                          {/* Web Vitals monitoring (enabled in all environments) */}
                          <WebVitalsMonitor 
                            enabled={true}
                            debug={import.meta.env.DEV}
                            reportToConsole={import.meta.env.DEV}
                            reportToAnalytics={import.meta.env.PROD}
                            sampleRate={1.0}
                          />
                          
                          {import.meta.env.MODE === 'development' && (
                            <>
                              <PerformanceMonitor />
                              <DataFlowDebugger />
                              <DataAuditor />
                            </>
                          )}
                        </div>
                        </TooltipProvider>
                      </FullscreenProvider>
                    </NavigationProvider>
                  </ModeTransitionProvider>
                </ModeProvider>
              </AuthProvider>
            </TenantBrandingProvider>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

