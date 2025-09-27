-- Ensure background_jobs has job_name column with NOT NULL and default
ALTER TABLE IF EXISTS public.background_jobs
  ADD COLUMN IF NOT EXISTS job_name TEXT;

-- Backfill any existing NULL job_name values with generated uuids (id as fallback)
UPDATE public.background_jobs
SET job_name = COALESCE(job_name, gen_random_uuid()::text)
WHERE job_name IS NULL;

-- Enforce NOT NULL and add default going forward
ALTER TABLE public.background_jobs
  ALTER COLUMN job_name SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN job_name SET NOT NULL;

-- Optional: also keep generic type/name columns for compatibility
ALTER TABLE IF EXISTS public.background_jobs
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT;

