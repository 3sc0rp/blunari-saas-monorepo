import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';

interface AuditLogEntry {
  eventType: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  resourceType?: string;
  resourceId?: string;
  eventData?: Record<string, unknown>;
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
        p_event_data: (entry.eventData || {}) as Json
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  const logEmployeeActivity = async (
    action: string,
    resourceType?: string,
    resourceId?: string,
    details?: Record<string, unknown>
  ) => {
    try {
      await supabase.rpc('log_employee_activity', {
        p_action: action,
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_details: details as Json
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
    // Try ipify first
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const response = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(timeout);
    if (response.ok) {
      const data = await response.json();
      if (data?.ip) return data.ip;
    }
    throw new Error('ipify failed');
  } catch {
    try {
      // Fallback to Cloudflare trace
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('https://www.cloudflare.com/cdn-cgi/trace', { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const text = await res.text();
        const match = text.match(/ip=(.*)/);
        if (match?.[1]) return match[1].trim();
      }
    } catch {
      // Ignore parsing errors
    }
    // Final fallback
    return '0.0.0.0';
  }
}