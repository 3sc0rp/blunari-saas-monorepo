import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { CSRFProtection } from "@/lib/security/csrfProtection";

export const SecurityMonitor = () => {
  const { user } = useAuth();
  const { logSecurityEvent } = useAuditLogger();

  useEffect(() => {
    // Initialize security systems
    CSRFProtection.initialize();
    
    // Monitor for suspicious activity
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        logSecurityEvent({
          eventType: 'page_focus_resumed',
          severity: 'low',
          eventData: {
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent
          }
        });
      }
    };

    // Temporarily disabled to prevent IP fetching errors during debugging
    // const handleBeforeUnload = () => {
    //   if (user) {
    //     logSecurityEvent({
    //       eventType: 'page_unload',
    //       severity: 'low',
    //       eventData: {
    //         timestamp: new Date().toISOString(),
    //         session_duration: Date.now() - (performance.timing.navigationStart || 0)
    //       }
    //     });
    //   }
    // };

    const handleError = (event: ErrorEvent) => {
      if (user) {
        logSecurityEvent({
          eventType: 'client_error',
          severity: 'medium',
          eventData: {
            error: event.error?.message || 'Unknown error',
            filename: event.filename,
            line: event.lineno,
            column: event.colno
          }
        });
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    // window.addEventListener('beforeunload', handleBeforeUnload); // Temporarily disabled
    window.addEventListener('error', handleError);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // window.removeEventListener('beforeunload', handleBeforeUnload); // Temporarily disabled
      window.removeEventListener('error', handleError);
    };
  }, [user, logSecurityEvent]);

  return null; // This is a monitoring component with no UI
};