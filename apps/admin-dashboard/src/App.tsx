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

// Pages
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import TenantsPage from "@/pages/TenantsPage";
import TenantDetailPage from "@/pages/TenantDetailPage";
import NewTenantPage from "@/pages/NewTenantPage";
import TenantProvisioningPage from "@/pages/TenantProvisioningPage";
import { EmployeesPage } from "@/pages/EmployeesPage";
import SettingsPage from "@/pages/SettingsPage";
import BillingPage from "@/pages/BillingPage";
import OperationsPage from "@/pages/OperationsPage";
import ObservabilityPage from "@/pages/ObservabilityPage";
import SystemHealthPage from "@/pages/SystemHealthPage";
import ImpersonationPage from "@/pages/ImpersonationPage";
import POSSystemsPage from "@/pages/POSSystemsPage";
import DomainsPage from "@/pages/DomainsPage";
import AgencyKitPage from "@/pages/AgencyKitPage";
import ProfilePage from "@/pages/ProfilePage";
import RoadmapPage from "@/pages/RoadmapPage";
import { IntegrationsPage } from "@/pages/IntegrationsPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { SupportPage } from "@/pages/SupportPage";
import ComprehensiveCateringManagement from "@/pages/ComprehensiveCateringManagement";
import NotFound from "@/pages/NotFound";

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
                    <Route path="tenants" element={<TenantsPage />} />
                    <Route path="tenants/new" element={<NewTenantPage />} />
                    <Route
                      path="tenants/provision"
                      element={<TenantProvisioningPage />}
                    />
                    <Route
                      path="tenants/:tenantId"
                      element={<TenantDetailPage />}
                    />
                    <Route path="employees" element={<EmployeesPage />} />
                    <Route path="billing" element={<BillingPage />} />
                    <Route path="operations" element={<OperationsPage />} />
                    <Route
                      path="observability"
                      element={<ObservabilityPage />}
                    />
                    <Route
                      path="system-health"
                      element={<SystemHealthPage />}
                    />
                    <Route path="pos-systems" element={<POSSystemsPage />} />
                    <Route path="domains" element={<DomainsPage />} />
                    <Route path="agency-kit" element={<AgencyKitPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="impersonate" element={<ImpersonationPage />} />
                    <Route path="integrations" element={<IntegrationsPage />} />
                    <Route
                      path="notifications"
                      element={<NotificationsPage />}
                    />
                    <Route path="analytics" element={<AnalyticsPage />} />
                    <Route
                      path="catering"
                      element={<ComprehensiveCateringManagement />}
                    />
                    <Route path="support" element={<SupportPage />} />
                    <Route path="roadmap" element={<RoadmapPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                  </Route>

                  {/* 404 */}
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
