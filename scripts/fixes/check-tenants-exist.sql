-- Check if tenants exist in the database
SELECT 
  id,
  name,
  slug,
  email,
  status,
  timezone,
  currency,
  created_at
FROM public.tenants
ORDER BY created_at DESC
LIMIT 10;
