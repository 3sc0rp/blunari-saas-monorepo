# 🚀 Booking API Deployment Guide

## Your Booking API Configuration

**Base URL:** `https://kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1`

**Project Reference:** `kbfbbkcaxhzlnbqxwgoz`

## 📍 Available Edge Functions (Your Booking API)

✅ **Created and Ready for Deployment:**

1. **`/tenant`** - Resolves tenant information
2. **`/list-reservations`** - Gets filtered reservations
3. **`/list-tables`** - Gets table data with policies
4. **`/get-kpis`** - Calculates real-time KPIs
5. **`/create-reservation`** - Creates new reservations

## 🔧 Deployment Commands

### 1. Deploy All Functions at Once
```bash
supabase functions deploy --project-ref kbfbbkcaxhzlnbqxwgoz
```

### 2. Deploy Individual Functions
```bash
# Deploy tenant resolver
supabase functions deploy tenant --project-ref kbfbbkcaxhzlnbqxwgoz

# Deploy reservations API
supabase functions deploy list-reservations --project-ref kbfbbkcaxhzlnbqxwgoz

# Deploy tables API
supabase functions deploy list-tables --project-ref kbfbbkcaxhzlnbqxwgoz

# Deploy KPIs API
supabase functions deploy get-kpis --project-ref kbfbbkcaxhzlnbqxwgoz

# Deploy reservation creation
supabase functions deploy create-reservation --project-ref kbfbbkcaxhzlnbqxwgoz
```

## 📋 Environment Setup

### 1. Update your `.env` file:
```bash
# Copy from .env.example
cp .env.example .env
```

### 2. Your `.env` should contain:
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://kbfbbkcaxhzlnbqxwgoz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s

# Booking API Configuration  
VITE_CLIENT_API_BASE_URL=https://kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1
VITE_TENANT_RESOLVER=slug

# Environment
VITE_APP_ENV=production

# Production flags
VITE_ENABLE_MOCK_DATA=false
```

## 🧪 Testing Your API

After deployment, test your endpoints:

### 1. Test Tenant Resolution
```bash
curl https://kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1/tenant?slug=your-venue-slug
```

### 2. Test Reservations API
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1/list-reservations
```

## 🔍 Verify Deployment

1. **Check Function Status** in Supabase Dashboard:
   - Go to: https://supabase.com/dashboard/project/kbfbbkcaxhzlnbqxwgoz/functions
   - Verify all functions are deployed and active

2. **Test in Browser**:
   - Navigate to your Command Center
   - Open Network tab in DevTools
   - Verify API calls go to your Supabase functions (not mock data)

## 🎯 Your Complete Booking API

**Tenant Resolution:**
- `GET /functions/v1/tenant?slug=venue-name`

**Reservations:**
- `GET /functions/v1/list-reservations?date=2025-09-03&status=confirmed`

**Tables & Floor Plan:**
- `GET /functions/v1/list-tables`

**Real-time KPIs:**
- `GET /functions/v1/get-kpis?date=2025-09-03`

**Create Reservations:**
- `POST /functions/v1/create-reservation`

## ✅ Next Steps

1. Deploy the Edge Functions using the commands above
2. Update your `.env` file with the correct API URL
3. Test the Command Center to ensure it's using live data
4. Monitor the Supabase dashboard for API usage and errors

Your booking API is ready to go live! 🚀
