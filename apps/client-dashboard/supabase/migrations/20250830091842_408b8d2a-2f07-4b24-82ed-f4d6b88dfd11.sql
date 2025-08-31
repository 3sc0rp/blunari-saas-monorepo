-- Add user access to Demo Restaurant tenant
INSERT INTO auto_provisioning (
  user_id, 
  tenant_id, 
  restaurant_name, 
  restaurant_slug, 
  timezone, 
  currency, 
  status, 
  completed_at
) VALUES (
  '6f0c4a4f-efb0-47f4-8b48-e1d3e106c2ec',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'Demo Restaurant',
  '2b6c705c-a484-4cda-9003-2f59a82b1c8e.sandbox.lovable.dev',
  'America/New_York',
  'USD',
  'completed',
  now()
) ON CONFLICT DO NOTHING;