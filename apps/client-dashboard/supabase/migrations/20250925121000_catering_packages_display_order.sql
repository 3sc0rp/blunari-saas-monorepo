-- Add display_order to catering_packages for manual ordering in UI
ALTER TABLE public.catering_packages
  ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Create helpful index for ordering
CREATE INDEX IF NOT EXISTS idx_catering_packages_display_order
  ON public.catering_packages(tenant_id, popular DESC, display_order, created_at DESC)
  WHERE active = true;

