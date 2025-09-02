-- Fix tenant slug mapping for production use only
-- This migration ensures proper tenant slug configuration

-- Update any demo tenant to use 'demo' as slug for easier access
UPDATE public.tenants 
SET slug = 'demo'
WHERE (name ILIKE '%demo%' OR slug ILIKE '%demo%') 
  AND slug != 'demo' 
  AND status = 'active';
