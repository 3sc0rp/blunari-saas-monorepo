import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SecurityMonitor } from "@/components/security/SecurityMonitor";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Critical pages - loaded immediately
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";
import Unauthorized from "@/pages/Unauthorized";

// Lazy-loaded pages - loaded on demand
const TenantsPage = lazy(() => import("@/pages/TenantsPage"));
const TenantDetailPage = lazy(() => import("@/pages/TenantDetailPage"));
const TenantProvisioningPage = lazy(() => import("@/pages/TenantProvisioningPage"));
const EmployeesPage = lazy(() => import("@/pages/EmployeesPage").then(m => ({ default: m.EmployeesPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const BillingPage = lazy(() => import("@/pages/BillingPage"));
const OperationsPage = lazy(() => import("@/pages/OperationsPage"));
const ObservabilityPage = lazy(() => import("@/pages/ObservabilityPage"));
const SystemHealthPage = lazy(() => import("@/pages/SystemHealthPage"));
const ImpersonationPage = lazy(() => import("@/pages/ImpersonationPage"));
const AgencyKitPage = lazy(() => import("@/pages/AgencyKitPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage").then(m => ({ default: m.NotificationsPage })));
const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage").then(m => ({ default: m.AnalyticsPage })));
const SupportPage = lazy(() => import("@/pages/SupportPage").then(m => ({ default: m.SupportPage })));
const ComprehensiveCateringManagement = lazy(() => import("@/pages/ComprehensiveCateringManagement"));
const AcceptInvitation = lazy(() => import("@/pages/AcceptInvitation"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient();

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="ui-theme">
          <AuthProvider>
            <TooltipProvider>
              <SecurityMonitor />
              <Toaster />
              <Sonner />
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <Routes>
                  {/* Auth Routes */}
                  <Route path="/" element={<Auth />} />
                  <Route 
                    path="/accept-invitation" 
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <AcceptInvitation />
                      </Suspense>
                    } 
                  />

                  {/* Protected Admin Routes */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute>
                        <AdminLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route
                      index
                      element={<Navigate to="/admin/dashboard" replace />}
                    />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route 
                      path="tenants" 
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <TenantsPage />
                        </Suspense>
                      } 
                    />
                    <Route
                      path="tenants/new"
                      element={<Navigate to="/admin/tenants/provision" replace />}
                    />
                    <Route
                      path="tenants/provision"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <TenantProvisioningPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="tenants/:tenantId"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <TenantDetailPage />
                        </Suspense>
                      }
                    />
                    <Route 
                      path="employees" 
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <EmployeesPage />
                        </Suspense>
                      } 
                    />
                    <Route 
                      path="billing" 
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <BillingPage />
                        </Suspense>
                      } 
                    />
                    <Route 
                      path="operations" 
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <OperationsPage />
                        </Suspense>
                      } 
                    />
                    <Route
                      path="observability"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <ObservabilityPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="system-health"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <SystemHealthPage />
                        </Suspense>
                      }
                    />
                    <Route 
                      path="agency-kit" 
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <AgencyKitPage />
                        </Suspense>
                      } 
                    />
                    <Route 
                      path="profile" 
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <ProfilePage />
                        </Suspense>
                      } 
                    />
                    <Route 
                      path="impersonate" 
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <ImpersonationPage />
                        </Suspense>
                      } 
                    />
                    <Route
                      path="notifications"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <NotificationsPage />
                        </Suspense>
                      }
                    />
                    <Route 
                      path="analytics" 
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <AnalyticsPage />
                        </Suspense>
                      } 
                    />
                    <Route
                      path="catering"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <ComprehensiveCateringManagement />
                        </Suspense>
                      }
                    />
                    <Route 
                      path="support" 
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <SupportPage />
                        </Suspense>
                      } 
                    />
                    <Route 
                      path="settings" 
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <SettingsPage />
                        </Suspense>
                      } 
                    />
                  </Route>

                  {/* 404 */}
                  <Route path="/unauthorized" element={<Unauthorized />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
