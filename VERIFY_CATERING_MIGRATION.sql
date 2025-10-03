-- Verify catering widget configuration migration succeeded

-- Check table exists
SELECT 
  'catering_widget_configs table' as check_item,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'catering_widget_configs'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check RPC function exists
SELECT 
  'get_catering_widget_config() function' as check_item,
  CASE WHEN EXISTS (
    SELECT FROM pg_proc 
    WHERE proname = 'get_catering_widget_config'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check default configs created
SELECT 
  'Default configs created' as check_item,
  COUNT(*)::TEXT || ' tenants' as status
FROM catering_widget_configs;

-- View your catering widget config
SELECT 
  tenant_id,
  primary_color,
  secondary_color,
  welcome_message,
  active,
  created_at
FROM catering_widget_configs
LIMIT 5;

