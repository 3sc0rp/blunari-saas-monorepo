import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/hooks/useTenant";
import { useUIMode } from "@/lib/ui-mode";

/**
 * LandingMiddleware - Handles landing redirects based on user role and saved preferences
 * 
 * Logic:
 * - Command Center is now the default landing page for all users post-login
 * - This middleware is now primarily used for the /dashboard/home route
 * - Users can still access the traditional dashboard via /dashboard/home
 */
const LandingMiddleware: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const { mode, ready } = useUIMode();
  const location = useLocation();

  // Check if we're on the dashboard home route  
  const isDashboardHome = location.pathname === "/dashboard/home";

  useEffect(() => {
    // If mode context is not ready, wait
    if (!ready || !user || !tenant) return;

    // This middleware now primarily handles the /dashboard/home route
    // The main /dashboard route redirects directly to Command Center
    if (isDashboardHome) {    }
  }, [mode, ready, user, tenant, isDashboardHome]);

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

