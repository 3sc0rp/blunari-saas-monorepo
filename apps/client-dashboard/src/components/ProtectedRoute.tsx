import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/hooks/useTenant";
import { Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const {
    tenant,
    accessType,
    tenantSlug,
    isLoading: tenantLoading,
  } = useTenant();
  const location = useLocation();

  // Show loading while checking authentication and tenant
      if (authLoading || tenantLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // SECURITY FIX: All access now requires authentication
  // No more unrestricted domain access
      if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Handle different access scenarios (only for authenticated users)
      if (accessType === "domain") {
    // Domain-based access (authenticated restaurant staff only)
      if (!tenant) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
              <CardTitle>Restaurant Not Found</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                The restaurant "{tenantSlug}" could not be found or is not
                active.
              </p>
              <p className="text-sm text-muted-foreground">
                Please check the URL or contact the restaurant directly.
              </p>
              <Button
                onClick={() => window.history.back()}
                variant="outline"
                className="w-full"
              >
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Verify user has access to this tenant
    // This will be validated by the new RLS policies on the backend
      return <>{children}</>;
  }

  // User-based access (admin or staff access)
      if (!tenant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
            <CardTitle>No Restaurant Access</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              You don't have access to any restaurant dashboard.
            </p>
            <p className="text-sm text-muted-foreground">
              Please contact your administrator to get access to a restaurant.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;

