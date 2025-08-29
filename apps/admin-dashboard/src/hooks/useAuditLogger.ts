import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AuditLogEntry {
  eventType: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  resourceType?: string;
  resourceId?: string;
  eventData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export function useAuditLogger() {
  const { user } = useAuth();

  const logSecurityEvent = async (entry: AuditLogEntry) => {
    try {
      // Get client IP and user agent
      const ipAddress = await getClientIP();
      const userAgent = navigator.userAgent;

      await supabase.rpc('log_security_event', {
        p_event_type: entry.eventType,
        p_severity: entry.severity || 'info',
        p_user_id: user?.id,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_event_data: entry.eventData || {}
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const logEmployeeActivity = async (
    action: string,
    resourceType?: string,
    resourceId?: string,
    details?: Record<string, any>
  ) => {
    try {
      await supabase.rpc('log_employee_activity', {
        p_action: action,
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_details: details
      });
    } catch (error) {
      console.error('Failed to log employee activity:', error);
    }
  };

  const logAuthEvent = async (eventType: 'login' | 'logout' | 'failed_login' | 'password_change') => {
    await logSecurityEvent({
      eventType: `auth_${eventType}`,
      severity: eventType === 'failed_login' ? 'medium' : 'low',
      eventData: {
        timestamp: new Date().toISOString(),
        user_id: user?.id
      }
    });
  };

  const logDataAccess = async (resourceType: string, action: 'read' | 'write' | 'delete', resourceId?: string) => {
    await logSecurityEvent({
      eventType: 'data_access',
      severity: action === 'delete' ? 'high' : 'low',
      resourceType,
      resourceId,
      eventData: {
        action,
        timestamp: new Date().toISOString()
      }
    });
  };

  const logPermissionChange = async (
    targetUserId: string,
    oldPermissions: string[],
    newPermissions: string[],
    reason?: string
  ) => {
    await logSecurityEvent({
      eventType: 'permission_change',
      severity: 'high',
      resourceType: 'user_permissions',
      resourceId: targetUserId,
      eventData: {
        target_user_id: targetUserId,
        old_permissions: oldPermissions,
        new_permissions: newPermissions,
        reason,
        changed_by: user?.id
      }
    });
  };

  const logSystemAccess = async (systemArea: string, action: string) => {
    await logSecurityEvent({
      eventType: 'system_access',
      severity: 'medium',
      resourceType: 'system',
      resourceId: systemArea,
      eventData: {
        system_area: systemArea,
        action,
        timestamp: new Date().toISOString()
      }
    });
  };

  return {
    logSecurityEvent,
    logEmployeeActivity,
    logAuthEvent,
    logDataAccess,
    logPermissionChange,
    logSystemAccess
  };
}

// Helper function to get client IP (simplified for demo)
async function getClientIP(): Promise<string | null> {
  try {
    // Use a more reliable IP service or fallback gracefully
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.warn('Could not get client IP:', error);
    // Return a placeholder instead of null to avoid blocking audit logs
    return '0.0.0.0';
  }
}