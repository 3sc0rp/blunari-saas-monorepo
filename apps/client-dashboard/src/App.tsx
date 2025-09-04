import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantBrandingProvider } from "@/contexts/TenantBrandingContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { FullscreenProvider } from "@/contexts/FullscreenContext";
import { RealtimeCommandCenterProvider } from "@/contexts/RealtimeCommandCenterContext";
import { ModeProvider } from "@/lib/ui-mode";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import LandingMiddleware from "@/components/LandingMiddleware";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import StaffInvitation from "./pages/StaffInvitation";
import Dashboard from "./pages/Dashboard";
import CommandCenter from "./pages/CommandCenter";
import FullscreenCommandCenter from "./components/FullscreenCommandCenter";
import Bookings from "./pages/Bookings";
import Customers from "./pages/Customers";
import BookingWidget from "./pages/BookingWidget";
import WidgetManagement from "./pages/WidgetManagement";
import { ResponsiveDashboardSidebar } from "./components/dashboard/ResponsiveDashboardSidebar";
import POSIntegration from "./pages/POSIntegration";
import Waitlist from "./pages/Waitlist";
import Staff from "./pages/Staff";
import Messages from "./pages/Messages";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import DebugTenantPage from "./pages/DebugTenant";
import TenantTestPage from "./pages/TenantTestPage";
import BookingPage from "./pages/BookingPage";
import Catering from "./pages/Catering";
// Phase 1 Restaurant Management Components
import MenuManagement from "./pages/MenuManagement";
import KitchenDisplaySystem from "./pages/KitchenDisplaySystem";
import StaffManagement from "./pages/StaffManagement";
import InventoryManagement from "./pages/InventoryManagement";
import CustomerProfiles from "./pages/CustomerProfiles";
// Phase 2 Customer Experience Components
import AdvancedReservationSystem from "./pages/AdvancedReservationSystem";
import WaitlistManagement from "./pages/WaitlistManagement";
import EnhancedLoyaltyProgram from "./pages/EnhancedLoyaltyProgram";
import ReviewFeedbackSystem from "./pages/ReviewFeedbackSystem";
import AdvancedAnalyticsDashboard from "./pages/AdvancedAnalyticsDashboard";
import FinancialReporting from "./pages/FinancialReporting";
import PerformanceOptimization from "./pages/PerformanceOptimization";
import CompetitiveIntelligence from "./pages/CompetitiveIntelligence";
import AIBusinessInsights from "./pages/AIBusinessInsights";
// Phase 5: Enterprise Features
import APIIntegrationHub from "./components/integrations/APIIntegrationHub";
import MobileAppCenter from "./components/mobile/MobileAppCenter";
import AutomationWorkflows from "./components/automation/AutomationWorkflows";
import MultiLocationManagement from "./components/multi-location/MultiLocationManagement";
import { Suspense, lazy } from "react";
import { SkeletonPage } from "@/components/ui/skeleton-components";
import { DesignQAProvider } from "@/components/dev/DesignQAProvider";
import ErrorBoundary from "@/components/ErrorBoundary";

// Code splitting for heavy pages
const Analytics = lazy(() => import("./pages/Analytics"));
const Tables = lazy(() => import("./pages/Tables"));

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <TenantBrandingProvider>
            <RealtimeCommandCenterProvider>
              <ModeProvider>
                <NavigationProvider>
                  <FullscreenProvider>
                    <TooltipProvider>
                      <DesignQAProvider>
                        <Toaster />
                        <Sonner />
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/login" element={<Navigate to="/auth" replace />} />
                      {/* Debug route for development */}
                      {import.meta.env.MODE === 'development' && (
                        <Route path="/debug-tenant" element={<DebugTenantPage />} />
                      )}
                      {import.meta.env.MODE === 'development' && (
                        <Route path="/test-tenant" element={<TenantTestPage />} />
                      )}
                      <Route
                        path="/staff-invitation"
                        element={<StaffInvitation />}
                      />

                      {/* Public booking widget routes */}
                      <Route path="/book/:slug" element={<BookingPage />} />
                      <Route path="/catering/:slug" element={<BookingPage />} />

                      {/* Direct Command Center route - standalone Command Center */}
                      <Route 
                        path="/command-center" 
                        element={
                          <ProtectedRoute>
                            <CommandCenter />
                          </ProtectedRoute>
                        } 
                      />

                      {/* Fullscreen Command Center route */}
                      <Route 
                        path="/fullscreen/command-center" 
                        element={
                          <ProtectedRoute>
                            <FullscreenCommandCenter />
                          </ProtectedRoute>
                        } 
                      />

                      <Route
                        path="/dashboard"
                        element={
                          <ProtectedRoute>
                            <DashboardLayout />
                          </ProtectedRoute>
                        }
                      >
                        {/* Default dashboard route now redirects to Command Center */}
                        <Route 
                          index 
                          element={<Navigate to="/command-center" replace />} 
                        />
                        <Route path="home" element={
                          <LandingMiddleware>
                            <Dashboard />
                          </LandingMiddleware>
                        } />
                        <Route path="command-center" element={<CommandCenter />} />
                        <Route path="bookings" element={<Bookings />} />
                        <Route
                          path="tables"
                          element={
                            <Suspense fallback={<SkeletonPage />}>
                              <Tables />
                            </Suspense>
                          }
                        />
                        <Route path="customers" element={<Customers />} />
                        <Route
                          path="widget-preview"
                          element={<BookingWidget />}
                        />
                        <Route
                          path="widget-management"
                          element={<WidgetManagement />}
                        />
                        <Route
                          path="pos-integrations"
                          element={<POSIntegration />}
                        />
                        <Route path="waitlist" element={<Waitlist />} />
                        <Route path="staff" element={<Staff />} />
                        <Route path="messages" element={<Messages />} />
                        <Route
                          path="analytics"
                          element={
                            <Suspense fallback={<SkeletonPage />}>
                              <Analytics />
                            </Suspense>
                          }
                        />
                        <Route path="catering" element={<Catering />} />
                        {/* Phase 1: Restaurant Management Routes */}
                        <Route path="menu-management" element={<MenuManagement />} />
                        <Route path="kitchen-display" element={<KitchenDisplaySystem />} />
                        <Route path="staff-management" element={<StaffManagement />} />
                        <Route path="inventory-management" element={<InventoryManagement />} />
                        <Route path="customer-profiles" element={<CustomerProfiles />} />
                        {/* Phase 2: Customer Experience Routes */}
                        <Route path="advanced-reservations" element={<AdvancedReservationSystem />} />
                        <Route path="waitlist-management" element={<WaitlistManagement />} />
                        <Route path="enhanced-loyalty" element={<EnhancedLoyaltyProgram />} />
                        <Route path="review-feedback" element={<ReviewFeedbackSystem />} />
                        
                        {/* Phase 3: Advanced Analytics & Reporting Routes */}
                        <Route path="advanced-analytics" element={<AdvancedAnalyticsDashboard />} />
                        <Route path="financial-reporting" element={<FinancialReporting />} />
                        <Route path="performance-optimization" element={<PerformanceOptimization />} />
                        
                        {/* Phase 4: AI & Intelligence Routes */}
                        <Route path="competitive-intelligence" element={<CompetitiveIntelligence />} />
                        <Route path="ai-business-insights" element={<AIBusinessInsights />} />
                        
                        {/* Phase 5: Enterprise Features Routes */}
                        <Route path="api-integrations" element={<APIIntegrationHub />} />
                        <Route path="mobile-apps" element={<MobileAppCenter />} />
                        <Route path="automation" element={<AutomationWorkflows />} />
                        <Route path="multi-location" element={<MultiLocationManagement />} />
                        
                        <Route path="settings" element={<Settings />} />
                      </Route>
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </DesignQAProvider>
                </TooltipProvider>
              </FullscreenProvider>
            </NavigationProvider>
          </ModeProvider>
        </RealtimeCommandCenterProvider>
      </TenantBrandingProvider>
    </BrowserRouter>
  </AuthProvider>
</ThemeProvider>
</QueryClientProvider>
  </ErrorBoundary>
);

export default App;
