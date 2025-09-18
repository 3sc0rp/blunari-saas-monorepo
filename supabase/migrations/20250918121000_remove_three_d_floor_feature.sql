-- Remove Blunari 3D Floor feature data (idempotent)
-- Safely cleans up per-tenant scene settings and entitlement flags without dropping shared tables.

begin;

-- 1) Delete any per-area scene settings stored under tenant_settings.setting_key = 'scene:{area}'
delete from tenant_settings
where setting_key like 'scene:%';

-- 2) Remove entitlement flag from tenants.settings JSONB
-- This rewrites the entitlements object without 'three_d_floor' if present.
update tenants
set settings = jsonb_set(
  coalesce(settings, '{}'::jsonb),
  '{entitlements}',
  (coalesce(settings->'entitlements', '{}'::jsonb) - 'three_d_floor'),
  true
)
where (coalesce(settings, '{}'::jsonb)->'entitlements') ? 'three_d_floor';

-- 3) Remove entitlement flag from tenant_settings mirror row if used
update tenant_settings
set setting_value = setting_value - 'three_d_floor'
where setting_key = 'entitlements' and (setting_value ? 'three_d_floor');

commit;

-- Notes:
-- - We intentionally do not drop the tenant_settings table or any buckets; they are shared by other features.
-- - Safe to run multiple times; statements are idempotent.

