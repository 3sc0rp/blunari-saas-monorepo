-- Simple SQL to fix tenant slugs - Copy this into Supabase SQL Editor

-- Step 1: Fix the Demo Restaurant slug
UPDATE public.tenants 
SET slug = 'demo'
WHERE id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid;

-- Step 2: Verify the change worked
SELECT id, name, slug, status FROM public.tenants 
WHERE id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid;
