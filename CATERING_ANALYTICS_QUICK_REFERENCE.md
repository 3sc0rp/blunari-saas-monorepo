# Catering Analytics Quick Reference

**Purpose**: Enable, test, and interpret catering widget analytics tracking.

---

## Quick Enable

### Debug Mode (No Provider Required)
```env
# .env.local
VITE_ANALYTICS_DEBUG=true
```
Open browser console to see event logs:
```
[Analytics] catering_widget_viewed { tenant_id: '...', session_id: '...', timestamp: 1729123456 }
[Analytics] catering_package_selected { package_id: '...', package_name: 'Premium', price_per_person: 5000 }
```

### Google Analytics 4
```html
<!-- Add to index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Mixpanel
```html
<script>
  (function(f,b){/* Mixpanel snippet */})();
  mixpanel.init('YOUR_PROJECT_TOKEN');
</script>
```

### PostHog
```html
<script>
  !function(t,e){/* PostHog snippet */}();
  posthog.init('YOUR_PROJECT_KEY');
</script>
```

---

## Tracked Events

| Event | When Fired | Key Metadata |
|-------|------------|--------------|
| `catering_widget_viewed` | Widget loads | `tenant_id`, `tenant_slug`, `session_id` |
| `catering_package_viewed` | User hovers/clicks package | `package_id`, `package_name`, `price_per_person` |
| `catering_package_selected` | User selects package | `package_id`, `package_name`, `price_per_person` |
| `catering_step_completed` | User moves to next step | `step`, `step_number`, `time_on_step_seconds` |
| `catering_field_focused` | User focuses form field | `field_name`, `field_type`, `is_required` |
| `catering_field_completed` | User fills field successfully | `field_name`, `value_length`, `is_required` |
| `catering_field_error` | Validation error occurs | `field_name`, `error_message`, `error_type` |
| `catering_draft_saved` | Auto-save triggers | `fields_completed`, `completion_percentage` |
| `catering_draft_restored` | User restores draft | `draft_age_seconds`, `fields_restored` |
| `catering_order_submitted` | Order submitted successfully | `guest_count`, `total_price_cents`, `time_to_complete_seconds` |
| `catering_order_failed` | Order submission fails | `error_message`, `error_type` |
| `catering_form_abandoned` | User leaves without completing | `last_step`, `completion_percentage`, `time_spent_seconds` |

---

## Key Metrics

### Conversion Funnel
1. **Widget Viewed** → All users who loaded the widget
2. **Package Selected** → Users who chose a package (% of step 1)
3. **Customize Completed** → Users who filled event details (% of step 2)
4. **Details Completed** → Users who filled contact info (% of step 3)
5. **Order Submitted** → Users who completed order (% of step 4)

**Calculate Drop-Off**:
```
Drop-off Rate = (Step N Views - Step N+1 Views) / Step N Views * 100%
```

### Time Metrics
- **Average Session Duration**: `time_to_complete_seconds` from `catering_order_submitted`
- **Step Duration**: `time_on_step_seconds` from `catering_step_completed`
- **Abandonment Time**: `time_spent_seconds` from `catering_form_abandoned`

### Error Metrics
- **Field Error Rate**: Count of `catering_field_error` / Count of `catering_field_completed`
- **Submission Error Rate**: Count of `catering_order_failed` / Count of submission attempts
- **Most Common Errors**: Group by `error_message` in `catering_field_error`

### Engagement Metrics
- **Draft Recovery Rate**: Count of `catering_draft_restored` / Count of `catering_draft_saved`
- **Package Popularity**: Group by `package_name` in `catering_package_selected`
- **Average Guest Count**: Average of `guest_count` in `catering_order_submitted`

---

## Testing Checklist

### Local Testing (Debug Mode)
```powershell
# 1. Enable debug mode
echo "VITE_ANALYTICS_DEBUG=true" >> .env.local

# 2. Restart dev server
npm run dev:client

# 3. Open browser console (F12)
# 4. Navigate to http://localhost:5173/catering/test-restaurant
# 5. Verify events in console
```

**Expected Console Output**:
```
[Analytics] catering_widget_viewed { tenant_id: '...', session_id: 'catering_1729123456_abc123', timestamp: 1729123456789 }
```

### Production Testing (GA4)
```bash
# 1. Deploy to production
git push origin master

# 2. Wait for Vercel deployment (2-4 minutes)

# 3. Open GA4 Real-Time Reports
# 4. Load widget: https://app.blunari.ai/catering/test-restaurant
# 5. Check Real-Time Events for 'catering_widget_viewed'
```

**GA4 Event Parameters**:
- Event name: `catering_widget_viewed`
- Parameters: `tenant_id`, `tenant_slug`, `session_id`, `timestamp`

---

## Common Issues

### Issue: No events logged in console
**Cause**: Debug mode not enabled  
**Fix**: Add `VITE_ANALYTICS_DEBUG=true` to `.env.local` and restart server

### Issue: Events logged but not in GA4
**Cause**: GA4 not initialized or incorrect tracking ID  
**Fix**: Verify `window.gtag` exists in console, check GA4 tracking ID

### Issue: Session ID duplicates across page reloads
**Cause**: Session storage not persisting  
**Fix**: Expected behavior - new session per page load

### Issue: Time to complete is 0 seconds
**Cause**: Order submitted immediately without user interaction  
**Fix**: Expected for test orders, real users will have non-zero duration

---

## Analytics Queries

### GA4 - Top Packages by Selection
```sql
SELECT
  event_params.value.string_value AS package_name,
  COUNT(*) AS selections
FROM `project.dataset.events_*`
WHERE event_name = 'catering_package_selected'
  AND _TABLE_SUFFIX BETWEEN '20251019' AND '20251119'
GROUP BY package_name
ORDER BY selections DESC
LIMIT 10
```

### GA4 - Average Time to Complete
```sql
SELECT
  AVG(CAST(event_params.value.int_value AS INT64)) AS avg_completion_seconds
FROM `project.dataset.events_*`,
  UNNEST(event_params) AS event_params
WHERE event_name = 'catering_order_submitted'
  AND event_params.key = 'time_to_complete_seconds'
  AND _TABLE_SUFFIX BETWEEN '20251019' AND '20251119'
```

### GA4 - Funnel Drop-Off
```sql
WITH funnel AS (
  SELECT
    user_pseudo_id,
    MAX(IF(event_name = 'catering_widget_viewed', 1, 0)) AS viewed,
    MAX(IF(event_name = 'catering_package_selected', 1, 0)) AS selected,
    MAX(IF(event_name = 'catering_order_submitted', 1, 0)) AS submitted
  FROM `project.dataset.events_*`
  WHERE _TABLE_SUFFIX BETWEEN '20251019' AND '20251119'
  GROUP BY user_pseudo_id
)
SELECT
  SUM(viewed) AS total_views,
  SUM(selected) AS total_selections,
  SUM(submitted) AS total_submissions,
  ROUND(SUM(selected) / SUM(viewed) * 100, 2) AS selection_rate,
  ROUND(SUM(submitted) / SUM(selected) * 100, 2) AS completion_rate
FROM funnel
```

---

## Best Practices

### Event Naming
- Use consistent prefix: `catering_*`
- Use snake_case: `catering_widget_viewed` not `cateringWidgetViewed`
- Use past tense: `_viewed`, `_selected`, `_submitted`

### Metadata
- Always include `tenant_id`, `tenant_slug`, `session_id`
- Include timestamps for time-based analysis
- Use consistent units (seconds for durations, cents for prices)

### Privacy
- Never track PII (email, phone, name) in event metadata
- Track only aggregate metrics (field lengths, not values)
- Anonymize session IDs (no user IDs)

### Performance
- Events fire asynchronously (non-blocking)
- No network calls if providers not available
- Minimal overhead (<1ms per event)

---

## Support

**Documentation**:
- Full implementation: `apps/client-dashboard/src/utils/catering-analytics.ts`
- Integration: `apps/client-dashboard/src/components/catering/CateringWidget.tsx`
- Phase 2 summary: `CATERING_PHASE2_ENHANCEMENTS_COMPLETE.md`

**Questions**:
- Check debug mode console output
- Verify GA4/Mixpanel/PostHog initialization
- Review event metadata in Real-Time Reports

**Feature Requests**:
- New event types: Add to `CateringAnalyticsEvent` type
- New metadata: Extend event metadata interfaces
- New providers: Add to `trackCateringEvent` function
