import React, { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantBrandingProvider } from "@/contexts/TenantBrandingContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { FullscreenProvider } from "@/contexts/FullscreenContext";
import { ModeProvider } from "@/lib/ui-mode";
import { ModeTransitionProvider } from "@/contexts/ModeTransitionContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import { connectionManager } from "@/utils/supabaseConnection";
import { useMemoryCleanup, usePerformanceMonitoring, useBundleMonitoring } from "@/hooks/usePerformance";
import LazyLoadingFallback, { 
  TableLoadingFallback, 
  AnalyticsLoadingFallback, 
  DashboardLoadingFallback 
} from "@/components/LazyLoadingFallback";

// Immediate load components (small, essential)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Bookings from "./pages/Bookings";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Lazy load heavy components with prefetch hints
const Analytics = lazy(() => 
  import(/* webpackChunkName: "analytics" */ "./pages/Analytics")
);
const Tables = lazy(() => 
  import(/* webpackChunkName: "tables" */ "./pages/Tables")
);
const CommandCenter = lazy(() => 
  import(/* webpackChunkName: "command-center" */ "./pages/CommandCenter")
);
const WaitlistManagement = lazy(() => 
  import(/* webpackChunkName: "waitlist" */ "./pages/WaitlistManagement")
);
const CustomerProfiles = lazy(() => 
  import(/* webpackChunkName: "customers" */ "./pages/CustomerProfiles")
);
const Catering = lazy(() => 
  import(/* webpackChunkName: "catering" */ "./pages/Catering")
);
const Messages = lazy(() => 
  import(/* webpackChunkName: "messages" */ "./pages/Messages")
);
const KitchenDisplaySystem = lazy(() => 
  import(/* webpackChunkName: "kitchen" */ "./pages/KitchenDisplaySystem")
);
const StaffManagement = lazy(() => 
  import(/* webpackChunkName: "staff" */ "./pages/StaffManagement")
);
const InventoryManagement = lazy(() => 
  import(/* webpackChunkName: "inventory" */ "./pages/InventoryManagement")
);
const AIBusinessInsights = lazy(() => 
  import(/* webpackChunkName: "ai-insights" */ "./pages/AIBusinessInsights")
);
const WidgetManagement = lazy(() => 
  import(/* webpackChunkName: "widgets" */ "./pages/WidgetManagement")
);
const DashboardHome = lazy(() => 
  import(/* webpackChunkName: "dashboard-home" */ "./pages/DashboardHome")
);

// Optimized QueryClient with better defaults for performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 15 * 60 * 1000, // 15 minutes
      retry: 2, // Reduced retries for faster failure handling
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false, // Reduce unnecessary refetches
      refetchOnReconnect: true,
    },
  },
});



function App() {
  console.log('🎯 App component rendering with full providers...');
  
  // Performance monitoring and optimization hooks
  useMemoryCleanup();
  usePerformanceMonitoring('App');
  useBundleMonitoring();
  
  // Initialize Supabase connection manager
  useEffect(() => {
    connectionManager.ensureConnection();
  }, []);
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <TenantBrandingProvider>
              <AuthProvider>
                <ModeProvider>
                  <ModeTransitionProvider>
                    <NavigationProvider>
                      <FullscreenProvider>
                        <TooltipProvider>
                        <div className="min-h-screen bg-gray-50">
                          <ScrollToTop />
                          <Routes>
                            {/* Non-protected routes with minimal loading */}
                            <Route path="/" element={<Index />} />
                            <Route path="/auth/*" element={<Auth />} />
                            
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
                                  <Catering />
                                </Suspense>
                              } />
                              
                              <Route path="messages" element={
                                <Suspense fallback={<LazyLoadingFallback component="Messages" />}>
                                  <Messages />
                                </Suspense>
                              } />
                              
                              <Route path="kitchen-display" element={
                                <Suspense fallback={<LazyLoadingFallback component="Kitchen Display" />}>
                                  <KitchenDisplaySystem />
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
                          <PerformanceMonitor />
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
