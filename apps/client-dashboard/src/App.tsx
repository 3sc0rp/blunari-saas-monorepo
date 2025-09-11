import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import PageTransition from "@/components/PageTransition";
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
import Customers from "./pages/Customers";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Code splitting for heavy pages
const Analytics = lazy(() => import("./pages/Analytics"));
const Tables = lazy(() => import("./pages/Tables"));
const CommandCenter = lazy(() => import("./pages/CommandCenter"));

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
                                <PageTransition>
                                  <Index />
                                </PageTransition>
                              } />
                              <Route path="/auth/*" element={
                                <PageTransition>
                                  <Auth />
                                </PageTransition>
                              } />
                              
                              {/* Protected dashboard routes */}
                              <Route 
                                path="/dashboard/*" 
                                element={
                                  <ProtectedRoute>
                                    <PageTransition>
                                      <DashboardLayout />
                                    </PageTransition>
                                  </ProtectedRoute>
                                } 
                              >
                                <Route index element={<Dashboard />} />
                                <Route path="bookings" element={<Bookings />} />
                                <Route path="customers" element={<Customers />} />
                                <Route path="analytics" element={<Analytics />} />
                                <Route path="tables" element={<Tables />} />
                                <Route path="command-center" element={<CommandCenter />} />
                                <Route path="settings" element={<Settings />} />
                              </Route>
                              
                              {/* Legacy routes for backwards compatibility */}
                              <Route path="/bookings" element={
                                <ProtectedRoute>
                                  <PageTransition>
                                    <Bookings />
                                  </PageTransition>
                                </ProtectedRoute>
                              } />
                              <Route path="/customers" element={
                                <ProtectedRoute>
                                  <PageTransition>
                                    <Customers />
                                  </PageTransition>
                                </ProtectedRoute>
                              } />
                              <Route path="/settings" element={
                                <ProtectedRoute>
                                  <PageTransition>
                                    <Settings />
                                  </PageTransition>
                                </ProtectedRoute>
                              } />
                              <Route path="/command-center" element={
                                <ProtectedRoute>
                                  <PageTransition>
                                    <CommandCenter />
                                  </PageTransition>
                                </ProtectedRoute>
                              } />
                              
                              <Route path="*" element={
                                <PageTransition>
                                  <NotFound />
                                </PageTransition>
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
