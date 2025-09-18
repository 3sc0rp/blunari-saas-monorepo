-- Add missing failed_at column to background_jobs table
ALTER TABLE public.background_jobs 
ADD COLUMN IF NOT EXISTS failed_at timestamp with time zone;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_background_jobs_failed_at ON public.background_jobs(failed_at);