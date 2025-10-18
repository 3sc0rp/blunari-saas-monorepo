-- Insert default features for the existing tenant if none exist
INSERT INTO public.tenant_features (tenant_id, feature_key, enabled, source)
SELECT 
  'ee6c4bea-067e-4a58-8de8-3cc98f372408'::uuid,
  feature_key,
  true,
  'plan'
FROM (VALUES 
  ('basic_booking'),
  ('email_notifications'),
  ('basic_analytics'),
  ('widget_integration'),
  ('advanced_booking'),
  ('pos_integration'),
  ('custom_branding'),
  ('api_access')
) AS features(feature_key)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_features 
  WHERE tenant_id = 'ee6c4bea-067e-4a58-8de8-3cc98f372408'::uuid 
  AND feature_key = features.feature_key
);