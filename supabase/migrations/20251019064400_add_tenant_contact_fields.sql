-- Migration: Add contact fields to tenants table
-- Purpose: Enable contact information display in empty states
-- Date: 2025-10-19

-- Add contact fields to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- Add check constraints for data validation (safe idempotent version)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tenants_contact_email_check'
  ) THEN
    ALTER TABLE public.tenants
    ADD CONSTRAINT tenants_contact_email_check 
      CHECK (contact_email IS NULL OR contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tenants_contact_phone_check'
  ) THEN
    ALTER TABLE public.tenants
    ADD CONSTRAINT tenants_contact_phone_check
      CHECK (contact_phone IS NULL OR LENGTH(contact_phone) >= 10);
  END IF;
END $$;

-- Create index for email lookups (optional, for future features)
CREATE INDEX IF NOT EXISTS idx_tenants_contact_email ON public.tenants(contact_email) WHERE contact_email IS NOT NULL;

-- Comment on columns
COMMENT ON COLUMN public.tenants.contact_email IS 'Primary contact email for the restaurant. Displayed in catering widget empty states.';
COMMENT ON COLUMN public.tenants.contact_phone IS 'Primary contact phone for the restaurant. Displayed in catering widget empty states.';
