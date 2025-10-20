# Audit Logging Migration Deployment Guide

**Created:** October 20, 2025  
**Migration:** `20251020000000_audit_logging_system.sql`  
**Status:** ✅ Committed (5b7885c1), ⏳ Awaiting Deployment

## ⚠️ Deployment Issue

The `supabase db push` command timed out connecting to the remote database:
```
failed to connect to postgres: dial tcp 18.213.155.45:5432: i/o timeout
```

## ✅ Alternative Deployment Method

Use the **Supabase Dashboard SQL Editor** to deploy manually:

### Step 1: Access SQL Editor
1. Go to: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/sql
2. Create a new query

### Step 2: Copy Migration SQL
Copy the contents of: `supabase/migrations/20251020000000_audit_logging_system.sql`

### Step 3: Execute Migration
1. Paste the SQL into the editor
2. Click "Run" to execute
3. Verify success (should see "Success" message)

### Step 4: Verify Deployment
Run this query to verify the audit_logs table exists:
```sql
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_name = 'audit_logs';
```

Should return: `1`

### Step 5: Test Functions
```sql
-- Test log_activity function
SELECT public.log_activity(
  p_tenant_id := (SELECT id FROM tenants LIMIT 1),
  p_user_id := auth.uid(),
  p_action := 'test',
  p_resource_type := 'system',
  p_severity := 'info',
  p_status := 'success',
  p_metadata := '{"test": true}'::jsonb,
  p_tags := ARRAY['test']
);

-- Verify audit log was created
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 1;
```

## 📋 Migration Contents

This migration includes:

### 1. Core Table (Part 1)
- `audit_logs` table with comprehensive fields:
  - Activity: action, resource_type, resource_id
  - Change tracking: old_values, new_values, changed_fields
  - Context: IP, user agent, session ID, request ID
  - Compliance: severity, status, error_message, tags

### 2. Performance Indexes (Part 2)
- 12 indexes for optimized queries:
  - Time-based (most common pattern)
  - Resource lookups
  - User activity
  - Severity/status filtering
  - GIN indexes for JSONB/array searches

### 3. RLS Policies (Part 3)
- Tenant isolation for SELECT
- Service role for INSERT (immutable logs)
- Prevent UPDATE/DELETE (audit integrity)

### 4. Helper Functions (Part 4)
- `log_activity()` - Log an activity with auto-calculated changed_fields
- `query_audit_logs()` - Query with comprehensive filters
- `get_audit_stats()` - Statistics dashboard data
- `get_user_activity_timeline()` - User activity history
- `get_resource_history()` - Resource change audit trail
- `cleanup_old_audit_logs()` - GDPR retention policy

### 5. Auto-Logging Triggers (Part 5)
- Automatically logs changes on:
  - bookings, employees, tenants, profiles
  - roles, user_roles, role_permissions
  - payments (if exists), restaurants (if exists)

### 6. Retention & Cleanup (Part 6)
- Function to clean up old logs (default: 365 days)
- GDPR compliance support

### 7. Compliance Views (Part 7)
- `gdpr_user_data_access` - GDPR data access tracking
- `security_events` - Security monitoring
- `failed_authentication_attempts` - Failed login tracking

### 8. Performance Notes (Part 8)
- Partitioning setup (commented, enable at 10M+ records)
- Future scalability planning

### 9. Permissions (Part 9)
- Authenticated users: SELECT on audit_logs and views
- Service role: ALL on audit_logs

## 🎯 Expected Outcomes

After deployment:
- ✅ `audit_logs` table exists with all columns
- ✅ 12 indexes created for performance
- ✅ 6 helper functions available
- ✅ Auto-logging triggers active on critical tables
- ✅ 3 compliance views available
- ✅ RLS policies enforcing tenant isolation
- ✅ Initial migration log entry created

## 🔍 Verification Queries

After deployment, run these to verify:

```sql
-- Check table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'audit_logs';

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename = 'audit_logs';

-- Check functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%audit%' OR routine_name LIKE '%log_activity%';

-- Check triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%audit%';

-- Check views
SELECT table_name FROM information_schema.views 
WHERE table_name LIKE '%gdpr%' OR table_name LIKE '%security%';

-- Test auto-logging (update a booking to trigger)
UPDATE bookings SET status = status WHERE id = (SELECT id FROM bookings LIMIT 1);

-- Verify auto-log was created
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5;
```

## 🚨 Troubleshooting

### If deployment fails:
1. Check Supabase dashboard for errors
2. Verify you're using the correct project (kbfbbkcaxhzlnbqxwgoz)
3. Ensure you have database admin permissions
4. Try deploying in sections (copy Parts 1-9 individually)

### If triggers don't fire:
1. Verify tables exist (bookings, employees, etc.)
2. Check trigger status: `SELECT * FROM pg_trigger WHERE tgname LIKE '%audit%';`
3. Manually test: `SELECT public.auto_log_changes();`

### If RLS blocks queries:
1. Verify user has tenant in auto_provisioning
2. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'audit_logs';`
3. Use service role for testing (bypasses RLS)

## 📊 Statistics

- **Total lines:** 850 SQL
- **Tables:** 1 (audit_logs)
- **Indexes:** 12
- **Functions:** 6 helper + 1 trigger function
- **Triggers:** 8-10 (depending on table existence)
- **Views:** 3 compliance views
- **RLS Policies:** 4

## 🎉 Next Steps

After successful deployment:
1. ✅ Mark Phase 1 complete
2. ➡️ Start Phase 2: Edge Functions (log-activity, query-audit-logs)
3. Test auto-logging with real user actions
4. Monitor performance with `get_audit_stats()`

## 📝 Notes

- Migration is idempotent (safe to re-run with DROP IF EXISTS)
- Partitioning is commented out for future use (enable at 10M+ records)
- Default retention: 365 days (adjust with cleanup_old_audit_logs)
- Logs are immutable (cannot UPDATE or DELETE via RLS)
- Service role required for Edge Functions to insert logs
