import { 
  ImpersonationSession, 
  ImpersonationAuditLog, 
  ImpersonationAnalytics,
  ImpersonationSettings,
  ImpersonationPermission,
  ImpersonationRestriction
} from '@/types/impersonation';

export const mockImpersonationPermissions: ImpersonationPermission[] = [
  { action: 'view', resource: 'bookings', allowed: true },
  { action: 'view', resource: 'customers', allowed: true },
  { action: 'view', resource: 'analytics', allowed: true },
  { action: 'create', resource: 'bookings', allowed: true },
  { action: 'update', resource: 'bookings', allowed: true },
  { action: 'delete', resource: 'bookings', allowed: false, reason: 'Requires manager approval' },
  { action: 'view', resource: 'financial_data', allowed: false, reason: 'Restricted by role' },
  { action: 'export', resource: 'customer_data', allowed: false, reason: 'Privacy restricted' },
  { action: 'update', resource: 'tenant_settings', allowed: false, reason: 'Admin only' },
];

export const mockImpersonationRestrictions: ImpersonationRestriction[] = [
  {
    type: 'time_limit',
    description: 'Session expires after 2 hours',
    value: 120,
    active: true
  },
  {
    type: 'action_limit',
    description: 'Maximum 50 actions per session',
    value: 50,
    active: true
  },
  {
    type: 'resource_limit',
    description: 'Cannot access financial data',
    active: true
  },
  {
    type: 'approval_required',
    description: 'Deletion actions require approval',
    active: true
  }
];

export const mockImpersonationSessions: ImpersonationSession[] = [
  {
    id: 'session-1',
    impersonatorId: 'emp-1',
    impersonatorName: 'Alex Thompson',
    impersonatorRole: 'SUPPORT',
    targetTenantId: 'tenant-1',
    targetTenantName: 'Bella Vista Restaurant',
    targetUserId: 'user-1',
    targetUserName: 'Maria Rodriguez',
    reason: 'Customer reported booking issues - investigating duplicate reservations',
    requestedBy: 'Customer Support',
    ticketNumber: 'TICKET-2024-001',
    startedAt: '2024-01-27T14:30:00Z',
    expiresAt: '2024-01-27T16:30:00Z',
    status: 'active',
    permissions: mockImpersonationPermissions,
    restrictions: mockImpersonationRestrictions,
    metadata: {
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      location: 'New York, NY'
    }
  },
  {
    id: 'session-2',
    impersonatorId: 'emp-2',
    impersonatorName: 'Sarah Chen',
    impersonatorRole: 'ADMIN',
    targetTenantId: 'tenant-2',
    targetTenantName: 'Ocean Breeze Café',
    reason: 'Setup assistance for new POS integration',
    ticketNumber: 'TICKET-2024-002',
    startedAt: '2024-01-27T10:00:00Z',
    expiresAt: '2024-01-27T12:00:00Z',
    endedAt: '2024-01-27T11:45:00Z',
    status: 'completed',
    permissions: mockImpersonationPermissions,
    restrictions: mockImpersonationRestrictions,
    metadata: {
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      location: 'San Francisco, CA'
    }
  },
  {
    id: 'session-3',
    impersonatorId: 'emp-3',
    impersonatorName: 'Michael Davis',
    impersonatorRole: 'SUPER_ADMIN',
    targetTenantId: 'tenant-3',
    targetTenantName: 'Golden Dragon Asian Cuisine',
    reason: 'Emergency: Payment processing down, need to verify settings',
    requestedBy: 'Operations Team',
    ticketNumber: 'INCIDENT-2024-001',
    startedAt: '2024-01-26T08:15:00Z',
    expiresAt: '2024-01-26T10:15:00Z',
    endedAt: '2024-01-26T09:30:00Z',
    status: 'completed',
    permissions: mockImpersonationPermissions,
    restrictions: mockImpersonationRestrictions,
    metadata: {
      ipAddress: '192.168.1.102',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      location: 'Austin, TX'
    }
  },
  {
    id: 'session-4',
    impersonatorId: 'emp-1',
    impersonatorName: 'Alex Thompson',
    impersonatorRole: 'SUPPORT',
    targetTenantId: 'tenant-4',
    targetTenantName: 'Metro Diner',
    reason: 'Session timeout during table configuration',
    startedAt: '2024-01-25T16:00:00Z',
    expiresAt: '2024-01-25T17:00:00Z',
    endedAt: '2024-01-25T17:00:00Z',
    status: 'expired',
    permissions: mockImpersonationPermissions,
    restrictions: mockImpersonationRestrictions,
    metadata: {
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      location: 'New York, NY'
    }
  }
];

export const mockImpersonationAuditLogs: ImpersonationAuditLog[] = [
  {
    id: 'audit-1',
    sessionId: 'session-1',
    impersonatorId: 'emp-1',
    targetTenantId: 'tenant-1',
    action: 'view_bookings',
    actionType: 'view',
    resource: 'bookings',
    resourceId: 'booking-123',
    description: 'Viewed booking details for reservation #RES-001',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    timestamp: '2024-01-27T14:35:00Z',
    success: true,
    metadata: {
      bookingId: 'booking-123',
      customerName: 'John Smith',
      bookingDate: '2024-01-28'
    }
  },
  {
    id: 'audit-2',
    sessionId: 'session-1',
    impersonatorId: 'emp-1',
    targetTenantId: 'tenant-1',
    action: 'update_booking',
    actionType: 'update',
    resource: 'bookings',
    resourceId: 'booking-123',
    description: 'Updated booking time from 7:00 PM to 7:30 PM',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    timestamp: '2024-01-27T14:42:00Z',
    success: true,
    metadata: {
      previousTime: '19:00',
      newTime: '19:30',
      reason: 'Customer request via phone'
    }
  },
  {
    id: 'audit-3',
    sessionId: 'session-2',
    impersonatorId: 'emp-2',
    targetTenantId: 'tenant-2',
    action: 'configure_pos',
    actionType: 'update',
    resource: 'pos_settings',
    description: 'Updated POS integration settings for Square',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    timestamp: '2024-01-27T10:15:00Z',
    success: true,
    metadata: {
      provider: 'Square',
      action: 'configure_webhook',
      webhookUrl: 'https://api.blunari.com/webhook/pos'
    }
  },
  {
    id: 'audit-4',
    sessionId: 'session-3',
    impersonatorId: 'emp-3',
    targetTenantId: 'tenant-3',
    action: 'view_payments',
    actionType: 'view',
    resource: 'payment_settings',
    description: 'Reviewed payment gateway configuration',
    ipAddress: '192.168.1.102',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    timestamp: '2024-01-26T08:20:00Z',
    success: true,
    metadata: {
      gateway: 'Stripe',
      status: 'active',
      lastTransaction: '2024-01-26T07:45:00Z'
    }
  },
  {
    id: 'audit-5',
    sessionId: 'session-1',
    impersonatorId: 'emp-1',
    targetTenantId: 'tenant-1',
    action: 'export_data',
    actionType: 'export',
    resource: 'customer_data',
    description: 'Attempted to export customer data',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    timestamp: '2024-01-27T14:50:00Z',
    success: false,
    errorMessage: 'Permission denied: Customer data export restricted',
    metadata: {
      requestedFormat: 'CSV',
      recordCount: 150
    }
  }
];

export const mockImpersonationAnalytics: ImpersonationAnalytics = {
  totalSessions: 127,
  activeSessions: 1,
  sessionsToday: 8,
  sessionsThisWeek: 34,
  averageSessionDuration: 67, // minutes
  topImpersonators: [
    { id: 'emp-1', name: 'Alex Thompson', sessionCount: 23 },
    { id: 'emp-2', name: 'Sarah Chen', sessionCount: 18 },
    { id: 'emp-3', name: 'Michael Davis', sessionCount: 15 },
    { id: 'emp-4', name: 'Jennifer Wilson', sessionCount: 12 },
    { id: 'emp-5', name: 'David Brown', sessionCount: 9 }
  ],
  topTargetTenants: [
    { id: 'tenant-1', name: 'Bella Vista Restaurant', sessionCount: 8 },
    { id: 'tenant-2', name: 'Ocean Breeze Café', sessionCount: 6 },
    { id: 'tenant-3', name: 'Golden Dragon Asian Cuisine', sessionCount: 5 },
    { id: 'tenant-4', name: 'Metro Diner', sessionCount: 4 },
    { id: 'tenant-5', name: 'Sunrise Bistro', sessionCount: 3 }
  ],
  mostCommonReasons: [
    { reason: 'Booking system troubleshooting', count: 28 },
    { reason: 'POS integration setup', count: 22 },
    { reason: 'Payment processing issues', count: 18 },
    { reason: 'Account configuration', count: 15 },
    { reason: 'Data migration support', count: 12 }
  ]
};

export const mockImpersonationSettings: ImpersonationSettings = {
  maxSessionDuration: 120, // 2 hours
  requireApproval: false,
  allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
  restrictedActions: ['delete_tenant', 'export_financial_data', 'modify_billing'],
  auditRetentionDays: 90,
  notificationSettings: {
    notifyOnStart: true,
    notifyOnEnd: true,
    notifyOnFailure: true,
    emailRecipients: ['security@blunari.com', 'audit@blunari.com']
  }
};