import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantBrandingProvider } from "@/contexts/TenantBrandingContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import StaffInvitation from "./pages/StaffInvitation";
import Dashboard from "./pages/Dashboard";
import Bookings from "./pages/Bookings";
import Customers from "./pages/Customers";
import BookingWidget from "./pages/BookingWidget";
import POSIntegration from "./pages/POSIntegration";
import Waitlist from "./pages/Waitlist";
import Staff from "./pages/Staff";
import Messages from "./pages/Messages";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import BookingPage from "./pages/BookingPage";
import Catering from "./pages/Catering";
import { Suspense, lazy } from "react";
import { SkeletonPage } from "@/components/ui/skeleton-components";
import { DesignQAProvider } from "@/components/dev/DesignQAProvider";

// Code splitting for heavy pages
const Analytics = lazy(() => import("./pages/Analytics"));
const Tables = lazy(() => import("./pages/Tables"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TenantBrandingProvider>
          <NavigationProvider>
            <TooltipProvider>
              <DesignQAProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/staff-invitation" element={<StaffInvitation />} />
            
            {/* Public booking widget routes */}
            <Route path="/book/:slug" element={<BookingPage />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="tables" element={
                <Suspense fallback={<SkeletonPage />}>
                  <Tables />
                </Suspense>
              } />
              <Route path="customers" element={<Customers />} />
              <Route path="widget-preview" element={<BookingWidget />} />
              <Route path="pos-integrations" element={<POSIntegration />} />
              <Route path="waitlist" element={<Waitlist />} />
              <Route path="staff" element={<Staff />} />
              <Route path="messages" element={<Messages />} />
              <Route path="analytics" element={
                <Suspense fallback={<SkeletonPage />}>
                  <Analytics />
                </Suspense>
              } />
              <Route path="catering" element={<Catering />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </DesignQAProvider>
            </TooltipProvider>
          </NavigationProvider>
        </TenantBrandingProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
