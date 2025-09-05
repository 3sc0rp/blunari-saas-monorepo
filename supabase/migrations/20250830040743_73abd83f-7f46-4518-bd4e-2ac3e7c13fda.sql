-- Create subscriber records for existing tenants that don't have them
INSERT INTO public.subscribers (tenant_id, email, subscribed, subscription_tier, subscription_status, billing_cycle, created_at, updated_at)
SELECT 
  t.id as tenant_id,
  COALESCE(t.email, 'admin@' || t.slug || '.com') as email,
  false as subscribed,
  'Basic' as subscription_tier,
  'inactive' as subscription_status,
  'monthly' as billing_cycle,
  now() as created_at,
  now() as updated_at
FROM public.tenants t
LEFT JOIN public.subscribers s ON s.tenant_id = t.id
WHERE s.tenant_id IS NULL;