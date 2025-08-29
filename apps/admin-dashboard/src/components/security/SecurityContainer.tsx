import { useEffect, useState } from "react";
import { CSRFProtection } from "@/lib/security/csrfProtection";
import { RateLimiter } from "@/lib/security/rateLimiter";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { useAuth } from "@/contexts/AuthContext";

interface SecurityContainerProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  rateLimit?: {
    action: string;
    limit: number;
    windowMinutes: number;
  };
}

export const SecurityContainer = ({ 
  children, 
  requireAuth = false,
  rateLimit 
}: SecurityContainerProps) => {
  const { user } = useAuth();
  const { logSecurityEvent } = useAuditLogger();
  const [isSecurityInit, setIsSecurityInit] = useState(false);

  useEffect(() => {
    // Initialize CSRF protection
    CSRFProtection.setToken();
    
    // Log security container access
    if (user) {
      logSecurityEvent({
        eventType: 'security_container_access',
        severity: 'low',
        eventData: {
          requireAuth,
          hasRateLimit: !!rateLimit,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    setIsSecurityInit(true);
  }, [user, requireAuth, rateLimit, logSecurityEvent]);

  useEffect(() => {
    if (rateLimit && user) {
      const identifier = user.id;
      const isLimited = RateLimiter.isRateLimited(
        identifier,
        rateLimit.action,
        rateLimit.limit,
        rateLimit.windowMinutes
      );
      
      if (isLimited) {
        logSecurityEvent({
          eventType: 'rate_limit_exceeded',
          severity: 'medium',
          eventData: {
            action: rateLimit.action,
            limit: rateLimit.limit,
            windowMinutes: rateLimit.windowMinutes
          }
        });
      }
    }
  }, [rateLimit, user, logSecurityEvent]);

  if (requireAuth && !user) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Authentication Required</h2>
          <p className="text-muted-foreground">You must be logged in to access this page.</p>
        </div>
      </div>
    );
  }

  if (!isSecurityInit) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
};