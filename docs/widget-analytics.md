# Widget Analytics Edge Function

Version: 2025-09-13.1

## Purpose
Provides aggregated analytics for embeddable booking or catering widgets with optional authentication. Anonymous access is explicitly enabled (config: `verify_jwt = false`).

## Endpoint
```
POST https://<project-ref>.functions.supabase.co/widget-analytics
```

## Request Body
```json
{
  "tenantId": "<uuid>",
  "widgetType": "booking" | "catering",
  "timeRange": "1d" | "7d" | "30d" (optional, default: 7d)
}
```

## Response Shapes
### Success (200)
```json
{
  "success": true,
  "data": { /* analytics object */ },
  "meta": {
    "tenantId": "...",
    "widgetType": "booking",
    "timeRange": "7d",
    "authMethod": "anonymous" | "authenticated",
    "generatedAt": "2025-09-13T11:11:11.111Z",
    "durationMs": 142,
    "version": "2025-09-13.1",
    "correlationId": "..."
  }
}
```

### Error
```json
{
  "success": false,
  "code": "MISSING_TENANT_ID",
  "error": "Missing or invalid required parameter: tenantId",
  "details": { "received": null, "type": "object" },
  "correlationId": "..."
}
```

## Error Codes
| Code | Meaning | Action |
|------|---------|--------|
| METHOD_NOT_ALLOWED | Non-POST request | Use POST |
| EMPTY_BODY | Body missing/blank | Send JSON body |
| INVALID_BODY | Body not an object | Wrap fields in an object |
| JSON_PARSE_ERROR | Invalid JSON | Fix syntax |
| MISSING_TENANT_ID | `tenantId` absent/blank | Provide valid tenant id |
| MISSING_WIDGET_TYPE | `widgetType` absent/blank | Provide widget type |
| INVALID_WIDGET_TYPE | Not booking/catering | Use supported enum |
| INTERNAL_ERROR | Unexpected exception | Check logs using correlationId |

## Analytics Fields (`data`)
| Field | Description |
|-------|-------------|
| totalViews | Count (or estimated if no events) |
| totalClicks | Count (or estimated) |
| conversionRate | Completed orders / views (%) |
| avgSessionDuration | Seconds (or default 180) |
| totalBookings | Total orders/bookings |
| completionRate | Completed / total orders (%) |
| avgPartySize | Booking average (if booking) |
| avgOrderValue | Average order value (if catering) |
| peakHours | Top 3 hour buckets (booking only) |
| topSources | Array of traffic sources |
| dailyStats | Per-day aggregates in requested window |

`dailyStats` length matches requested window up to max 30 days.

## Correlation IDs
Every response includes `x-correlation-id` header and JSON field. Pass a custom ID via request header to stitch client ↔ server logs.

## Auth Mode
Anonymous allowed (config). If Authorization header with valid JWT present, the function records `authMethod="authenticated"`; otherwise `anonymous`.

To enforce auth instead, remove `config.toml` or set `verify_jwt = true` and redeploy.

## Local Diagnostics (Without Docker)
You can still test remote deployment directly:
```powershell
node scripts/diagnose-widget-analytics.mjs <project-ref> <tenant-id> booking 7d
```

## Adding More Metrics
1. Add column queries in `generateRealAnalytics`.
2. Include derived fields in return object.
3. Update this doc & client hook types.

## Performance Notes
- Timing captured (`durationMs`) from request receipt to successful response.
- Manual version string (`FUNCTION_VERSION`) helps correlate deploys.

## Safety & Future Hardening
- Consider adding origin validation strict allowlist and rejecting `*` in production.
- Add rate limiting (e.g., via middleware or API gateway).
- If public analytics become sensitive, toggle `verify_jwt` back to true and serve a redacted public variant.

## Changelog
- 2025-09-13.1: Added dynamic dailyStats, timing, version meta, config.toml (anonymous), diagnostic script.
