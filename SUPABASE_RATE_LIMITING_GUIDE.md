# Supabase Rate Limiting Setup Guide

## 🎯 Objective
Protect your Supabase Edge Functions from abuse by implementing rate limiting on critical endpoints.

---

## Critical Edge Functions to Protect

Based on your codebase, these Edge Functions need rate limiting:

1. **`manage-tenant-credentials`** - Admin tenant management
2. **`widget-analytics`** - Analytics data retrieval
3. **`validate-password-setup-link`** - Authentication
4. **Any public-facing booking endpoints**

---

## Method 1: Supabase Built-in Rate Limiting (Recommended)

### Access Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz
2. Navigate to: **Edge Functions** → **Settings**

### Configure Rate Limits

**Default Settings** (Good for most cases):
- **Requests per minute per IP**: 60
- **Requests per minute per user**: 100

**For Production** (Recommended):
```
Global Rate Limit: 1000 requests/minute
Per IP Rate Limit: 60 requests/minute
Per User Rate Limit: 100 requests/minute
```

### How to Enable

#### Step 1: Go to Project Settings
```
Dashboard → Your Project → Settings → API
```

#### Step 2: Configure Rate Limits
Look for **"Rate Limiting"** section and set:
- ✅ Enable rate limiting
- Set limits based on your traffic expectations

#### Step 3: Monitor Usage
```
Dashboard → Edge Functions → Logs
```
Watch for `429 Too Many Requests` responses.

---

## Method 2: Edge Function-Level Rate Limiting

If you need custom rate limiting per function, add this to each Edge Function:

### Implementation Example

Create a rate limiting utility in `supabase/functions/_shared/rate-limit.ts`:

```typescript
// supabase/functions/_shared/rate-limit.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const defaultConfig: RateLimitConfig = {
  maxRequests: 60,
  windowMs: 60000, // 1 minute
};

export async function checkRateLimit(
  request: Request,
  config: RateLimitConfig = defaultConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const clientIp = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  
  const key = `rate_limit:${clientIp}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Use Supabase storage or Redis for distributed rate limiting
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Check current request count for this IP
  const { data, error } = await supabase
    .from('rate_limit_tracker')
    .select('request_count, window_start')
    .eq('client_key', key)
    .single();

  if (error || !data) {
    // First request from this IP, create entry
    await supabase
      .from('rate_limit_tracker')
      .insert({ 
        client_key: key, 
        request_count: 1, 
        window_start: now 
      });
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  // Check if window has expired
  if (data.window_start < windowStart) {
    // Reset window
    await supabase
      .from('rate_limit_tracker')
      .update({ request_count: 1, window_start: now })
      .eq('client_key', key);
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  // Increment request count
  const newCount = data.request_count + 1;
  
  if (newCount > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: data.window_start + config.windowMs,
    };
  }

  await supabase
    .from('rate_limit_tracker')
    .update({ request_count: newCount })
    .eq('client_key', key);

  return {
    allowed: true,
    remaining: config.maxRequests - newCount,
    resetAt: data.window_start + config.windowMs,
  };
}

export function rateLimitResponse(resetAt: number): Response {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
        'X-RateLimit-Limit': '60',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.ceil(resetAt / 1000).toString(),
      },
    }
  );
}
```

### Apply to Edge Functions

Update your Edge Functions to use rate limiting:

```typescript
// supabase/functions/widget-analytics/index.ts
import { checkRateLimit, rateLimitResponse } from '../_shared/rate-limit.ts';

Deno.serve(async (req) => {
  // Check rate limit first
  const rateLimit = await checkRateLimit(req, {
    maxRequests: 100, // 100 requests per minute for analytics
    windowMs: 60000,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetAt);
  }

  // Add rate limit headers to successful responses
  const response = await handleRequest(req);
  
  response.headers.set('X-RateLimit-Limit', '100');
  response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
  response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimit.resetAt / 1000).toString());
  
  return response;
});
```

### Create Rate Limit Tracking Table

Run this SQL in Supabase SQL Editor:

```sql
-- Create rate limit tracking table
CREATE TABLE IF NOT EXISTS rate_limit_tracker (
  id BIGSERIAL PRIMARY KEY,
  client_key TEXT UNIQUE NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_client_key 
ON rate_limit_tracker(client_key);

-- Auto-cleanup old entries (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_tracker
  WHERE window_start < (EXTRACT(EPOCH FROM NOW()) * 1000) - 3600000;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup every hour
SELECT cron.schedule(
  'cleanup-rate-limits',
  '0 * * * *',
  $$SELECT cleanup_old_rate_limits()$$
);
```

---

## Method 3: Cloudflare Rate Limiting (Advanced)

If you have high traffic, consider using Cloudflare in front of Supabase:

### Setup Steps

1. **Add domain to Cloudflare**
2. **Create rate limiting rule**:
   ```
   Path: /functions/v1/*
   Rate: 100 requests per minute
   Action: Challenge or Block
   ```

3. **Configure in Cloudflare Dashboard**:
   - Go to **Security** → **WAF** → **Rate Limiting Rules**
   - Add rule for your Edge Functions domain

---

## Monitoring & Alerts

### 1. Enable Supabase Logs
```
Dashboard → Edge Functions → Logs
```

Look for:
- High request volumes
- 429 responses
- Unusual IP patterns

### 2. Set Up Alerts

In Supabase Dashboard:
```
Settings → Alerts → Add Alert
```

Configure:
- **Metric**: Edge Function invocations
- **Threshold**: > 10,000 requests/hour
- **Notification**: Email or Slack

### 3. Monitor with Sentry

If you've set up Sentry, add rate limit tracking:

```typescript
import * as Sentry from '@sentry/browser';

// In your API error handler
if (response.status === 429) {
  Sentry.captureMessage('Rate limit exceeded', {
    level: 'warning',
    extra: {
      endpoint: request.url,
      retryAfter: response.headers.get('Retry-After'),
    },
  });
}
```

---

## Testing Rate Limits

### Test Script

```powershell
# Test rate limiting on an endpoint
$endpoint = "https://kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1/widget-analytics"
$headers = @{
    "Authorization" = "Bearer YOUR_ANON_KEY"
    "Content-Type" = "application/json"
}

# Send 70 requests rapidly
1..70 | ForEach-Object {
    $response = Invoke-WebRequest -Uri $endpoint -Method POST -Headers $headers -Body '{"test": true}' -UseBasicParsing
    Write-Host "Request $_: Status $($response.StatusCode)"
    
    if ($response.StatusCode -eq 429) {
        Write-Host "⚠️ Rate limit triggered at request $_"
        Write-Host "Retry-After: $($response.Headers['Retry-After'])"
        break
    }
}
```

### Expected Behavior

- First 60 requests: `200 OK`
- 61st request onward: `429 Too Many Requests`
- Headers include:
  - `X-RateLimit-Limit: 60`
  - `X-RateLimit-Remaining: 0`
  - `Retry-After: <seconds>`

---

## Rate Limit Configuration by Function

### Public-Facing Functions (Strict)
```typescript
// widget-analytics, public booking endpoints
{
  maxRequests: 60,
  windowMs: 60000, // 1 minute
}
```

### Authenticated Functions (Moderate)
```typescript
// Tenant dashboard operations
{
  maxRequests: 100,
  windowMs: 60000,
}
```

### Admin Functions (Relaxed)
```typescript
// manage-tenant-credentials (admin only)
{
  maxRequests: 200,
  windowMs: 60000,
}
```

---

## Best Practices

### 1. Different Limits for Different Users
```typescript
// In rate limit check
const userType = await getUserType(request);

const config = {
  anonymous: { maxRequests: 30, windowMs: 60000 },
  authenticated: { maxRequests: 100, windowMs: 60000 },
  admin: { maxRequests: 500, windowMs: 60000 },
};

return checkRateLimit(request, config[userType]);
```

### 2. Whitelist Trusted IPs
```typescript
const trustedIPs = [
  '123.456.789.0', // Your office
  '::1', // Localhost
];

if (trustedIPs.includes(clientIp)) {
  return { allowed: true, remaining: Infinity, resetAt: 0 };
}
```

### 3. Graceful Degradation
Instead of hard blocking, return cached data:

```typescript
if (!rateLimit.allowed) {
  // Return cached analytics instead of blocking
  const cachedData = await getCachedAnalytics(tenantId);
  
  return new Response(JSON.stringify(cachedData), {
    status: 200,
    headers: {
      'X-Cache': 'HIT',
      'X-RateLimit-Exceeded': 'true',
    },
  });
}
```

---

## Troubleshooting

### Issue: Legitimate users getting blocked

**Solution**: Increase limits or implement user-based rate limiting:
```typescript
// Use user ID instead of IP for authenticated requests
const identifier = request.headers.get('Authorization') 
  ? await getUserId(request)
  : clientIp;
```

### Issue: Rate limits not working

**Checklist**:
- [ ] Rate limit table created in database
- [ ] Service role key has access to rate_limit_tracker table
- [ ] Function redeployed after adding rate limit code
- [ ] Test from different IPs to avoid caching

---

## Production Checklist

- [ ] Supabase built-in rate limiting enabled
- [ ] Custom rate limits added to public functions
- [ ] Rate limit tracking table created
- [ ] Monitoring alerts configured
- [ ] Test rate limits with script above
- [ ] Document rate limits in API documentation
- [ ] Add rate limit headers to all responses
- [ ] Set up graceful degradation for critical endpoints

---

**Last Updated**: October 13, 2025  
**Next Review**: After first month of production traffic
