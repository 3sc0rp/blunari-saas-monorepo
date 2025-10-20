# Audit Logging Hooks - Quick Reference Guide

**Date:** October 20, 2025  
**Status:** ✅ Production Ready  
**Location:** `apps/client-dashboard/src/hooks/rbac/`

---

## 🚀 Quick Start

```typescript
import {
  useAuditLogs,
  useLogActivity,
  useCRUDLogger,
  useSecurityEvent,
} from '@/hooks/rbac'

function MyComponent({ tenantId }: Props) {
  // Query logs
  const { data } = useAuditLogs(tenantId, { action: 'create' })
  
  // Log activities
  const { logCreate, logUpdate } = useCRUDLogger(tenantId, 'booking')
  
  // Security events
  const { logSecurityEvent } = useSecurityEvent(tenantId)
}
```

---

## 📋 Core Hooks (useAuditLog.ts)

### 1. `useAuditLogs` - Query Logs
```typescript
const { data, isLoading, error } = useAuditLogs(tenantId, {
  action: ['create', 'update'],
  resource_type: 'booking',
  severity: ['warning', 'error'],
  start_date: '2025-10-01',
  end_date: '2025-10-20',
  limit: 50,
})

// Returns: { success, logs, total_count, stats? }
```

### 2. `useLogActivity` - Log Single Activity
```typescript
const { mutate, isLoading } = useLogActivity(tenantId)

mutate({
  action: 'create',
  resource_type: 'booking',
  resource_id: 'uuid',
  new_values: { status: 'confirmed' },
  severity: 'info',
})
```

### 3. `useBatchLogActivity` - Batch Logging
```typescript
const { mutate } = useBatchLogActivity(tenantId)

mutate({
  logs: [
    { action: 'create', resource_type: 'booking', ... },
    { action: 'update', resource_type: 'booking', ... },
  ],
})
```

### 4. `useAuditStats` - Statistics
```typescript
const { data } = useAuditStats(tenantId, {
  start: '2025-10-01',
  end: '2025-10-20',
})

// Returns: by_action, by_resource_type, by_severity, unique_users
```

### 5. `useExportAudit` - Export CSV
```typescript
const { mutate: exportLogs } = useExportAudit(tenantId)

exportLogs({
  start_date: '2025-10-01',
  end_date: '2025-10-20',
}) // Automatically downloads CSV
```

### 6. `useUserActivityTimeline` - User History
```typescript
const { data } = useUserActivityTimeline(tenantId, userId)

// Returns: Array of audit logs for specific user
```

### 7. `useResourceHistory` - Resource Changes
```typescript
const { data } = useResourceHistory(tenantId, 'booking', bookingId)

// Returns: Array of changes to specific resource
```

---

## 🛠️ Utility Hooks (useActivityLogger.ts)

### 1. `useAutoLog` - Auto-Log Actions
```typescript
const { log } = useAutoLog(tenantId, 'view', 'analytics', {
  debounce: 2000, // Wait 2s before logging
  metadata: { component: 'Dashboard' },
  tags: ['analytics'],
})

log({ status: 'success' }) // Trigger log
```

### 2. `useSecurityEvent` - Security Events
```typescript
const { logSecurityEvent } = useSecurityEvent(tenantId)

logSecurityEvent({
  event: 'login', // or 'logout', 'permission_denied', etc.
  metadata: { method: 'email' },
})
```

### 3. `useComplianceEvent` - GDPR/Compliance
```typescript
const { logComplianceEvent } = useComplianceEvent(tenantId)

logComplianceEvent({
  event: 'gdpr_access', // or 'gdpr_delete', 'gdpr_export'
  resource_type: 'user',
  resource_id: userId,
  metadata: { reason: 'User requested data' },
})
```

### 4. `useActionLogger` - Generic Logger
```typescript
const { logAction } = useActionLogger(tenantId, {
  component: 'BookingForm',
  feature: 'booking-management',
})

logAction({
  action: 'create',
  resource_type: 'booking',
  resource_id: 'uuid',
})
```

### 5. `useCRUDLogger` - CRUD Operations
```typescript
const { logCreate, logUpdate, logDelete, logView } = 
  useCRUDLogger(tenantId, 'booking')

// Create
logCreate(booking.id, booking.name, booking)

// Update
logUpdate(booking.id, booking.name, oldData, newData)

// Delete
logDelete(booking.id, booking.name, oldData)

// View
logView(booking.id, booking.name)
```

### 6. `useErrorLogger` - Error Logging
```typescript
const { logError, logCriticalError } = useErrorLogger(tenantId)

// Regular error
logError('update', 'booking', error, { bookingId })

// Critical error
logCriticalError('delete', 'payment', error, { paymentId })
```

### 7. `usePageViewLogger` - Page Views
```typescript
// Automatically logs on mount/page change
usePageViewLogger(tenantId, 'Dashboard', {
  section: 'analytics',
})
```

### 8. `usePerformanceLogger` - Performance
```typescript
const { logPerformance } = usePerformanceLogger(tenantId)

const start = Date.now()
await loadData()
const duration = Date.now() - start

logPerformance('data-load', duration, {
  records: data.length,
})
```

---

## 📊 Type Definitions

### Actions
```typescript
type AuditLogAction =
  | 'create' | 'update' | 'delete' | 'view'
  | 'login' | 'logout' | 'permission_denied'
  | 'export' | 'import' | 'approve' | 'reject'
  | 'cancel' | 'restore' | 'archive'
```

### Severity
```typescript
type AuditLogSeverity = 'info' | 'warning' | 'error' | 'critical'
```

### Status
```typescript
type AuditLogStatus = 'success' | 'failure' | 'pending'
```

### Filters
```typescript
interface AuditLogFilters {
  tenant_id: string
  user_id?: string
  action?: AuditLogAction | AuditLogAction[]
  resource_type?: string | string[]
  resource_id?: string
  severity?: AuditLogSeverity | AuditLogSeverity[]
  status?: AuditLogStatus | AuditLogStatus[]
  start_date?: string
  end_date?: string
  search?: string
  tags?: string[]
  limit?: number
  offset?: number
  include_stats?: boolean
}
```

---

## 🎯 Common Patterns

### Pattern 1: Log Form Submission
```typescript
function BookingForm({ tenantId }: Props) {
  const { logCreate } = useCRUDLogger(tenantId, 'booking')
  
  async function handleSubmit(data: BookingInput) {
    const booking = await api.createBooking(data)
    logCreate(booking.id, booking.customer_name, booking)
  }
}
```

### Pattern 2: Track User Activity
```typescript
function UserProfile({ tenantId, userId }: Props) {
  const { data: timeline } = useUserActivityTimeline(tenantId, userId)
  
  return (
    <Timeline>
      {timeline?.map(log => (
        <TimelineItem key={log.id}>
          {log.action} on {log.resource_type}
        </TimelineItem>
      ))}
    </Timeline>
  )
}
```

### Pattern 3: Resource Audit Trail
```typescript
function BookingDetails({ tenantId, bookingId }: Props) {
  const { data: history } = useResourceHistory(tenantId, 'booking', bookingId)
  
  return (
    <AuditTrail>
      {history?.map(log => (
        <ChangeLog key={log.id}>
          {log.user_email} {log.action} at {log.created_at}
          <Changes old={log.old_values} new={log.new_values} />
        </ChangeLog>
      ))}
    </AuditTrail>
  )
}
```

### Pattern 4: Security Dashboard
```typescript
function SecurityDashboard({ tenantId }: Props) {
  const { data } = useAuditLogs(tenantId, {
    action: ['login', 'logout', 'permission_denied'],
    severity: ['warning', 'error'],
  })
  
  const { logSecurityEvent } = useSecurityEvent(tenantId)
  
  return <SecurityEvents logs={data?.logs} />
}
```

### Pattern 5: Export Reports
```typescript
function AuditReports({ tenantId }: Props) {
  const { mutate: exportLogs, isLoading } = useExportAudit(tenantId)
  const { data: stats } = useAuditStats(tenantId)
  
  return (
    <div>
      <Stats data={stats} />
      <Button onClick={() => exportLogs()} disabled={isLoading}>
        Export CSV
      </Button>
    </div>
  )
}
```

---

## ⚡ Performance Tips

### 1. Use Debouncing for Frequent Actions
```typescript
const { log } = useAutoLog(tenantId, 'view', 'page', {
  debounce: 2000, // Don't log every scroll
})
```

### 2. Batch Log Multiple Actions
```typescript
const { mutate: batchLog } = useBatchLogActivity(tenantId)

// Instead of logging 10 times, batch them
batchLog({
  logs: bookings.map(b => ({
    action: 'create',
    resource_type: 'booking',
    resource_id: b.id,
  })),
})
```

### 3. Use Silent Mode for Background Logging
```typescript
const { log } = useAutoLog(tenantId, 'view', 'page', {
  silent: true, // Don't show errors to user
})
```

### 4. Optimize Filter Queries
```typescript
// ✅ Good - Specific filters
const { data } = useAuditLogs(tenantId, {
  resource_id: bookingId,
  limit: 20,
})

// ❌ Bad - Fetching everything
const { data } = useAuditLogs(tenantId)
```

---

## 🔒 Security Best Practices

### 1. Always Include Tenant ID
```typescript
// ✅ Good - Tenant isolation enforced
const { mutate } = useLogActivity(tenantId)

// ❌ Bad - No tenant context
const { mutate } = useLogActivity()
```

### 2. Log Permission Denials
```typescript
const { logSecurityEvent } = useSecurityEvent(tenantId)

if (!hasPermission) {
  logSecurityEvent({
    event: 'permission_denied',
    resource_type: 'booking',
    resource_id: bookingId,
    metadata: { required_permission: 'booking:delete' },
  })
}
```

### 3. Log All Data Access (GDPR)
```typescript
const { logComplianceEvent } = useComplianceEvent(tenantId)

async function exportUserData(userId: string) {
  const data = await api.getUserData(userId)
  
  logComplianceEvent({
    event: 'gdpr_export',
    resource_type: 'user',
    resource_id: userId,
  })
  
  return data
}
```

---

## 🐛 Troubleshooting

### Hook returns undefined
```typescript
// Check if tenant ID is provided
const { data } = useAuditLogs(tenantId) // ❌ tenantId is undefined

// Use enabled option
const { data } = useAuditLogs(tenantId, {
  enabled: !!tenantId, // ✅ Only query if tenantId exists
})
```

### Logs not appearing
```typescript
// Check if mutation succeeded
const { mutate, isError, error } = useLogActivity(tenantId)

mutate(input, {
  onSuccess: () => console.log('Logged successfully'),
  onError: (err) => console.error('Log failed:', err),
})
```

### CSV export not downloading
```typescript
// Check browser popup blockers
// Check network tab for 200 response
// Verify CORS headers from Edge Function
```

---

## 📚 Additional Resources

- **Full Documentation:** `WEEK_21-22_AUDIT_LOGGING_PHASE_3_COMPLETE.md`
- **Edge Functions:** `supabase/functions/log-activity/`, `query-audit-logs/`
- **Database Schema:** `supabase/migrations/20251020000000_audit_logging_system.sql`
- **React Query Docs:** https://tanstack.com/query/latest

---

**Last Updated:** October 20, 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
