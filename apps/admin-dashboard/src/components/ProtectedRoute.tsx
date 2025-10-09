import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireTenant?: boolean;
}

export const ProtectedRoute = ({
  children,
  requireTenant = false,
}: ProtectedRouteProps) => {
  const { user, loading, isAdmin, adminLoaded } = useAuth();
  const navigate = useNavigate();

  // Test bypass: allow UI smoke tests without real auth when a flag is present
  const testBypass = (() => {
    if (typeof window === "undefined") return false;
    try {
      const host = window.location.hostname;
      const isLocalhost = host === "localhost" || host === "127.0.0.1";
      const inHref = window.location.href.includes("__bypass=1");
      const inStorage = window.localStorage.getItem("ADMIN_TEST_BYPASS") === "1";
      return isLocalhost && (inHref || inStorage);
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    // Wait for both auth and admin check to complete
    if (loading || !adminLoaded) return;
    
    if (!user && !testBypass) {
      navigate("/");
      return;
    }
    
    // Only redirect to unauthorized after we're certain user is not admin
    if (user && !isAdmin && !testBypass) {
      // Add small delay to prevent flash during state updates
      const timer = setTimeout(() => {
        navigate("/unauthorized", { replace: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, loading, adminLoaded, navigate, testBypass, isAdmin]);

  // Show loading spinner while checking authentication and admin status
  if (loading || !adminLoaded) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">
            {loading ? "Loading..." : "Verifying admin access..."}
          </p>
        </div>
      </div>
    );
  }

  // After checks complete, if not authorized, return null (useEffect will handle redirect)
  if (!user || !isAdmin) {
    if (testBypass) {
      // Allow test bypass
    } else {
      return null;
    }
  }

  return <>{children}</>;
};
