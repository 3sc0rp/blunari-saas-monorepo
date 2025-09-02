import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/hooks/useTenant";
import { useUIMode } from "@/lib/ui-mode";

/**
 * LandingMiddleware - Handles landing redirects based on user role and saved preferences
 * 
 * Logic:
 * - If user accesses /dashboard directly and mode is not ready, wait
 * - If mode is operations, redirect to /dashboard/command-center
 * - If mode is management, stay on /dashboard
 */
const LandingMiddleware: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const { mode, ready } = useUIMode();
  const location = useLocation();

  // Only intercept if we're on the main dashboard route
  const isDashboardIndex = location.pathname === "/dashboard";

  useEffect(() => {
    // If mode context is not ready, wait
    if (!ready || !user || !tenant) return;

    // Only redirect from dashboard index
    if (!isDashboardIndex) return;

    // If user is in operations mode, redirect to command center
    if (mode === "operations") {
      // Use replace to avoid adding to browser history
      window.history.replaceState(null, "", "/dashboard/command-center");
    }
    // If management mode, stay on dashboard (default behavior)
  }, [mode, ready, user, tenant, isDashboardIndex]);

  // Show loading state while mode context initializes
  if (!ready && user && tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-text-muted">Initializing dashboard...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default LandingMiddleware;
