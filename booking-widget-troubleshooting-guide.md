# Booking Widget Troubleshooting Guide

## Current Issue
The booking widget form submissions are not creating reservations in the database (not even as pending).

## System Architecture
- **Frontend**: React booking widget (`BookingWidget.tsx`, `ConfirmationStep.tsx`) 
- **API**: `widget-booking-live` edge function (Supabase Deno)
- **Database**: Supabase PostgreSQL with `bookings` and `booking_holds` tables
- **Authentication**: JWT widget tokens for secure API access

## Troubleshooting Steps

### 1. Test Widget Token Generation
First, verify your widget token system is working:

```bash
# Test the token creation endpoint
curl -X POST "https://kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1/create-widget-token" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{
    "slug": "demo",
    "widget_type": "booking",
    "config_version": "2.0",
    "ttl_seconds": 3600
  }'
```

### 2. Run Database Schema Check
Execute the SQL in `check-booking-schema.sql` to verify:
- `bookings` table structure
- `booking_holds` table existence  
- Recent booking attempts
- Database constraints/policies

### 3. Test Booking Flow with Debug Script
Run the debug script in your browser console when testing the widget:

```javascript
// Copy and paste the debug-booking-widget.js script
// Then fill in YOUR_SUPABASE_URL, YOUR_ANON_KEY, and YOUR_TENANT_SLUG
// Run: testEdgeFunctionDirectly()
```

### 4. Check Edge Function Logs
1. Go to: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/functions
2. Select `widget-booking-live` function
3. Check the Logs tab for errors and debug messages

The enhanced edge function now logs:
- All incoming requests with headers and body
- Token validation attempts  
- Database insertion attempts and failures
- Detailed error messages for troubleshooting

### 5. Common Issues & Solutions

#### Issue: 401 Authentication Errors
**Cause**: Missing or invalid widget token
**Solution**: 
- Ensure your widget URL includes `?token=...` parameter
- Verify token is properly generated via `create-widget-token` endpoint
- Check token hasn't expired (1 hour default TTL)

#### Issue: Database Schema Mismatch  
**Cause**: Booking table structure doesn't match what edge function expects
**Solution**:
- Run the schema check SQL to see current structure
- The function tries both new (`booking_time` as timestamptz) and legacy (`booking_date` + `booking_time`) schemas

#### Issue: USE_LOCAL_BOOKING Environment Variable
**Cause**: Edge function may be trying to use external API instead of local database
**Solution**:
- Check function environment variables
- Set `USE_LOCAL_BOOKING=true` to force local database path
- Local path creates "pending" bookings by default

#### Issue: Database RLS Policies
**Cause**: Row Level Security policies may block insert operations
**Solution**:
- Check RLS policies in the schema check SQL results
- Ensure service role has proper access

## Environment Configuration

Your current setup:
- Supabase URL: `https://kbfbbkcaxhzlnbqxwgoz.supabase.co`
- Edge Function: `widget-booking-live` (with enhanced debugging)
- Environment: Development mode with debug logs enabled

## Testing Commands

Generate a valid widget URL:
```bash
node scripts/create-widget-url.mjs
```

Test the complete booking flow:
```bash  
node scripts/test-widget-booking-proper.mjs
```

## Expected Behavior

With `USE_LOCAL_BOOKING=true` (default):
1. Widget creates a temporary hold in `booking_holds` table
2. Confirmation creates a booking in `bookings` table with `status='pending'` 
3. Booking requires manual approval in dashboard
4. Customer gets email about pending status

## Next Steps

1. **Run the database schema check** to understand your current table structure
2. **Check edge function logs** during a booking attempt to see where it's failing  
3. **Test with a proper widget token** using the URL generator script
4. **Verify environment variables** are set correctly on the edge function

The enhanced logging should now show exactly where the process is failing.