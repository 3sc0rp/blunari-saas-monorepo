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
    if (loading || !adminLoaded) return; // wait until admin evaluation completes
    if (!user && !testBypass) {
      navigate("/");
      return;
    }
    if (user && adminLoaded && !isAdmin && !testBypass) {
      navigate("/unauthorized", { replace: true });
    }
  }, [user, loading, adminLoaded, navigate, testBypass, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading || !adminLoaded) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if ((!user || (user && !isAdmin && !testBypass))) {
    return null; // Will redirect to auth
  }

  // For internal staff app - no tenant requirement needed

  return <>{children}</>;
};
