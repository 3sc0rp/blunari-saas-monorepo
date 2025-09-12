# Widget Management Migration - Post-Deployment Verification
# Run these queries in your Supabase SQL Editor to verify the migration was successful

## 1. Verify Tables Were Created
```sql
-- Check if tables exist
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('widget_configurations', 'widget_analytics');
```

## 2. Check Table Structure
```sql
-- Verify widget_configurations structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'widget_configurations'
ORDER BY ordinal_position;

-- Verify widget_analytics structure  
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'widget_analytics'
ORDER BY ordinal_position;
```

## 3. Verify RLS Policies
```sql
-- Check RLS policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('widget_configurations', 'widget_analytics');
```

## 4. Check Indexes
```sql
-- Verify performance indexes
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE tablename IN ('widget_configurations', 'widget_analytics')
AND schemaname = 'public';
```

## 5. Verify Default Data
```sql
-- Check default widget configurations were inserted
SELECT 
  tenant_id,
  widget_type,
  is_active,
  config->>'theme' as theme,
  config->>'primaryColor' as primary_color,
  created_at
FROM public.widget_configurations
ORDER BY tenant_id, widget_type;
```

## 6. Test Real-time Subscriptions
```sql
-- Verify tables are in realtime publication
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('widget_configurations', 'widget_analytics');
```

## 7. Test Triggers
```sql
-- Check triggers were created
SELECT trigger_name, event_manipulation, trigger_schema, trigger_catalog
FROM information_schema.triggers
WHERE event_object_table IN ('widget_configurations', 'widget_analytics');
```

## Expected Results:
- ✅ 2 tables created (widget_configurations, widget_analytics)
- ✅ RLS policies active on both tables
- ✅ 4 performance indexes created
- ✅ Default configurations for all existing tenants
- ✅ Real-time subscriptions enabled
- ✅ Change tracking triggers active

## If Migration Successful:
1. Switch your Widget Management Test page from Mock Mode to Real Mode
2. Test the real-time hooks with your actual database
3. Verify WebSocket connections work properly
4. Monitor performance and connection stability

## Quick Test Query:
```sql
-- Quick verification - should return counts > 0
SELECT 
  (SELECT COUNT(*) FROM public.widget_configurations) as config_count,
  (SELECT COUNT(*) FROM public.widget_analytics) as analytics_count,
  (SELECT COUNT(*) FROM public.tenants) as tenant_count;
```
