export interface ImpersonationSession {
  id: string;
  impersonatorId: string;
  impersonatorName: string;
  impersonatorRole: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT';
  targetTenantId: string;
  targetTenantName: string;
  targetUserId?: string;
  targetUserName?: string;
  reason: string;
  requestedBy?: string;
  ticketNumber?: string;
  startedAt: string;
  expiresAt: string;
  endedAt?: string;
  status: 'active' | 'expired' | 'terminated' | 'completed';
  permissions: ImpersonationPermission[];
  restrictions: ImpersonationRestriction[];
  metadata: {
    ipAddress: string;
    userAgent: string;
    location?: string;
  };
}

export interface ImpersonationPermission {
  action: string;
  resource: string;
  allowed: boolean;
  reason?: string;
}

export interface ImpersonationRestriction {
  type: 'time_limit' | 'action_limit' | 'resource_limit' | 'approval_required';
  description: string;
  value?: string | number;
  active: boolean;
}

export interface ImpersonationAuditLog {
  id: string;
  sessionId: string;
  impersonatorId: string;
  targetTenantId: string;
  action: string;
  actionType: 'view' | 'create' | 'update' | 'delete' | 'export' | 'system';
  resource: string;
  resourceId?: string;
  description: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  success: boolean;
  errorMessage?: string;
  metadata: Record<string, any>;
}

export interface TenantImpersonationRequest {
  tenantId: string;
  reason: string;
  duration: number; // in minutes
  permissions: string[];
  ticketNumber?: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ImpersonationAnalytics {
  totalSessions: number;
  activeSessions: number;
  sessionsToday: number;
  sessionsThisWeek: number;
  averageSessionDuration: number;
  topImpersonators: {
    id: string;
    name: string;
    sessionCount: number;
  }[];
  topTargetTenants: {
    id: string;
    name: string;
    sessionCount: number;
  }[];
  mostCommonReasons: {
    reason: string;
    count: number;
  }[];
}

export interface ImpersonationSettings {
  maxSessionDuration: number; // in minutes
  requireApproval: boolean;
  allowedRoles: string[];
  restrictedActions: string[];
  auditRetentionDays: number;
  notificationSettings: {
    notifyOnStart: boolean;
    notifyOnEnd: boolean;
    notifyOnFailure: boolean;
    emailRecipients: string[];
  };
}