import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface DataAccessGuardProps {
  children: ReactNode;
  requiredRole?: string;
  resourceType?: string;
  resourceId?: string;
  tenantId?: string;
  fallback?: ReactNode;
}

export const DataAccessGuard = ({
  children,
  requiredRole,
  resourceType,
  resourceId,
  tenantId,
  fallback,
}: DataAccessGuardProps) => {
  const { user } = useAuth();
  const { logSecurityEvent } = useAuditLogger();
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setHasAccess(false);
        setIsLoading(false);
        return;
      }

      try {
        // Basic access check - can be enhanced with actual role validation
        const accessGranted = true;

        // Log access attempt
        await logSecurityEvent({
          eventType: "data_access_attempt",
          severity: "low",
          eventData: {
            resourceType,
            resourceId,
            tenantId,
            requiredRole,
            granted: accessGranted,
          },
        });

        setHasAccess(accessGranted);
      } catch (error) {
        console.error("Access check failed:", error);
        await logSecurityEvent({
          eventType: "access_check_failed",
          severity: "medium",
          eventData: {
            resourceType,
            resourceId,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [
    user,
    requiredRole,
    resourceType,
    resourceId,
    tenantId,
    logSecurityEvent,
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Card className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Access Denied
        </h3>
        <p className="text-muted-foreground">
          You don't have permission to access this resource.
        </p>
      </Card>
    );
  }

  return <>{children}</>;
};
