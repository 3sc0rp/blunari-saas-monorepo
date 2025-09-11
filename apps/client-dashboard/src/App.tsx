import React, { Suspense, lazy } from "react";
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
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Bookings from "./pages/Bookings";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Code splitting for heavy pages
const Analytics = lazy(() => import("./pages/Analytics"));
const Tables = lazy(() => import("./pages/Tables"));
const CommandCenter = lazy(() => import("./pages/CommandCenter"));
const WaitlistManagement = lazy(() => import("./pages/WaitlistManagement"));
const CustomerProfiles = lazy(() => import("./pages/CustomerProfiles"));
const Catering = lazy(() => import("./pages/Catering"));
const Messages = lazy(() => import("./pages/Messages"));
const KitchenDisplaySystem = lazy(() => import("./pages/KitchenDisplaySystem"));
const StaffManagement = lazy(() => import("./pages/StaffManagement"));
const InventoryManagement = lazy(() => import("./pages/InventoryManagement"));
const AIBusinessInsights = lazy(() => import("./pages/AIBusinessInsights"));
const WidgetManagement = lazy(() => import("./pages/WidgetManagement"));
const DashboardHome = lazy(() => import("./pages/DashboardHome"));

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 10 * 60 * 1000, // 10 minutes (gcTime replaced cacheTime in newer versions)
    },
  },
});

// Loading fallback component
const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    flexDirection: 'column'
  }}>
    <div style={{ 
      width: '40px', 
      height: '40px', 
      border: '4px solid #f3f3f3', 
      borderTop: '4px solid #3498db', 
      borderRadius: '50%', 
      animation: 'spin 1s linear infinite',
      marginBottom: '20px'
    }}></div>
    <p>Loading...</p>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

function App() {
  console.log('🎯 App component rendering with full providers...');
  
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
                          <Suspense fallback={<LoadingFallback />}>
                            <Routes>
                              <Route path="/" element={
                                <>
                                  <Index />
                                </>
                              } />
                              <Route path="/auth/*" element={
                                <>
                                  <Auth />
                                </>
                              } />
                              
                              {/* Protected dashboard routes */}
                              <Route 
                                path="/dashboard/*" 
                                element={
                                  <ProtectedRoute>
                                    <>
                                      <DashboardLayout />
                                    </>
                                  </ProtectedRoute>
                                } 
                              >
                                <Route index element={<Dashboard />} />
                                <Route path="home" element={<DashboardHome />} />
                                <Route path="bookings" element={<Bookings />} />
                                <Route path="waitlist-management" element={<WaitlistManagement />} />
                                <Route path="tables" element={<Tables />} />
                                <Route path="customers" element={<CustomerProfiles />} />
                                <Route path="catering" element={<Catering />} />
                                <Route path="messages" element={<Messages />} />
                                <Route path="kitchen-display" element={<KitchenDisplaySystem />} />
                                <Route path="staff-management" element={<StaffManagement />} />
                                <Route path="inventory-management" element={<InventoryManagement />} />
                                <Route path="analytics" element={<Analytics />} />
                                <Route path="ai-business-insights" element={<AIBusinessInsights />} />
                                <Route path="widget-management" element={<WidgetManagement />} />
                                <Route path="settings" element={<Settings />} />
                                <Route path="command-center" element={<CommandCenter />} />
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
                          </Suspense>
                          
                          {/* Toast notifications */}
                          <Toaster />
                          <Sonner />
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
