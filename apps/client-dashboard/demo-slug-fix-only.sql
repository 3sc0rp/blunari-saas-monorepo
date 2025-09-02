-- Simple fix for demo tenant slug only
-- Run this in Supabase SQL Editor

-- Fix the Demo Restaurant slug (we already know this works)
UPDATE public.tenants 
SET slug = 'demo'
WHERE id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid;

-- Verify the change
SELECT id, name, slug, status FROM public.tenants 
WHERE slug = 'demo';
