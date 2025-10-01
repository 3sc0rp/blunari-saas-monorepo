# Action Checklist: Booking System Fixes & Improvements

**Generated:** October 1, 2025  
**Priority Levels:** 🔴 Critical | 🟡 High | 🔵 Medium | ⚪ Low

---

## Immediate Actions (Do Today)

### 🔴 1. Deploy Edge Function Guest Name Fix

**Status:** Code fixed, not deployed  
**Impact:** HIGH - Guest names showing as "Guest" in database  
**Effort:** 5 minutes

```bash
# Navigate to edge function directory
cd C:\Users\Drood\Desktop\Blunari SAAS\apps\client-dashboard

# Deploy the fixed function
npx supabase functions deploy widget-booking-live --project-ref kbfbbkcaxhzlnbqxwgoz

# Verify deployment
npx supabase functions list
```

**Verification:**
1. Run `node test-booking-flow.mjs` again
2. Check database record - `guest_name` should now be "Test Customer Flow" instead of "Guest"

---

### 🔴 2. Run Database Audit

**Status:** SQL script created  
**Impact:** HIGH - Identify any schema or RLS issues  
**Effort:** 10 minutes

**Steps:**
1. Open Supabase Dashboard: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz
2. Go to SQL Editor
3. Open `database-audit-bookings.sql`
4. Run each section sequentially
5. Review results for any RED FLAGS:
   - RLS enabled but no policies for INSERT
   - Missing indexes on `tenant_id` or `booking_time`
   - "Guest" name count > 0
   - Schema type mismatch

**Save Results:** Take screenshots or copy results to a text file

---

### 🟡 3. Add Error Monitoring (Sentry)

**Status:** Not implemented  
**Impact:** HIGH - Catch production errors immediately  
**Effort:** 30 minutes

```bash
# Install Sentry for Deno
npm install --save-dev @sentry/deno
```

**Edge Function Integration:**
```typescript
// Add to widget-booking-live/index.ts (top of file)
import * as Sentry from '@sentry/deno';

Sentry.init({
  dsn: Deno.env.get('SENTRY_DSN'),
  environment: Deno.env.get('ENVIRONMENT') || 'production',
  tracesSampleRate: 0.1,
});

// Wrap main handler
serve(async (req) => {
  try {
    // ... existing code ...
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        function: 'widget-booking-live',
        requestId: requestId
      },
      contexts: {
        request: {
          method: req.method,
          url: req.url,
        }
      }
    });
    throw error;
  }
});
```

**Environment Variables to Set:**
```bash
# In Supabase Dashboard > Edge Functions > Environment Variables
SENTRY_DSN=your_sentry_dsn_here
ENVIRONMENT=production
```

---

## This Week

### 🟡 4. Implement Retry Logic in Frontend

**Status:** Not implemented  
**Impact:** MEDIUM - Better reliability for transient failures  
**Effort:** 1-2 hours

**File:** `src/api/booking-proxy.ts`

```typescript
// Add retry wrapper
async function callEdgeFunctionWithRetry(
  functionName: string,
  body: Record<string, unknown>,
  maxRetries: number = 3
): Promise<unknown> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callEdgeFunction(functionName, body);
    } catch (error: any) {
      lastError = error;
      
      // Only retry on specific errors
      const shouldRetry = 
        error.code === 'NETWORK_ERROR' ||
        error.code === 'HTTP_ERROR' ||
        (error.details?.retryable === true);
      
      if (!shouldRetry || attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      const delay = 1000 * Math.pow(2, attempt - 1);
      console.log(`[booking-proxy] Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Update confirmReservation to use retry
export async function confirmReservation(
  request: ReservationRequest,
  idempotencyKey: string,
) {
  try {
    const data = await callEdgeFunctionWithRetry("widget-booking-live", {
      action: "confirm",
      idempotency_key: idempotencyKey,
      tenant_id: request.tenant_id,
      hold_id: request.hold_id,
      guest_details: request.guest_details,
      table_id: (request as any).table_id,
      deposit: (request as any).deposit,
      source: (request as any).source,
    }, 3); // Max 3 retries
    
    // ... rest of code
  } catch (error) {
    // ... error handling
  }
}
```

---

### 🟡 5. Fix Notification Error Handling

**Status:** Silently failing  
**Impact:** MEDIUM - Users might not receive confirmation emails  
**Effort:** 1 hour

**File:** `supabase/functions/widget-booking-live/index.ts`

**Current Issue (Lines 934-940, 980-1020):**
```typescript
try { 
  await sendPendingNotifications(...); 
} catch {} // ❌ Error swallowed
```

**Fix:**
```typescript
// Don't wait for notifications to avoid blocking response
queueNotification(async () => {
  try {
    await sendPendingNotifications({
      toEmail: guest_details?.email,
      tenantName: tenant?.name,
      whenISO: booking.booking_time,
      partySize: booking.party_size,
      confirmationNumber,
    });
  } catch (error) {
    // Log to Sentry or monitoring service
    console.error('[NOTIFICATION_FAILED]', {
      reservationId: booking.id,
      email: guest_details?.email,
      error: error.message
    });
    
    // Optionally send to dead letter queue for retry
    await reportFailedNotification({
      reservationId: booking.id,
      type: 'email',
      recipient: guest_details?.email,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Helper function
function queueNotification(fn: () => Promise<void>) {
  // Fire and forget, but catch errors
  fn().catch(error => {
    console.error('[ASYNC_NOTIFICATION_ERROR]', error);
  });
}
```

---

### 🟡 6. Add Integration Tests

**Status:** Not implemented  
**Impact:** MEDIUM - Prevent regressions  
**Effort:** 3-4 hours

**Create:** `src/__tests__/integration/booking-flow.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Booking Flow Integration Tests', () => {
  let supabase: any;
  let testTenantId: string;
  
  beforeAll(async () => {
    // Setup test environment
    supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_SERVICE_KEY!
    );
    
    // Get test tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', 'demo')
      .single();
    
    testTenantId = tenant.id;
  });
  
  it('should create booking with correct guest name', async () => {
    // Create widget token
    const tokenRes = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/create-widget-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.VITE_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY!}`
      },
      body: JSON.stringify({ 
        slug: 'demo', 
        widget_type: 'booking' 
      })
    });
    
    const { token } = await tokenRes.json();
    
    // Create hold
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0);
    
    const holdRes = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.VITE_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY!}`
      },
      body: JSON.stringify({
        action: 'hold',
        party_size: 4,
        slot: { time: tomorrow.toISOString(), available_tables: 1 },
        token,
        idempotency_key: crypto.randomUUID()
      })
    });
    
    const holdData = await holdRes.json();
    expect(holdData.success).toBe(true);
    
    // Confirm booking
    const confirmRes = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.VITE_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY!}`
      },
      body: JSON.stringify({
        action: 'confirm',
        hold_id: holdData.hold_id,
        guest_details: {
          name: 'Integration Test User',
          email: 'integration@test.com',
          phone: '+1234567890'
        },
        token,
        idempotency_key: crypto.randomUUID()
      })
    });
    
    const confirmData = await confirmRes.json();
    expect(confirmData.success).toBe(true);
    expect(confirmData.reservation_id).toBeDefined();
    
    // Verify in database
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', confirmData.reservation_id)
      .single();
    
    expect(booking).toBeDefined();
    expect(booking.guest_name).toBe('Integration Test User');
    expect(booking.guest_email).toBe('integration@test.com');
    expect(booking.status).toBe('pending');
    
    // Cleanup
    await supabase
      .from('bookings')
      .delete()
      .eq('id', confirmData.reservation_id);
  });
  
  it('should return error when hold_id is invalid', async () => {
    // Test error handling
    const tokenRes = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/create-widget-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.VITE_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY!}`
      },
      body: JSON.stringify({ slug: 'demo', widget_type: 'booking' })
    });
    
    const { token } = await tokenRes.json();
    
    const confirmRes = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/widget-booking-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.VITE_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY!}`
      },
      body: JSON.stringify({
        action: 'confirm',
        hold_id: '00000000-0000-0000-0000-000000000000', // Invalid
        guest_details: {
          name: 'Test User',
          email: 'test@test.com'
        },
        token,
        idempotency_key: crypto.randomUUID()
      })
    });
    
    expect(confirmRes.status).toBe(404);
    const errorData = await confirmRes.json();
    expect(errorData.success).toBe(false);
    expect(errorData.error.code).toBe('HOLD_NOT_FOUND');
  });
});
```

**Run Tests:**
```bash
npm run test:integration
```

---

## This Month

### 🔵 7. Refactor Schema Dual-Path Logic

**Status:** Technical debt  
**Impact:** MEDIUM - Cleaner code, better performance  
**Effort:** 4-6 hours

**Current Issue:** Edge function tries two schema formats on every insert

**Solution:**
1. Add `schema_version` column to `tenants` table
2. Store 'v1' or 'v2' in tenant config
3. Use single code path based on version

```sql
-- Migration: Add schema version to tenants
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS booking_schema_version VARCHAR(10) DEFAULT 'v2';

-- Update existing tenants
UPDATE tenants 
SET booking_schema_version = 'v2'
WHERE booking_schema_version IS NULL;
```

---

### 🔵 8. Implement Circuit Breaker

**Status:** Not implemented  
**Impact:** MEDIUM - Prevent cascade failures  
**Effort:** 2-3 hours

See `SENIOR-DEV-ANALYSIS.md` Section 5.B for implementation

---

### 🔵 9. Add Monitoring Dashboards

**Status:** Not implemented  
**Impact:** MEDIUM - Proactive issue detection  
**Effort:** 4 hours

**Metrics to Track:**
- Booking creation success rate
- P50, P95, P99 latency
- Error rate by error code
- Database insertion failures
- Notification failures

**Tools:** DataDog, Grafana, or Supabase built-in metrics

---

### 🔵 10. Document API Contracts

**Status:** Not implemented  
**Impact:** LOW - Better developer experience  
**Effort:** 2-3 hours

Create OpenAPI/Swagger spec for edge functions

---

## Validation & Testing

### ✅ Test Checklist After Each Fix

- [ ] Run `node test-booking-flow.mjs` - should pass 100%
- [ ] Check database - guest names should be correct
- [ ] Create real booking via widget - should work end-to-end
- [ ] Check email notifications - should be received
- [ ] Review Supabase logs - no errors
- [ ] Check Sentry - no new errors logged

---

## Success Metrics

**Target Goals:**
- ✅ Booking success rate > 99.5%
- ✅ P95 latency < 2000ms
- ✅ Zero "Guest" default names in new bookings
- ✅ Email delivery rate > 98%
- ✅ Error detection time < 5 minutes (via Sentry)
- ✅ Zero overlapping table bookings

---

## Files Created for Reference

1. **`test-booking-flow.mjs`** - Comprehensive E2E test script
2. **`SENIOR-DEV-ANALYSIS.md`** - Full technical analysis
3. **`BOOKING-DEBUG-RESULTS.md`** - Test results documentation
4. **`FINAL-BOOKING-ANALYSIS.md`** - Summary of findings
5. **`database-audit-bookings.sql`** - Database inspection script
6. **`ACTION-CHECKLIST.md`** - This file

---

## Contact & Support

If issues persist after completing Priority 1 actions:

1. Check Supabase Dashboard > Edge Functions > Logs
2. Run database audit script and share results
3. Check browser console for frontend errors
4. Review Sentry error reports (if configured)

**Test Command:**
```bash
node test-booking-flow.mjs
```

This should show all green checkmarks after fixes are deployed.

---

**Last Updated:** October 1, 2025  
**Next Review:** After Priority 1 actions completed
