import { useEffect } from "react";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { useAuth } from "@/contexts/AuthContext";

interface SecurityAuditLoggerProps {
  children: React.ReactNode;
  tableName?: string;
  operation?: string;
  resourceId?: string;
}

export const SecurityAuditLogger = ({ 
  children, 
  tableName, 
  operation, 
  resourceId 
}: SecurityAuditLoggerProps) => {
  const { user } = useAuth();
  const { logDataAccess } = useAuditLogger();

  useEffect(() => {
    if (tableName && operation && user) {
      logDataAccess(tableName, operation as 'read' | 'write' | 'delete', resourceId);
    }
  }, [tableName, operation, resourceId, user, logDataAccess]);

  return <>{children}</>;
};